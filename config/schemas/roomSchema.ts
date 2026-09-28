import { EntitySchema } from './studentSchema';

export const roomSchema: EntitySchema = {
  entityName: 'Kamar',
  endpoint: 'rooms',
  fields: [
    { name: 'roomNumber', label: 'Nomor Kamar', type: 'number', searchable: true, sortable: true, required: true },
    { name: 'wave', label: 'Gelombang', type: 'enum', options: [
      { value: 'BALI_GEL_1', label: 'Bali 1' },
      { value: 'BALI_GEL_2', label: 'Bali 2' },
      { value: 'YOGYA_GEL_1', label: 'Yogya' },
    ], searchable: true, sortable: true, filterable: true, required: true },
    { name: 'gender', label: 'Gender', type: 'enum', options: [
      { value: 'LAKI-LAKI', label: 'Laki-laki' },
      { value: 'PEREMPUAN', label: 'Perempuan' },
    ], filterable: true, required: true },
    { name: 'capacity', label: 'Kapasitas', type: 'number', sortable: true, required: true },
  ],
  permissions: {
    create: ['ADMIN'],
    read: ['ADMIN', 'WALI_KELAS'],
    update: ['ADMIN'],
    delete: ['ADMIN'],
    export: ['ADMIN'],
    print: ['ADMIN']
  }
};
