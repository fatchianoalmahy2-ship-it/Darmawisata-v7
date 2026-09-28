import { MasterTableSchema } from '@/types/masterCore';
import { RundownItem } from '@/types';

export const rundownSchema: MasterTableSchema<RundownItem> = {
  entityName: 'Rundown',
  entityTitle: 'Jadwal Acara & Rundown',
  description: 'Kelola jadwal perjalanan dan aktivitas Darmawisata',
  primaryKey: 'id',
  columns: [
    { key: 'day', label: 'Hari Ke-', sortable: true, searchable: true, align: 'center', width: '80px' },
    { key: 'time', label: 'Waktu', sortable: true, searchable: true, width: '120px' },
    { key: 'activity', label: 'Kegiatan', sortable: true, searchable: true },
    { key: 'location', label: 'Lokasi', sortable: true, searchable: true },
    { key: 'notes', label: 'Catatan Khusus', sortable: false, searchable: true },
  ],
  fields: [
    { key: 'day', label: 'Hari Ke', type: 'number', required: true, min: 1, max: 10, placeholder: 'Contoh: 1' },
    { key: 'time', label: 'Waktu (HH:MM)', type: 'text', required: true, placeholder: 'Contoh: 08:00' },
    { key: 'activity', label: 'Nama Kegiatan', type: 'text', required: true, placeholder: 'Contoh: Kunjungan Industri' },
    { key: 'location', label: 'Lokasi Tujuan', type: 'text', required: true, placeholder: 'Contoh: PT. Astra Honda Motor' },
    { key: 'notes', label: 'Catatan Tambahan', type: 'textarea', placeholder: 'Keterangan tambahan...', colSpan: 2 },
  ],
  defaultSort: { field: 'day', direction: 'asc' },
  defaultPageSize: 15,
};
