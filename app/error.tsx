'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700/60 shadow-2xl space-y-4">
        <h2 className="text-xl font-black text-rose-400">Terjadi Kesalahan Aplikasi</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          {error?.message || 'Aplikasi mengalami kendala saat memuat. Silakan coba muat ulang.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-lg"
        >
          Muat Ulang Halaman
        </button>
      </div>
    </div>
  );
}

