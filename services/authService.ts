import { AuthUser, UserRole, AdminCredentials } from '@/types';
import { dbService } from './dbService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { DatabaseContainer as SupabaseContainer } from './supabaseService';
import {
  getAdminCredentialsFirebase,
  saveAdminCredentialsFirebase,
} from './firebaseService';

const AUTH_SESSION_KEY = 'smk_pgri_2_auth_session';
const ADMIN_CREDS_KEY = 'smk_pgri_2_admin_creds';

export const DEFAULT_PUBLIC_USER: AuthUser = {
  role: 'PUBLIC_SISWA',
  name: 'Tamu / Siswa',
};

export class AuthService {
  /**
   * Get custom admin credentials from Supabase/Firebase or fallback to LocalStorage/Default
   */
  static async getAdminCredentials(): Promise<AdminCredentials> {
    if (isSupabaseConfigured()) {
      try {
        const creds = await SupabaseContainer.settings.getAdminCredentials();
        if (creds && creds.username) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(creds));
            } catch (_) {}
          }
          return creds;
        }
      } catch (e) {
        console.warn('Failed to load admin creds from Supabase:', e);
      }
    }

    try {
      const creds = await getAdminCredentialsFirebase();
      if (creds) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(creds));
          } catch (_) {}
        }
        return creds;
      }
    } catch (e) {
      console.warn('Failed to load admin creds from Firebase:', e);
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(ADMIN_CREDS_KEY);
        if (stored) {
          return JSON.parse(stored) as AdminCredentials;
        }
      } catch (e) {
        console.warn('Failed to parse admin creds:', e);
      }
    }
    return {
      username: 'admin',
      password: '4dm1n',
      name: 'Panitia Utama Darmawisata',
    };
  }

  /**
   * Update admin credentials (saves to Supabase, Firebase, and LocalStorage)
   */
  static async updateAdminCredentials(newCreds: AdminCredentials): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(newCreds));
      } catch (e) {
        console.warn('Failed to save admin creds to LS:', e);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await SupabaseContainer.settings.saveAdminCredentials(newCreds);
      } catch (e) {
        console.warn('Failed to save admin creds to Supabase:', e);
      }
    }

    try {
      await saveAdminCredentialsFirebase(newCreds);
    } catch (e) {
      console.warn('Failed to save admin creds to Firebase:', e);
    }
  }

  /**
   * Get current authenticated user session from sessionStorage or localStorage
   */
  static getCurrentUser(): AuthUser {
    if (typeof window === 'undefined') return DEFAULT_PUBLIC_USER;
    try {
      const stored = sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(AUTH_SESSION_KEY);
      if (stored) {
        return JSON.parse(stored) as AuthUser;
      }
    } catch {
      // fallback
    }
    return DEFAULT_PUBLIC_USER;
  }

  /**
   * Save authenticated user session
   */
  static setCurrentUser(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } catch (err) {
      console.warn('Storage save failed:', err);
    }
  }

  /**
   * Logout user and return to PUBLIC_SISWA
   */
  static logout(): AuthUser {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_SESSION_KEY);
      } catch {
        // ignore
      }
    }
    return DEFAULT_PUBLIC_USER;
  }

  /**
   * Verify Admin Login
   */
  static async loginAdmin(username: string, pass: string): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
    const creds = await this.getAdminCredentials();
    const cleanUser = username.trim().toLowerCase();
    const isUsernameMatch = cleanUser === creds.username.trim().toLowerCase() || cleanUser === 'admin';
    
    // Support standard passwords: set password, 4dm1n, admin, admin123
    const isPassMatch =
      pass === creds.password ||
      pass === '4dm1n' ||
      pass === 'admin' ||
      pass === 'admin123';

    if (isUsernameMatch && isPassMatch) {
      const user: AuthUser = {
        role: 'ADMIN',
        name: creds.name || 'Panitia Utama Darmawisata',
        username: creds.username || 'admin',
      };
      this.setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, message: 'Username/Password Admin salah! (Gunakan username: admin & password: admin atau 4dm1n)' };
  }

  /**
   * Verify Wali Kelas Login
   */
  static async loginWaliKelas(
    className: string,
    pass: string,
    teacherName: string,
    customPassword?: string
  ): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
    let actualCustomPassword = customPassword;

    try {
      const classes = await dbService.getAllClasses();
      const targetClass = classes.find((c) => c.name.toLowerCase() === className.toLowerCase());
      if (targetClass && targetClass.teacherPassword) {
        actualCustomPassword = targetClass.teacherPassword;
      }
    } catch (err) {
      console.warn('Failed to fetch fresh class credentials:', err);
    }

    const isValid = actualCustomPassword
      ? (pass === actualCustomPassword || pass === 'wali123' || pass === '123456')
      : (pass === 'wali123' || pass === '123456' || pass === '');

    if (isValid) {
      const user: AuthUser = {
        role: 'WALI_KELAS',
        name: teacherName || `Wali Kelas ${className}`,
        username: `wali_${className.replace(/\s+/g, '_').toLowerCase()}`,
        assignedClassName: className,
      };
      this.setCurrentUser(user);
      return { success: true, user };
    }
    return { 
      success: false, 
      message: actualCustomPassword 
        ? 'Password Wali Kelas salah! (Gunakan password kelas atau default: wali123)' 
        : 'Password Wali Kelas salah! (Default: wali123)' 
    };
  }

  /**
   * Quick Login Helper
   */
  static quickLogin(role: UserRole, className?: string, teacherName?: string): AuthUser {
    let user: AuthUser;
    if (role === 'ADMIN') {
      user = {
        role: 'ADMIN',
        name: 'Panitia Utama (Admin)',
        username: 'admin',
      };
    } else if (role === 'WALI_KELAS') {
      const clsName = className || 'XII TKR 1';
      user = {
        role: 'WALI_KELAS',
        name: teacherName || `Wali Kelas ${clsName}`,
        username: `wali_${clsName.toLowerCase()}`,
        assignedClassName: clsName,
      };
    } else {
      user = DEFAULT_PUBLIC_USER;
    }
    this.setCurrentUser(user);
    return user;
  }
}

