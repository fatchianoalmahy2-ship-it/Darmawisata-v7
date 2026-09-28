'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
      <div className="max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700/60 shadow-2xl space-y-4">
        <h2 className="text-xl font-black text-amber-400">Halaman Tidak Ditemukan (404)</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-lg"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

