import { MasterTableSchema } from '@/types/masterCore';
import { MasterDepartment, MasterClass, MasterStudent, MasterTeacher } from '@/types';

/**
 * Master Table Schema for Departments (Master Induk Jurusan)
 */
export const departmentMasterSchema: MasterTableSchema<MasterDepartment> = {
  entityName: 'Jurusan',
  entityTitle: 'Data Induk Jurusan',
  description: 'Kelola data induk program keahlian / jurusan sekolah',
  primaryKey: 'id',
  columns: [
    { key: 'code', label: 'Kode Jurusan', sortable: true, searchable: true, width: '120px' },
    { key: 'name', label: 'Nama Program Keahlian / Jurusan', sortable: true, searchable: true },
    { key: 'description', label: 'Keterangan', sortable: false, searchable: false },
  ],
  fields: [
    {
      key: 'code',
      label: 'Kode Jurusan',
      type: 'text',
      required: true,
      placeholder: 'Contoh: TKJ, TO, AKL, PM',
    },
    {
      key: 'name',
      label: 'Nama Jurusan',
      type: 'text',
      required: true,
      placeholder: 'Contoh: Teknik Komputer dan Jaringan',
    },
    {
      key: 'description',
      label: 'Keterangan Singkat',
      type: 'textarea',
      placeholder: 'Deskripsi jurusan...',
      colSpan: 2,
    },
  ],
  defaultSort: { field: 'code', direction: 'asc' },
  defaultPageSize: 10,
};

/**
 * Master Table Schema for Classes (Master Induk Kelas)
 */
export const classIndukSchema: MasterTableSchema<MasterClass> = {
  entityName: 'Kelas',
  entityTitle: 'Data Induk Kelas',
  description: 'Kelola data kelas, jurusan, wali kelas, dan kontak pendamping',
  primaryKey: 'id',
  columns: [
    { key: 'name', label: 'Nama Kelas', sortable: true, searchable: true },
    { key: 'departmentCode', label: 'Jurusan', sortable: true, searchable: true, type: 'badge' },
    { key: 'homeroomTeacherName', label: 'Wali Kelas', sortable: true, searchable: true },
    { key: 'teacherPhone', label: 'No. WhatsApp', sortable: false, searchable: true },
    { key: 'academicYear', label: 'Tahun Ajaran', sortable: true, searchable: true },
  ],
  fields: [
    {
      key: 'name',
      label: 'Nama Kelas',
      type: 'text',
      required: true,
      placeholder: 'Contoh: XI TKJ 1, XII TBSM 2',
    },
    {
      key: 'departmentCode',
      label: 'Kode Jurusan',
      type: 'select',
      required: true,
      options: [
        { value: 'TO', label: 'Teknik Otomotif (TO)' },
        { value: 'TKJ', label: 'Teknik Komputer & Jaringan (TKJ)' },
        { value: 'AKL', label: 'Akuntansi & Keuangan (AKL)' },
        { value: 'PM', label: 'Pemasaran & Bisnis Digital (PM)' },
        { value: 'UMUM', label: 'Umum / Lainnya' },
      ],
    },
    {
      key: 'homeroomTeacherName',
      label: 'Nama Wali Kelas',
      type: 'text',
      required: true,
      placeholder: 'Nama lengkap wali kelas beserta gelar',
    },
    {
      key: 'teacherPhone',
      label: 'No. WhatsApp Wali Kelas',
      type: 'text',
      placeholder: '081234567890',
    },
    {
      key: 'academicYear',
      label: 'Tahun Ajaran',
      type: 'text',
      required: true,
      placeholder: '2025/2026',
    },
  ],
  filters: [
    {
      key: 'departmentCode',
      label: 'Jurusan',
      options: [
        { value: 'TO', label: 'Teknik Otomotif' },
        { value: 'TKJ', label: 'Teknik Komputer Jaringan' },
        { value: 'AKL', label: 'Akuntansi' },
        { value: 'PM', label: 'Pemasaran' },
      ],
    },
  ],
  defaultSort: { field: 'name', direction: 'asc' },
  defaultPageSize: 10,
};

/**
 * Master Table Schema for Permanent Student Identity (Master Induk Siswa)
 */
