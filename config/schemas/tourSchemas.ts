import { MasterTableSchema } from '@/types/masterCore';
import { TourEvent, TourWave, TourParticipant, TourChaperoneAssignment } from '@/types';

/**
 * Operational Schema for Tour Events (Master Event Perjalanan)
 */
export const tourEventSchema: MasterTableSchema<TourEvent> = {
  entityName: 'Tour Event',
  entityTitle: 'Event Perjalanan Tour',
  description: 'Kelola program perjalanan kunjungan industri & study tour sekolah',
  primaryKey: 'id',
  columns: [
    { key: 'title', label: 'Nama Event Tour', sortable: true, searchable: true },
    { key: 'destination', label: 'Destinasi', sortable: true, searchable: true, type: 'badge' },
    { key: 'academicYear', label: 'Tahun Ajaran', sortable: true, searchable: true },
    { key: 'status', label: 'Status Event', sortable: true, searchable: true, type: 'status' },
  ],
  fields: [
    {
      key: 'title',
      label: 'Nama Event Tour',
      type: 'text',
      required: true,
      placeholder: 'Contoh: Darmawisata Study Tour Bali 2026',
      colSpan: 2,
    },
    {
      key: 'destination',
      label: 'Destinasi Utama',
      type: 'select',
      required: true,
      options: [
        { value: 'BALI', label: 'BALI' },
        { value: 'YOGYAKARTA', label: 'YOGYAKARTA' },
        { value: 'MAGANG', label: 'MAGANG / KUNJUNGAN INDUSTRI' },
      ],
    },
    {
      key: 'academicYear',
      label: 'Tahun Ajaran',
      type: 'text',
      required: true,
      placeholder: '2025/2026',
    },
    {
      key: 'status',
      label: 'Status Operasional',
      type: 'select',
      required: true,
      options: [
        { value: 'DRAFT', label: 'DRAFT (Persiapan)' },
        { value: 'ACTIVE', label: 'ACTIVE (Berjalan)' },
        { value: 'COMPLETED', label: 'COMPLETED (Selesai)' },
      ],
    },
    {
      key: 'startDate',
      label: 'Tanggal Keberangkatan',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
    },
    {
      key: 'endDate',
      label: 'Tanggal Kepulangan',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
    },
  ],
  defaultSort: { field: 'title', direction: 'asc' },
  defaultPageSize: 10,
};

/**
 * Operational Schema for Tour Wave (Gelombang Tour)
 */
export const tourWaveSchema: MasterTableSchema<TourWave> = {
  entityName: 'Gelombang Tour',
  entityTitle: 'Gelombang Perjalanan',
  description: 'Pengaturan gelombang dan alokasi bus per kluster keberangkatan',
  primaryKey: 'id',
  columns: [
    { key: 'name', label: 'Nama Gelombang', sortable: true, searchable: true },
    { key: 'waveCode', label: 'Kode Gelombang', sortable: true, searchable: true, type: 'badge' },
    { key: 'defaultBusCapacity', label: 'Kapasitas Standard Bus', sortable: true },
    { key: 'busVacantSeats', label: 'Kursi Kosong Depan', sortable: false },
  ],
  fields: [
    {
      key: 'name',
      label: 'Nama Gelombang',
      type: 'text',
      required: true,
      placeholder: 'Contoh: Gelombang 1 - Bali',
    },
    {
      key: 'waveCode',
      label: 'Kode Gelombang',
      type: 'select',
      required: true,
      options: [
        { value: 'BALI_GEL_1', label: 'BALI_GEL_1' },
        { value: 'BALI_GEL_2', label: 'BALI_GEL_2' },
        { value: 'YOGYA_GEL_1', label: 'YOGYA_GEL_1' },
      ],
    },
    {
      key: 'defaultBusCapacity',
      label: 'Kapasitas Per Bus',
      type: 'number',
      required: true,
      placeholder: '50',
    },
    {
      key: 'busVacantSeats',
      label: 'Sisa Kursi Kosong Per Bus',
      type: 'select',
      options: [
        { value: 'none', label: 'Tidak Ada (Isi Penuh)' },
        { value: '1-2', label: '1 - 2 Kursi Kosong' },
        { value: '1-4', label: '1 - 4 Kursi Kosong' },
      ],
    },
  ],
  defaultSort: { field: 'name', direction: 'asc' },
  defaultPageSize: 10,
};

/**
 * Operational Schema for Tour Participant (Partisipan Tour Operasional)
 */
