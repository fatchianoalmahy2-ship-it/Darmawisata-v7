import React from 'react';
import { MasterTableSchema } from '@/types/masterCore';
import { ClassInfo, RundownItem, Student } from '@/types';

/**
 * Master Table Schema for Classes (Master Data Kelas)
 */
export const classMasterSchema: MasterTableSchema<ClassInfo> = {
  entityName: 'Kelas',
  entityTitle: 'Data Kelas',
  description: 'Kelola data kelas, jurusan, wali kelas, dan kontak pendamping',
  primaryKey: 'id',
  columns: [
    { key: 'name', label: 'Nama Kelas', sortable: true, searchable: true },
    {
      key: 'department',
      label: 'Jurusan',
      sortable: true,
      searchable: true,
      type: 'badge',
    },
    { key: 'homeroomTeacher', label: 'Wali Kelas', sortable: true, searchable: true },
    { key: 'teacherPhone', label: 'No. WhatsApp', sortable: false, searchable: true },
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
      key: 'department',
      label: 'Jurusan / Program Keahlian',
      type: 'select',
      required: true,
      options: [
        { value: 'Teknik Otomotif', label: 'Teknik Otomotif (TO)' },
        { value: 'Teknik Komputer dan Jaringan', label: 'Teknik Komputer & Jaringan (TKJ)' },
        { value: 'Akuntansi', label: 'Akuntansi & Keuangan Lembaga (AKL)' },
        { value: 'Pemasaran', label: 'Pemasaran & Bisnis Digital' },
        { value: 'Umum / Lainnya', label: 'Umum / Lainnya' },
      ],
    },
    {
      key: 'homeroomTeacher',
      label: 'Nama Wali Kelas',
      type: 'text',
      required: true,
      placeholder: 'Nama lengkap beserta gelar',
    },
    {
      key: 'teacherPhone',
      label: 'No. WhatsApp Wali Kelas',
      type: 'text',
      placeholder: '081234567890',
    },
  ],
  filters: [
    {
      key: 'department',
      label: 'Jurusan',
      options: [
        { value: 'Teknik Otomotif', label: 'Teknik Otomotif' },
        { value: 'Teknik Komputer dan Jaringan', label: 'TKJ' },
        { value: 'Akuntansi', label: 'Akuntansi' },
        { value: 'Pemasaran', label: 'Pemasaran' },
      ],
    },
  ],
  defaultSort: { field: 'name', direction: 'asc' },
  defaultPageSize: 10,
};

/**
 * Master Table Schema for Rundown Activities (Jadwal Kegiatan Darmawisata)
 */
export const rundownMasterSchema: MasterTableSchema<RundownItem> = {
  entityName: 'Rundown',
  entityTitle: 'Agenda / Rundown',
  description: 'Jadwal rangkaian kegiatan, waktu, lokasi, dan penanggung jawab',
  primaryKey: 'id',
  columns: [
    { key: 'day', label: 'Hari Ke-', sortable: true, align: 'center', width: '90px' },
    { key: 'time', label: 'Waktu', sortable: true, width: '130px' },
    { key: 'title', label: 'Nama Kegiatan / Agenda', sortable: true, searchable: true },
    { key: 'location', label: 'Lokasi / Destinasi', sortable: true, searchable: true },
    { key: 'pic', label: 'PJ / Koordinator', sortable: false, searchable: true },
  ],
  fields: [
    {
      key: 'day',
      label: 'Hari Kegiatan',
      type: 'select',
      required: true,
      options: [
        { value: 1, label: 'Hari Ke-1 (Keberangkatan / Perjalanan)' },
        { value: 2, label: 'Hari Ke-2 (Kunjungan Industri / Wisata)' },
        { value: 3, label: 'Hari Ke-3 (Eksplorasi & Acara Malam)' },
        { value: 4, label: 'Hari Ke-4 (Kepulangan)' },
      ],
    },
    {
      key: 'time',
      label: 'Rentang Waktu (WIB / WITA)',
      type: 'text',
      required: true,
      placeholder: 'Contoh: 07:00 - 08:30 WITA',
    },
    {
      key: 'title',
      label: 'Nama Agenda / Kegiatan',
      type: 'text',
      required: true,
      placeholder: 'Contoh: Check-in Hotel & Istirahat',
      colSpan: 2,
    },
    {
      key: 'location',
      label: 'Lokasi / Tempat',
      type: 'text',
      required: true,
      placeholder: 'Contoh: Hotel Grand Bali Beach',
    },
    {
      key: 'pic',
      label: 'Penanggung Jawab (PJ)',
      type: 'text',
      placeholder: 'Contoh: Pak Budi / Panitia Lapangan',
    },
    {
      key: 'notes',
      label: 'Catatan Khusus / Dresscode',
      type: 'textarea',
      placeholder: 'Dresscode seragam batik, kumpul di lobby 15 menit sebelum keberangkatan...',
      colSpan: 2,
    },
  ],
  filters: [
    {
      key: 'day',
      label: 'Hari',
      options: [
        { value: 1, label: 'Hari 1' },
        { value: 2, label: 'Hari 2' },
        { value: 3, label: 'Hari 3' },
        { value: 4, label: 'Hari 4' },
      ],
    },
  ],
  defaultSort: { field: 'time', direction: 'asc' },
  defaultPageSize: 15,
};

/**
 * Master Table Schema for Students (Master Data Siswa Darmawisata)
 */