export const studentIndukSchema: MasterTableSchema<MasterStudent> = {
  entityName: 'Siswa Induk',
  entityTitle: 'Data Induk Siswa',
  description: 'Master data identitas permanen siswa seluruh angkatan',
  primaryKey: 'id',
  columns: [
    { key: 'nis', label: 'NIS', sortable: true, searchable: true, width: '100px' },
    { key: 'name', label: 'Nama Lengkap', sortable: true, searchable: true },
    { key: 'gender', label: 'Gender', sortable: true, searchable: true, type: 'gender' },
    { key: 'className', label: 'Kelas', sortable: true, searchable: true },
    { key: 'departmentCode', label: 'Jurusan', sortable: true, searchable: true, type: 'badge' },
    { key: 'studentPhone', label: 'HP Siswa', sortable: false, searchable: true },
    { key: 'parentName', label: 'Nama Orang Tua', sortable: true, searchable: true },
    { key: 'parentPhone', label: 'HP Orang Tua', sortable: false, searchable: true },
  ],
  fields: [
    {
      key: 'nis',
      label: 'NIS (Nomor Induk Siswa)',
      type: 'text',
      required: true,
      placeholder: 'Contoh: 23241001',
    },
    {
      key: 'nisn',
      label: 'NISN (Opsional)',
      type: 'text',
      placeholder: 'Contoh: 0061234567',
    },
    {
      key: 'name',
      label: 'Nama Lengkap Siswa',
      type: 'text',
      required: true,
      placeholder: 'Nama sesuai ijazah',
      colSpan: 2,
    },
    {
      key: 'gender',
      label: 'Jenis Kelamin',
      type: 'select',
      required: true,
      options: [
        { value: 'LAKI-LAKI', label: 'LAKI-LAKI' },
        { value: 'PEREMPUAN', label: 'PEREMPUAN' },
      ],
    },
    {
      key: 'className',
      label: 'Nama Kelas',
      type: 'text',
      required: true,
      placeholder: 'Contoh: XI TKJ 1',
    },
    {
      key: 'studentPhone',
      label: 'No. HP Siswa',
      type: 'text',
      placeholder: '081234567890',
    },
    {
      key: 'address',
      label: 'Alamat Rumah',
      type: 'textarea',
      placeholder: 'Alamat domisili siswa...',
      colSpan: 2,
    },
    {
      key: 'parentName',
      label: 'Nama Orang Tua / Wali',
      type: 'text',
      placeholder: 'Nama Ayah / Ibu / Wali',
    },
    {
      key: 'parentJob',
      label: 'Pekerjaan Orang Tua',
      type: 'text',
      placeholder: 'Pekerjaan Orang Tua',
    },
    {
      key: 'parentPhone',
      label: 'No. HP Orang Tua / Wali',
      type: 'text',
      placeholder: '081234567890',
    },
  ],
  filters: [
    {
      key: 'gender',
      label: 'Gender',
      options: [
        { value: 'LAKI-LAKI', label: 'Laki-laki' },
        { value: 'PEREMPUAN', label: 'Perempuan' },
      ],
    },
  ],
  defaultSort: { field: 'name', direction: 'asc' },
  defaultPageSize: 15,
};

/**
 * Master Table Schema for Permanent Teachers / Pendamping (Master Induk Guru)
 */
export const teacherIndukSchema: MasterTableSchema<MasterTeacher> = {
  entityName: 'Guru Pendamping',
  entityTitle: 'Data Induk Guru & Pendamping',
  description: 'Master data induk tenaga pendidik dan staf pendamping tour',
  primaryKey: 'id',
  columns: [
    { key: 'name', label: 'Nama Lengkap', sortable: true, searchable: true },
    { key: 'nip', label: 'NIP / NUPTK', sortable: true, searchable: true },
    { key: 'gender', label: 'Gender', sortable: true, searchable: true, type: 'gender' },
    { key: 'defaultRole', label: 'Role / Jabatan Utama', sortable: true, searchable: true, type: 'badge' },
    { key: 'phone', label: 'No. WhatsApp', sortable: false, searchable: true },
  ],
  fields: [
    {
      key: 'name',
      label: 'Nama Lengkap beserta Gelar',
      type: 'text',
      required: true,
      placeholder: 'Contoh: Drs. H. Ahmad Fauzi, M.Pd.',
      colSpan: 2,
    },
    {
      key: 'nip',
      label: 'NIP / NUPTK (Opsional)',
      type: 'text',
      placeholder: '19800101...',
    },
    {
      key: 'gender',
      label: 'Jenis Kelamin',
      type: 'select',
      required: true,
      options: [
        { value: 'LAKI-LAKI', label: 'LAKI-LAKI' },
        { value: 'PEREMPUAN', label: 'PEREMPUAN' },
      ],
    },
    {
      key: 'defaultRole',
      label: 'Tugas / Jabatan Utama',
      type: 'select',
      required: true,
      options: [
        { value: 'WALI_KELAS', label: 'Wali Kelas' },
        { value: 'KAKOMLI', label: 'Ketua Kompetensi (Kakomli)' },
        { value: 'PANITIA', label: 'Panitia Tour' },
        { value: 'MEDIS', label: 'Tim Medis' },
        { value: 'TOUR_LEADER', label: 'Tour Leader' },
        { value: 'STAFF', label: 'Staff / Karyawan' },
        { value: 'LAINNYA', label: 'Lainnya' },
      ],
    },
    {
      key: 'phone',
      label: 'No. WhatsApp / Telepon',
      type: 'text',
      placeholder: '081234567890',
    },
    {
      key: 'notes',
      label: 'Catatan Khusus',
      type: 'textarea',
      placeholder: 'Catatan tambahan...',
      colSpan: 2,
    },
  ],
  defaultSort: { field: 'name', direction: 'asc' },
  defaultPageSize: 10,
};
