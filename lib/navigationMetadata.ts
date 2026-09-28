import { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FolderOpen,
  Map as MapIcon,
  ShieldCheck,
  ClipboardList,
  Compass,
  FileText,
  Building,
  Bus,
  Users,
  Layers,
  UserCheck,
  Sparkles,
  SlidersHorizontal,
  Settings,
  Database,
  Printer,
  Share2,
  BedDouble,
  Lock,
  Search,
  QrCode,
  CheckCircle2,
  FileSpreadsheet,
  CheckSquare,
  Shirt,
  Award,
} from 'lucide-react';

export type AppTab =
  | 'ANGKET'
  | 'WALI_KELAS'
  | 'DENAH_BUS'
  | 'PEMBAGIAN_KAMAR'
  | 'REKAP_HARIAN'
  | 'SURAT_IZIN'
  | 'RUNDOWN'
  | 'ADMIN';

export type AdminPillarKey =
  | 'IKHTISAR'
  | 'DATA_INDUK'
  | 'BUS'
  | 'KAMAR'
  | 'RUNDOWNS'
  | 'DOKUMEN'
  | 'SISTEM'
  | 'OPERASIONAL'
  | 'LAPORAN';

export type AdminSubTabKey =
  // 1. Ikhtisar
  | 'OVERVIEW'
  | 'MONITOR'
  // 2. Data Induk
  | 'STUDENTS'
  | 'TEACHERS'
  | 'CLASSES'
  | 'WALI_ALLOCATION'
  // 3. Bus
  | 'BUS_SEATMAP'
  | 'BUS_STUDENTS'
  | 'BUS_CHAPERONES'
  | 'BUS_CONFIG'
  // 4. Kamar
  | 'ROOM_VISUAL'
  | 'ROOM_LIST'
  | 'ROOM_CONFIG'
  // 5. Rundown
  | 'RUNDOWNS'
  // 6. Dokumen
  | 'REKAP_ANGKET'
  | 'VERIFIKASI_SPP'
  | 'LOGISTIK_KAOS'
  | 'SURAT_IZIN'
  // 7. Sistem
  | 'SETTINGS'
  | 'SYNC_QUEUE'
  // Legacy Aliases
  | 'ACADEMIC'
  | 'CHAPERONES';

export interface SubMenuItem {
  id: AdminSubTabKey;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  description?: string;
}

export interface PillarMenuNode {
  id: AdminPillarKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  subMenus: SubMenuItem[];
}