export const studentMasterSchema: MasterTableSchema<Student> = {
  entityName: 'Siswa',
  entityTitle: 'Data Peserta Siswa',
  description: 'Kelola data registrasi, kelas, bus, kamar, dan status peserta Darmawisata',
  primaryKey: 'id',
  columns: [
    { key: 'nis', label: 'NIS', sortable: true, searchable: true, width: '100px' },
    { key: 'name', label: 'Nama Lengkap', sortable: true, searchable: true },
    { key: 'className', label: 'Kelas', sortable: true, searchable: true, width: '120px' },
    {
      key: 'gender',
      label: 'L/P',
      sortable: true,
      align: 'center',
      width: '70px',
      type: 'badge',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
            val === 'L'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : val === 'P'
              ? 'bg-pink-50 text-pink-700 border border-pink-200'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {val === 'L' ? 'L' : val === 'P' ? 'P' : '-'}
        </span>
      ),
    },
    {
      key: 'wave',
      label: 'Gelombang',
      sortable: true,
      align: 'center',
      width: '110px',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
            val === 1
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : val === 2
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {val ? `Gel. ${val}` : '-'}
        </span>
      ),
    },
    {
      key: 'busNumber',
      label: 'Bus',
      sortable: true,
      align: 'center',
      width: '80px',
      render: (val, row) => (
        <span className="font-bold text-slate-800">
          {val ? `Bus ${val}` : <span className="text-slate-400 font-normal">-</span>}
          {row.seatNumber && <span className="text-[10px] text-slate-500 ml-1">(#{row.seatNumber})</span>}
        </span>
      ),
    },
    {
      key: 'roomNumber',
      label: 'Kamar',
      sortable: true,
      align: 'center',
      width: '80px',
      render: (val) => (
        <span className="font-bold text-slate-800">
          {val ? `Kmr ${val}` : <span className="text-slate-400 font-normal">-</span>}
        </span>
      ),
    },
    {
      key: 'isRegistered',
      label: 'Status Registrasi',
      sortable: true,
      align: 'center',
      width: '130px',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
            val
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {val ? 'Terdaftar' : 'Belum'}
        </span>
      ),
    },
  ],
  fields: [
    {
      key: 'nis',
      label: 'Nomor Induk Siswa (NIS)',
      type: 'text',
      required: true,
      placeholder: 'Contoh: 20241001',
    },
    {
      key: 'name',
      label: 'Nama Lengkap Siswa',
      type: 'text',
      required: true,
      placeholder: 'Sesuai akta / ijazah',
    },
    {
      key: 'className',
      label: 'Kelas',
      type: 'text',
      required: true,
      placeholder: 'Contoh: XI TKJ 1',
    },
    {
      key: 'gender',
      label: 'Jenis Kelamin',
      type: 'select',
      required: true,
      options: [
        { value: 'L', label: 'Laki-Laki (L)' },
        { value: 'P', label: 'Perempuan (P)' },
      ],
    },
    {
      key: 'wave',
      label: 'Gelombang Tujuan',
      type: 'select',
      options: [
        { value: 1, label: 'Gelombang 1 (Bali)' },
        { value: 2, label: 'Gelombang 2 (Yogyakarta)' },
      ],
    },
    {
      key: 'busNumber',
      label: 'Nomor Bus',
      type: 'number',
      placeholder: 'Contoh: 1, 2, 3',
    },
    {
      key: 'seatNumber',
      label: 'Nomor Kursi Bus',
      type: 'text',
      placeholder: 'Contoh: 1A, 2B, 15',
    },
    {
      key: 'roomNumber',
      label: 'Nomor Kamar Hotel',
      type: 'text',
      placeholder: 'Contoh: 101, 204',
    },
    {
      key: 'studentPhone',
      label: 'Nomor WhatsApp Siswa',
      type: 'text',
      placeholder: '081234567890',
    },
    {
      key: 'parentPhone',
      label: 'Nomor WhatsApp Orang Tua',
      type: 'text',
      placeholder: '081234567890',
    },
    {
      key: 'isRegistered',
      label: 'Status Registrasi',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  bulkEditableFields: [
    {
      key: 'gender',
      label: 'Jenis Kelamin',
      type: 'select',
      options: [
        { value: 'L', label: 'Laki-Laki (L)' },
        { value: 'P', label: 'Perempuan (P)' },
      ],
    },
    {
      key: 'wave',
      label: 'Gelombang Tujuan',
      type: 'select',
      options: [
        { value: 1, label: 'Gelombang 1 (Bali)' },
        { value: 2, label: 'Gelombang 2 (Yogyakarta)' },
      ],
    },
    {
      key: 'busNumber',
      label: 'Nomor Bus',
      type: 'number',
      placeholder: 'Nomor bus target (1 - 10)',
    },
    {
      key: 'roomNumber',
      label: 'Nomor Kamar Hotel',
      type: 'text',
      placeholder: 'Nomor kamar hotel target',
    },
    {
      key: 'isRegistered',
      label: 'Status Registrasi',
      type: 'boolean',
      options: [
        { value: 'true', label: 'Terdaftar (Ya)' },
        { value: 'false', label: 'Belum Terdaftar (Tidak)' },
      ],
    },
  ],
  filters: [
    {
      key: 'gender',
      label: 'Gender',
      options: [
        { value: 'L', label: 'Laki-Laki (L)' },
        { value: 'P', label: 'Perempuan (P)' },
      ],
    },
    {
      key: 'wave',
      label: 'Gelombang',
      options: [
        { value: 1, label: 'Gelombang 1' },
        { value: 2, label: 'Gelombang 2' },
      ],
    },
    {
      key: 'isRegistered',
      label: 'Status',
      options: [
        { value: 'true', label: 'Terdaftar' },
        { value: 'false', label: 'Belum Terdaftar' },
      ],
    },
  ],
  defaultSort: { field: 'name', direction: 'asc' },
  defaultPageSize: 25,
};
