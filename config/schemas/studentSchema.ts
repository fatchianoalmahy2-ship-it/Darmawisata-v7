export interface EntitySchemaField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'enum' | 'boolean' | 'date';
  options?: { value: string; label: string }[]; // For enums
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  required?: boolean;
  hidden?: boolean; // Don't show in table
}

export interface EntitySchemaPermissions {
  create: string[];
  read: string[];
  update: string[];
  delete: string[];
  export: string[];
  print: string[];
}

export interface EntitySchema {
  entityName: string;
  endpoint: string; // API or Supabase table
  fields: EntitySchemaField[];
  permissions: EntitySchemaPermissions;
}

export const studentSchema: EntitySchema = {
  entityName: 'Siswa',
  endpoint: 'students',
  fields: [
    { name: 'nis', label: 'NIS', type: 'string', searchable: true, sortable: true, required: true },
    { name: 'name', label: 'Nama Lengkap', type: 'string', searchable: true, sortable: true, required: true },
    { name: 'className', label: 'Kelas', type: 'string', searchable: true, sortable: true, filterable: true, required: true },
    { name: 'gender', label: 'L/P', type: 'enum', options: [{value:'LAKI-LAKI', label:'Laki-laki'}, {value:'PEREMPUAN', label:'Perempuan'}], filterable: true, required: true },
    { name: 'isRegistered', label: 'Status Angket', type: 'boolean', filterable: true, sortable: true, options: [{ value: 'true', label: 'Sudah Mengisi' }, { value: 'false', label: 'Belum Mengisi' }] },
    { name: 'destination', label: 'Destinasi', type: 'enum', options: [{value:'BALI', label:'Bali'}, {value:'YOGYAKARTA', label:'Yogyakarta'}, {value:'MAGANG', label:'Magang'}], filterable: true },
    { name: 'wave', label: 'Gelombang', type: 'enum', options: [{value:'BALI_GEL_1', label:'Bali 1'}, {value:'BALI_GEL_2', label:'Bali 2'}, {value:'YOGYA_GEL_1', label:'Yogya'}], filterable: true },
    { name: 'busNumber', label: 'Bus', type: 'number', sortable: true, filterable: true },
    { name: 'seatNumber', label: 'Kursi', type: 'number', sortable: true },
    { name: 'roomNumber', label: 'Kamar', type: 'number', sortable: true, filterable: true },
  ],
  permissions: {
    create: ['ADMIN'],
    read: ['ADMIN', 'WALI_KELAS'],
    update: ['ADMIN', 'WALI_KELAS'],
    delete: ['ADMIN'],
    export: ['ADMIN', 'WALI_KELAS'],
    print: ['ADMIN', 'WALI_KELAS']
  }
};