export const ADMIN_NAVIGATION_TREE: PillarMenuNode[] = [
  {
    id: 'IKHTISAR',
    label: '1. Ikhtisar & Monitoring',
    shortLabel: 'Ikhtisar',
    icon: BarChart3,
    subMenus: [
      { id: 'OVERVIEW', label: 'Executive Dashboard', shortLabel: 'Dashboard', icon: BarChart3, description: 'Metrik statistik real-time & matriks rombel' },
      { id: 'MONITOR', label: 'Log Aktivitas & Audit Trail', shortLabel: 'Log Audit', icon: ClipboardList, description: 'Riwayat aktivitas sistem & audit log' },
    ],
  },
  {
    id: 'DATA_INDUK',
    label: '2. Data Master Sekolah',
    shortLabel: 'Master Data',
    icon: FolderOpen,
    subMenus: [
      { id: 'STUDENTS', label: 'Data Induk Siswa', shortLabel: 'Data Siswa', icon: Users, description: 'Tabel siswa, NIS, kontak ortu, ukuran kaos & aksi massal' },
      { id: 'TEACHERS', label: 'Data Guru & Pendamping', shortLabel: 'Guru & Staf', icon: UserCheck, description: 'Data wali kelas, pendamping, medis & kontak' },
      { id: 'CLASSES', label: 'Data Jurusan & Kelas', shortLabel: 'Jurusan & Kelas', icon: Building, description: 'Master kelas, jurusan & kuota angkatan' },
      { id: 'WALI_ALLOCATION', label: 'Alokasi & Pindah Wali Kelas', shortLabel: 'Alokasi Wali', icon: Award, description: 'Plotting kuota & pemindahan tujuan wali kelas (Bali / Yogyakarta)' },
    ],
  },
  {
    id: 'BUS',
    label: '3. Alokasi Armada Bus',
    shortLabel: 'Armada Bus',
    icon: Bus,
    subMenus: [
      { id: 'BUS_SEATMAP', label: 'Denah Kursi Visual', shortLabel: 'Denah Kursi', icon: Bus, description: 'Plotting & cetak denah kursi bus' },
      { id: 'BUS_STUDENTS', label: 'Manifest Penumpang', shortLabel: 'Manifest', icon: Users, description: 'Daftar alokasi penumpang per bus' },
      { id: 'BUS_CHAPERONES', label: 'Distribusi Pendamping', shortLabel: 'Pendamping', icon: UserCheck, description: 'Penugasan guru pendamping di tiap bus' },
      { id: 'BUS_CONFIG', label: 'Pengaturan Aturan Bus', shortLabel: 'Aturan Bus', icon: SlidersHorizontal, description: 'Kapasitas armada, kursi kosong depan & nomor urut' },
    ],
  },
  {
    id: 'KAMAR',
    label: '4. Akomodasi Hotel',
    shortLabel: 'Hotel & Kamar',
    icon: BedDouble,
    subMenus: [
      { id: 'ROOM_VISUAL', label: 'Denah Kamar Visual', shortLabel: 'Denah Kamar', icon: BedDouble, description: 'Plotting & distribusi teman sekamar' },
      { id: 'ROOM_LIST', label: 'Daftar Master Kamar', shortLabel: 'Master Kamar', icon: FolderOpen, description: 'Tabel nomor kamar hotel & kapasitas' },
      { id: 'ROOM_CONFIG', label: 'Pengaturan Aturan Kamar', shortLabel: 'Aturan Kamar', icon: SlidersHorizontal, description: 'Kapasitas kamar & aturan pemisahan gender' },
    ],
  },
  {
    id: 'RUNDOWNS',
    label: '5. Jadwal & Rundown Acara',
    shortLabel: 'Jadwal Acara',
    icon: Compass,
    subMenus: [
      { id: 'RUNDOWNS', label: 'Jadwal Acara Darmawisata', shortLabel: 'Rundown', icon: Compass, description: 'Jadwal acara lengkap Bali & Yogyakarta' },
    ],
  },
  {
    id: 'DOKUMEN',
    label: '6. Dokumen & Laporan',
    shortLabel: 'Dokumen',
    icon: FileText,
    subMenus: [
      { id: 'REKAP_ANGKET', label: 'Rekapitulasi Angket & Bayar', shortLabel: 'Rekap Angket', icon: FileSpreadsheet, description: 'Analisis kuesioner & rekap status pembayaran' },
      { id: 'VERIFIKASI_SPP', label: 'Laporan Verifikasi SPP', shortLabel: 'Verifikasi SPP', icon: CheckSquare, description: 'Lembar rekap kontrol verifikasi SPP per kelas (Khusus Admin/Panitia)' },
      { id: 'LOGISTIK_KAOS', label: 'Laporan Penerimaan Kaos', shortLabel: 'Penerimaan Kaos', icon: Shirt, description: 'Rekap penerimaan kaos & agregat total ukuran (Khusus Admin/Panitia)' },
      { id: 'SURAT_IZIN', label: 'Surat Izin Orang Tua', shortLabel: 'Surat Izin', icon: FileText, description: 'Generator surat resmi izin orang tua ber-kop sekolah' },
    ],
  },
  {
    id: 'SISTEM',
    label: '7. Pengaturan & Database',
    shortLabel: 'Pengaturan',
    icon: Settings,
    subMenus: [
      { id: 'SETTINGS', label: 'Identitas Sekolah & Global', shortLabel: 'Konfigurasi', icon: SlidersHorizontal, description: 'Kop surat, nama kepala sekolah, deadline angket' },
      { id: 'SYNC_QUEUE', label: 'Sinkronisasi & Database', shortLabel: 'Sync & DB', icon: Database, description: 'Antrian sync Supabase & status koneksi real-time' },
    ],
  },
];

