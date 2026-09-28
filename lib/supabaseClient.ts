import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseCredentials(): { url: string; key: string } {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (typeof window !== 'undefined') {
    if (!url || url.includes('placeholder')) {
      const storedUrl = localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || localStorage.getItem('sim_supabase_url');
      if (storedUrl) url = storedUrl;
    }
    if (!key || key.includes('placeholder')) {
      const storedKey = localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || localStorage.getItem('sim_supabase_anon_key');
      if (storedKey) key = storedKey;
    }
  }

  return {
    url: url.trim(),
    key: key.trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(
    url &&
    !url.includes('placeholder') &&
    url.startsWith('http') &&
    key &&
    !key.includes('placeholder') &&
    key.length >= 20
  );
}

const { url: initialUrl, key: initialKey } = getSupabaseCredentials();

export const supabase: SupabaseClient = createClient(
  initialUrl || 'https://placeholder.supabase.co',
  initialKey || 'placeholder-anon-key'
);

export function getDynamicSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseCredentials();
  if (isSupabaseConfigured()) {
    return createClient(url, key);
  }
  return supabase;
}
