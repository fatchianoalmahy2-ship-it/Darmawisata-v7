import { EntitySchema } from './studentSchema';

export const classSchema: EntitySchema = {
  entityName: 'Kelas',
  endpoint: 'classes',
  fields: [
    { name: 'name', label: 'Nama Kelas', type: 'string', searchable: true, sortable: true, required: true },
    { name: 'department', label: 'Jurusan', type: 'enum', options: [
      { value: 'Teknik Otomotif', label: 'Teknik Otomotif' },
      { value: 'Teknik Komputer dan Jaringan', label: 'Teknik Komputer dan Jaringan' },
      { value: 'Akuntansi', label: 'Akuntansi' },
      { value: 'Pemasaran', label: 'Pemasaran' },
      { value: 'Bisnis Digital', label: 'Bisnis Digital' },
    ], searchable: true, sortable: true, filterable: true, required: true },
    { name: 'homeroomTeacher', label: 'Wali Kelas', type: 'string', searchable: true, sortable: true, required: true },
    { name: 'teacherPhone', label: 'No. HP Wali Kelas', type: 'string' },
    { name: 'teacherPassword', label: 'Password Wali Kelas', type: 'string' },
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