export const DEFAULT_SUBTAB_FOR_PILLAR: Record<AdminPillarKey, AdminSubTabKey> = {
  IKHTISAR: 'OVERVIEW',
  DATA_INDUK: 'STUDENTS',
  BUS: 'BUS_SEATMAP',
  KAMAR: 'ROOM_VISUAL',
  RUNDOWNS: 'RUNDOWNS',
  DOKUMEN: 'REKAP_ANGKET',
  SISTEM: 'SETTINGS',
  OPERASIONAL: 'BUS_SEATMAP',
  LAPORAN: 'OVERVIEW',
};

export interface PageContextNavItem {
  id: AppTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  minRoleRequired: 'PUBLIC_SISWA' | 'WALI_KELAS' | 'ADMIN';
}

export interface QuickActionChip {
  id: string;
  label: string;
  icon: LucideIcon;
  targetTab?: AppTab;
  actionKey?: string;
}

export interface PageNavRegistryItem {
  tab: AppTab;
  title: string;
  description: string;
  primaryIcon: LucideIcon;
  minRoleRequired: 'PUBLIC_SISWA' | 'WALI_KELAS' | 'ADMIN';
  bottomNavItems: PageContextNavItem[];
  quickActionChips: QuickActionChip[];
  drawerItems: {
    id: AppTab;
    label: string;
    description: string;
    icon: LucideIcon;
  }[];
}