export const tourParticipantSchema: MasterTableSchema<TourParticipant & { studentName?: string; className?: string }> = {
  entityName: 'Partisipan Tour',
  entityTitle: 'Data Partisipan Tour',
  description: 'Status partisipasi, registrasi, alokasi bus, dan kamar peserta tour',
  primaryKey: 'id',
  columns: [
    { key: 'studentId', label: 'ID Siswa', sortable: true, searchable: true },
    { key: 'waveId', label: 'Gelombang', sortable: true, searchable: true, type: 'badge' },
    { key: 'isRegistered', label: 'Status Lunas', sortable: true, type: 'boolean' },
    { key: 'tShirtSize', label: 'Ukuran Kaos', sortable: true, searchable: true },
    { key: 'busNumber', label: 'Bus #', sortable: true },
    { key: 'seatNumber', label: 'Kursi #', sortable: true },
    { key: 'roomNumber', label: 'Kamar #', sortable: true },
    { key: 'waiverType', label: 'Potongan', sortable: true, type: 'badge' },
  ],
  fields: [
    {
      key: 'waveId',
      label: 'Gelombang Keberangkatan',
      type: 'select',
      required: true,
      options: [
        { value: 'BALI_GEL_1', label: 'Bali Gelombang 1' },
        { value: 'BALI_GEL_2', label: 'Bali Gelombang 2' },
        { value: 'YOGYA_GEL_1', label: 'Yogyakarta Gelombang 1' },
      ],
    },
    {
      key: 'isRegistered',
      label: 'Status Registrasi / Pembayaran Lunas',
      type: 'boolean',
    },
    {
      key: 'tShirtSize',
      label: 'Ukuran Kaos Tour',
      type: 'select',
      options: [
        { value: 'S', label: 'S' },
        { value: 'M', label: 'M' },
        { value: 'L', label: 'L' },
        { value: 'XL', label: 'XL' },
        { value: 'XXL', label: 'XXL' },
        { value: '3XL', label: '3XL' },
        { value: '4XL', label: '4XL' },
      ],
    },
    {
      key: 'tShirtDesign',
      label: 'Desain Kaos',
      type: 'select',
      options: [
        { value: 'A', label: 'Desain A' },
        { value: 'B', label: 'Desain B' },
      ],
    },
    {
      key: 'waiverType',
      label: 'Jenis Beasiswa / Waiver Biaya',
      type: 'select',
      options: [
        { value: 'NONE', label: 'Tidak Ada (Bayar Penuh)' },
        { value: '25%', label: 'Diskon 25%' },
        { value: '50%', label: 'Diskon 50%' },
      ],
    },
    {
      key: 'busNumber',
      label: 'Nomor Bus Alokasi',
      type: 'number',
      placeholder: 'Contoh: 1',
    },
    {
      key: 'seatNumber',
      label: 'Nomor Bangku / Kursi Bus',
      type: 'number',
      placeholder: 'Contoh: 12',
    },
    {
      key: 'roomNumber',
      label: 'Nomor Kamar Hotel',
      type: 'number',
      placeholder: 'Contoh: 204',
    },
    {
      key: 'medicalHistory',
      label: 'Catatan Medis / Riwayat Penyakit',
      type: 'textarea',
      placeholder: 'Alergi makanan, asma, vertigo, obat khusus...',
      colSpan: 2,
    },
  ],
  filters: [
    {
      key: 'waveId',
      label: 'Gelombang',
      options: [
        { value: 'BALI_GEL_1', label: 'Bali 1' },
        { value: 'BALI_GEL_2', label: 'Bali 2' },
        { value: 'YOGYA_GEL_1', label: 'Yogya 1' },
      ],
    },
    {
      key: 'tShirtSize',
      label: 'Ukuran Kaos',
      options: [
        { value: 'S', label: 'S' },
        { value: 'M', label: 'M' },
        { value: 'L', label: 'L' },
        { value: 'XL', label: 'XL' },
        { value: 'XXL', label: 'XXL' },
      ],
    },
  ],
  defaultSort: { field: 'busNumber', direction: 'asc' },
  defaultPageSize: 15,
};

/**
 * Operational Schema for Chaperone Assignments (Penugasan Guru di Bus)
 */
export const tourChaperoneAssignmentSchema: MasterTableSchema<TourChaperoneAssignment & { teacherName?: string }> = {
  entityName: 'Penugasan Guru',
  entityTitle: 'Penugasan Guru & Pendamping',
  description: 'Alokasi peran dan penempatan bus guru pendamping tour',
  primaryKey: 'id',
  columns: [
    { key: 'waveId', label: 'Gelombang', sortable: true, type: 'badge' },
    { key: 'assignedRole', label: 'Peran Penugasan', sortable: true, type: 'badge' },
    { key: 'assignedBusNumber', label: 'Bus #', sortable: true },
  ],
  fields: [
    {
      key: 'waveId',
      label: 'Gelombang Tour',
      type: 'select',
      required: true,
      options: [
        { value: 'ALL', label: 'Semua Gelombang (ALL)' },
        { value: 'BALI_GEL_1', label: 'Bali Gelombang 1' },
        { value: 'BALI_GEL_2', label: 'Bali Gelombang 2' },
        { value: 'YOGYA_GEL_1', label: 'Yogyakarta Gelombang 1' },
      ],
    },
    {
      key: 'assignedRole',
      label: 'Tugas Dalam Perjalanan',
      type: 'select',
      required: true,
      options: [
        { value: 'WALI_KELAS', label: 'Wali Kelas' },
        { value: 'KAKOMLI', label: 'Ketua Komtensi' },
        { value: 'PANITIA', label: 'Panitia Keberangkatan' },
        { value: 'MEDIS', label: 'Penanggung Jawab Medis' },
        { value: 'TOUR_LEADER', label: 'Tour Leader' },
      ],
    },
    {
      key: 'assignedBusNumber',
      label: 'Nomor Bus Yang Dampingi',
      type: 'number',
      placeholder: 'Contoh: 1',
    },
  ],
  defaultSort: { field: 'assignedBusNumber', direction: 'asc' },
  defaultPageSize: 10,
};
