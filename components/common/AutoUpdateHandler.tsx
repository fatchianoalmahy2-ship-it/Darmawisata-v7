'use client';

import { useEffect } from 'react';

export function AutoUpdateHandler() {
  useEffect(() => {
    // 1. Chunk Load Error Handler
    // Catches chunk loading errors when Vercel deploys a new build hash
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const errorMsg =
        'reason' in event
          ? event.reason?.message || String(event.reason)
          : event.message || '';

      if (
        errorMsg.includes('Loading chunk') ||
        errorMsg.includes('ChunkLoadError') ||
        errorMsg.includes('failed to fetch dynamically imported module') ||
        errorMsg.includes('app/error') ||
        errorMsg.includes("Unexpected token '<'") ||
        errorMsg.includes('missing: https')
      ) {
        console.warn('Deployment update detected (ChunkLoadError). Auto reloading page...');
        const lastReload = sessionStorage.getItem('chunk_reload_timestamp');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
          sessionStorage.setItem('chunk_reload_timestamp', String(now));
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleChunkError);

    // 2. Periodic Version Check (Polls every 5 minutes & when tab becomes visible)
    let currentVersion: string | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (currentVersion && data.version && data.version !== currentVersion) {
            console.log('New app version detected on Vercel. Updating page automatically...');
            window.location.reload();
          } else if (data.version) {
            currentVersion = data.version;
          }
        }
      } catch {
        // Silently ignore temporary network errors
      }
    };

    checkVersion();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  return null;
}
