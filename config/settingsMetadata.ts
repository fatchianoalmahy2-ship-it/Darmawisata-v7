export interface SettingsTabMetadata {
  id: 'PARAM_ALOKASI' | 'PENDAMPING' | 'BATAS_ANGKET' | 'GELOMBANG_DESTINASI' | 'WA_TEMPLATE' | 'BRANDING_SURAT';
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
}

export const SETTINGS_MAIN_TABS: SettingsTabMetadata[] = [
  {
    id: 'PARAM_ALOKASI',
    label: 'Parameter & Aturan Alokasi',
    shortLabel: 'Alokasi',
    iconName: 'Bus',
    description: 'Aturan kapasitas bus/kamar, prioritas gender, sorting jurusan, dan kuota wali kelas.',
  },
  {
    id: 'PENDAMPING',
    label: 'Master Guru & Pendamping',
    shortLabel: 'Pendamping',
    iconName: 'Users',
    description: 'Pengelolaan daftar guru pendamping, staf medis, kakomli, dan panitia resmi.',
  },
  {
    id: 'BATAS_ANGKET',
    label: 'Batas Waktu & Buka/Tutup Angket',
    shortLabel: 'Batas Angket',
    iconName: 'Clock',
    description: 'Jadwal penutupan angket otomatis, deadline form, dan visibilitas tombol cari.',
  },
  {
    id: 'GELOMBANG_DESTINASI',
    label: 'Gelombang & Destinasi',
    shortLabel: 'Gelombang',
    iconName: 'Compass',
    description: 'Pengaturan tanggal tur, harga paket, dan pembagian gelombang keberangkatan.',
  },
  {
    id: 'WA_TEMPLATE',
    label: 'Template & Bot WhatsApp',
    shortLabel: 'WhatsApp',
    iconName: 'MessageSquare',
    description: 'Konfigurasi pesan notifikasi otomatis untuk panitia, wali kelas, dan gateway API.',
  },
  {
    id: 'BRANDING_SURAT',
    label: 'Branding, Surat & Tiket',
    shortLabel: 'Branding & Surat',
    iconName: 'FileCode',
    description: 'Logo sekolah, teks kop surat izin, narasi sambutan, dan pengaturan format cetak.',
  },
];

export const WA_PANITIA_VARS = [
  { tag: '{TANGGAL}', label: 'Tanggal Rekap' },
  { tag: '{WAKTU}', label: 'Waktu Pengiriman' },
  { tag: '{TOTAL_SISWA}', label: 'Total Siswa Terdaftar' },
  { tag: '{TOTAL_BELUM}', label: 'Total Belum Mengisi' },
  { tag: '{DAFTAR_BELUM_PER_KELAS}', label: 'Daftar Kelas Belum Lengkap' },
];

export const WA_WALI_VARS = [
  { tag: '{NAMA_WALI}', label: 'Nama Wali Kelas' },
  { tag: '{NAMA_KELAS}', label: 'Nama Kelas' },
  { tag: '{JUMLAH_BELUM}', label: 'Jumlah Belum Isi' },
  { tag: '{DAFTAR_SISWA_BELUM}', label: 'Daftar Nama Siswa' },
  { tag: '{DEADLINE_ANGKET}', label: 'Batas Waktu Pengisian' },
];

export const ALL_MAJORS_LIST = ['TKJ', 'RPL', 'DKV', 'TBKR', 'TBSM', 'TAB', 'TKR', 'TPM', 'TPL'];