export const PAGE_NAVIGATION_REGISTRY: Record<AppTab, PageNavRegistryItem> = {
  ANGKET: {
    tab: 'ANGKET',
    title: 'Angket NIS Siswa',
    description: 'Pengisian data & verifikasi keikutsertaan darmawisata',
    primaryIcon: Compass,
    minRoleRequired: 'PUBLIC_SISWA',
    bottomNavItems: [
      { id: 'ANGKET', label: 'Angket NIS', shortLabel: 'Angket', icon: Compass, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'SURAT_IZIN', label: 'Surat Izin', shortLabel: 'Surat Izin', icon: FileText, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'RUNDOWN', label: 'Jadwal Tour', shortLabel: 'Jadwal', icon: Building, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'DENAH_BUS', label: 'Denah Bus', shortLabel: 'Bus', icon: Bus, minRoleRequired: 'PUBLIC_SISWA' },
    ],
    quickActionChips: [
      { id: 'SEARCH_NIS', label: 'Cek NIS Saya', icon: Search, targetTab: 'ANGKET' },
      { id: 'CETAK_SURAT', label: 'Surat Orang Tua', icon: FileText, targetTab: 'SURAT_IZIN' },
      { id: 'LIHAT_JADWAL', label: 'Rundown Bali/Yogya', icon: Compass, targetTab: 'RUNDOWN' },
    ],
    drawerItems: [
      { id: 'SURAT_IZIN', label: 'Surat Izin Resmi', description: 'Download PDF izin orang tua', icon: FileText },
      { id: 'RUNDOWN', label: 'Jadwal & Objek Wisata', description: 'Rundown acara & rundown perjalanan', icon: Compass },
      { id: 'DENAH_BUS', label: 'Informasi Bus', description: 'Daftar armada bus & nomor kursi', icon: Bus },
    ],
  },
  WALI_KELAS: {
    tab: 'WALI_KELAS',
    title: 'Portal Wali Kelas',
    description: 'Verifikasi siswa, pendamping, & pembagian kamar/bus',
    primaryIcon: UserCheck,
    minRoleRequired: 'WALI_KELAS',
    bottomNavItems: [
      { id: 'WALI_KELAS', label: 'Kelas Saya', shortLabel: 'Kelas', icon: UserCheck, minRoleRequired: 'WALI_KELAS' },
      { id: 'REKAP_HARIAN', label: 'Rekap WA/PDF', shortLabel: 'Rekap', icon: Share2, minRoleRequired: 'WALI_KELAS' },
      { id: 'DENAH_BUS', label: 'Denah Bus', shortLabel: 'Bus', icon: Bus, minRoleRequired: 'WALI_KELAS' },
      { id: 'PEMBAGIAN_KAMAR', label: 'Kamar Hotel', shortLabel: 'Kamar', icon: BedDouble, minRoleRequired: 'WALI_KELAS' },
    ],
    quickActionChips: [
      { id: 'EXPORT_REKAP', label: 'Rekapitulasi Kelas', icon: Share2, targetTab: 'REKAP_HARIAN' },
      { id: 'CEK_BUS_KELAS', label: 'Armada Bus', icon: Bus, targetTab: 'DENAH_BUS' },
      { id: 'CEK_KAMAR_KELAS', label: 'Kamar Hotel', icon: BedDouble, targetTab: 'PEMBAGIAN_KAMAR' },
    ],
    drawerItems: [
      { id: 'REKAP_HARIAN', label: 'Rekapitulasi WA & PDF', description: 'Kirim rekap angket ke grup WhatsApp', icon: Share2 },
      { id: 'PEMBAGIAN_KAMAR', label: 'Pembagian Kamar Hotel', description: 'Alokasi kamar otomatis & manual', icon: BedDouble },
      { id: 'DENAH_BUS', label: 'Plotting Kursi Bus', description: 'Denah posisi tempat duduk siswa', icon: Bus },
    ],
  },
  REKAP_HARIAN: {
    tab: 'REKAP_HARIAN',
    title: 'Rekapitulasi WA & PDF',
    description: 'Export laporan angket & progres persetujuan',
    primaryIcon: Share2,
    minRoleRequired: 'WALI_KELAS',
    bottomNavItems: [
      { id: 'WALI_KELAS', label: 'Kelas Saya', shortLabel: 'Kelas', icon: UserCheck, minRoleRequired: 'WALI_KELAS' },
      { id: 'REKAP_HARIAN', label: 'Rekap Laporan', shortLabel: 'Rekap', icon: Share2, minRoleRequired: 'WALI_KELAS' },
      { id: 'SURAT_IZIN', label: 'Surat Izin', shortLabel: 'Surat', icon: FileText, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'RUNDOWN', label: 'Jadwal Acara', shortLabel: 'Rundown', icon: Compass, minRoleRequired: 'PUBLIC_SISWA' },
    ],
    quickActionChips: [
      { id: 'KEMBALI_KELAS', label: 'Daftar Siswa', icon: UserCheck, targetTab: 'WALI_KELAS' },
      { id: 'LIHAT_SURAT', label: 'Lihat Form Surat', icon: FileText, targetTab: 'SURAT_IZIN' },
    ],
    drawerItems: [
      { id: 'WALI_KELAS', label: 'Data Kelas Saya', description: 'Kembali ke daftar siswa kelas', icon: UserCheck },
      { id: 'PEMBAGIAN_KAMAR', label: 'Kamar Hotel', description: 'Daftar penataan kamar', icon: BedDouble },
      { id: 'DENAH_BUS', label: 'Position Bus', description: 'Denah kursi bus', icon: Bus },
    ],
  },
  DENAH_BUS: {
    tab: 'DENAH_BUS',
    title: 'Denah Tempat Duduk Bus',
    description: 'Daftar armada bus & nomor kursi peserta',
    primaryIcon: Bus,
    minRoleRequired: 'PUBLIC_SISWA',
    bottomNavItems: [
      { id: 'DENAH_BUS', label: 'Denah Bus', shortLabel: 'Bus', icon: Bus, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'PEMBAGIAN_KAMAR', label: 'Kamar Hotel', shortLabel: 'Kamar', icon: BedDouble, minRoleRequired: 'WALI_KELAS' },
      { id: 'RUNDOWN', label: 'Jadwal Tour', shortLabel: 'Jadwal', icon: Compass, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'ANGKET', label: 'Angket NIS', shortLabel: 'Angket', icon: Compass, minRoleRequired: 'PUBLIC_SISWA' },
    ],
    quickActionChips: [
      { id: 'CEK_KAMAR', label: 'Cek Kamar Hotel', icon: BedDouble, targetTab: 'PEMBAGIAN_KAMAR' },
      { id: 'CEK_JADWAL', label: 'Rundown Wisata', icon: Compass, targetTab: 'RUNDOWN' },
    ],
    drawerItems: [
      { id: 'PEMBAGIAN_KAMAR', label: 'Kamar Hotel', description: 'Lihat alokasi kamar hotel peserta', icon: BedDouble },
      { id: 'RUNDOWN', label: 'Jadwal Perjalanan', description: 'Rundown kegiatan darmawisata', icon: Compass },
      { id: 'ANGKET', label: 'Form Angket', description: 'Isi angket keikutsertaan', icon: Compass },
    ],
  },
  PEMBAGIAN_KAMAR: {
    tab: 'PEMBAGIAN_KAMAR',
    title: 'Pembagian Kamar Hotel',
    description: 'Alokasi kamar hotel siswa & guru pendamping',
    primaryIcon: BedDouble,
    minRoleRequired: 'WALI_KELAS',
    bottomNavItems: [
      { id: 'PEMBAGIAN_KAMAR', label: 'Kamar Hotel', shortLabel: 'Kamar', icon: BedDouble, minRoleRequired: 'WALI_KELAS' },
      { id: 'DENAH_BUS', label: 'Denah Bus', shortLabel: 'Bus', icon: Bus, minRoleRequired: 'WALI_KELAS' },
      { id: 'WALI_KELAS', label: 'Kelas Saya', shortLabel: 'Kelas', icon: UserCheck, minRoleRequired: 'WALI_KELAS' },
      { id: 'REKAP_HARIAN', label: 'Rekap WA', shortLabel: 'Rekap', icon: Share2, minRoleRequired: 'WALI_KELAS' },
    ],
    quickActionChips: [
      { id: 'BUS_TERHUBUNG', label: 'Denah Bus', icon: Bus, targetTab: 'DENAH_BUS' },
      { id: 'KELAS_TERHUBUNG', label: 'Siswa Kelas', icon: UserCheck, targetTab: 'WALI_KELAS' },
    ],
    drawerItems: [
      { id: 'DENAH_BUS', label: 'Denah Bus', description: 'Atur/lihat posisi tempat duduk bus', icon: Bus },
      { id: 'WALI_KELAS', label: 'Menu Wali Kelas', description: 'Kelola data verifikasi kelas', icon: UserCheck },
      { id: 'REKAP_HARIAN', label: 'Rekapitulasi Laporan', description: 'Kirim rekap WA/PDF', icon: Share2 },
    ],
  },
  SURAT_IZIN: {
    tab: 'SURAT_IZIN',
    title: 'Surat Izin Orang Tua',
    description: 'Cetak & unduh dokumen resmi persetujuan orang tua',
    primaryIcon: FileText,
    minRoleRequired: 'PUBLIC_SISWA',
    bottomNavItems: [
      { id: 'SURAT_IZIN', label: 'Surat Izin', shortLabel: 'Surat', icon: FileText, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'ANGKET', label: 'Angket NIS', shortLabel: 'Angket', icon: Compass, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'RUNDOWN', label: 'Jadwal Wisata', shortLabel: 'Jadwal', icon: Compass, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'DENAH_BUS', label: 'Denah Bus', shortLabel: 'Bus', icon: Bus, minRoleRequired: 'PUBLIC_SISWA' },
    ],
    quickActionChips: [
      { id: 'FORM_ANGKET', label: 'Isi Angket NIS', icon: Compass, targetTab: 'ANGKET' },
      { id: 'JADWAL_ACARA', label: 'Rundown Tour', icon: Compass, targetTab: 'RUNDOWN' },
    ],
    drawerItems: [
      { id: 'ANGKET', label: 'Verifikasi Angket NIS', description: 'Cek status persetujuan angket', icon: Compass },
      { id: 'RUNDOWN', label: 'Rundown Kegiatan', description: 'Rencana acara darmawisata', icon: Compass },
      { id: 'DENAH_BUS', label: 'Denah Posisi Bus', description: 'Lihat nomor kursi bus', icon: Bus },
    ],
  },
  RUNDOWN: {
    tab: 'RUNDOWN',
    title: 'Rundown & Objek Wisata',
    description: 'Jadwal acara lengkap Bali & Yogyakarta',
    primaryIcon: Building,
    minRoleRequired: 'PUBLIC_SISWA',
    bottomNavItems: [
      { id: 'RUNDOWN', label: 'Jadwal Tour', shortLabel: 'Jadwal', icon: Building, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'DENAH_BUS', label: 'Denah Bus', shortLabel: 'Bus', icon: Bus, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'SURAT_IZIN', label: 'Surat Izin', shortLabel: 'Surat', icon: FileText, minRoleRequired: 'PUBLIC_SISWA' },
      { id: 'ANGKET', label: 'Angket NIS', shortLabel: 'Angket', icon: Compass, minRoleRequired: 'PUBLIC_SISWA' },
    ],
    quickActionChips: [
      { id: 'BUS_ACTION', label: 'Armada Bus', icon: Bus, targetTab: 'DENAH_BUS' },
      { id: 'SURAT_ACTION', label: 'Download Surat Izin', icon: FileText, targetTab: 'SURAT_IZIN' },
    ],
    drawerItems: [
      { id: 'DENAH_BUS', label: 'Nomor Kursi Bus', description: 'Denah tempat duduk armada', icon: Bus },
      { id: 'SURAT_IZIN', label: 'Surat Orang Tua', description: 'Format surat izin tertulis', icon: FileText },
      { id: 'ANGKET', label: 'Angket Keikutsertaan', description: 'Status pendaftaran darmawisata', icon: Compass },
    ],
  },
  ADMIN: {
    tab: 'ADMIN',
    title: 'Portal Administrasi Panitia',
    description: 'Manajemen master data, operasional, & log sistem',
    primaryIcon: SlidersHorizontal,
    minRoleRequired: 'ADMIN',
    bottomNavItems: [
      { id: 'ADMIN', label: 'Overview', shortLabel: 'Overview', icon: BarChart3, minRoleRequired: 'ADMIN' },
      { id: 'WALI_KELAS', label: 'Wali Kelas', shortLabel: 'Wali Kelas', icon: UserCheck, minRoleRequired: 'ADMIN' },
      { id: 'DENAH_BUS', label: 'Denah Bus', shortLabel: 'Bus', icon: Bus, minRoleRequired: 'ADMIN' },
      { id: 'PEMBAGIAN_KAMAR', label: 'Kamar Hotel', shortLabel: 'Kamar', icon: BedDouble, minRoleRequired: 'ADMIN' },
    ],
    quickActionChips: [
      { id: 'ACADEMIC_CHIP', label: 'Siswa & SDM', icon: FolderOpen, targetTab: 'ADMIN' },
      { id: 'BUS_CHIP', label: 'Alokasi Bus', icon: Bus, targetTab: 'ADMIN' },
      { id: 'ROOM_CHIP', label: 'Kamar Hotel', icon: Building, targetTab: 'ADMIN' },
      { id: 'MONITOR_CHIP', label: 'Log Audit', icon: ClipboardList, targetTab: 'ADMIN' },
    ],
    drawerItems: [
      { id: 'WALI_KELAS', label: 'Portal Wali Kelas', description: 'Akses instan sebagai wali kelas', icon: UserCheck },
      { id: 'DENAH_BUS', label: 'Denah Bus Publik', description: 'Pratinjau tampilan denah bus', icon: Bus },
      { id: 'PEMBAGIAN_KAMAR', label: 'Denah Kamar Hotel', description: 'Pratinjau pembagian kamar', icon: BedDouble },
      { id: 'REKAP_HARIAN', label: 'Laporan Rekapitulasi', description: 'Rekapitulasi angket nasional', icon: Share2 },
    ],
  },
};

