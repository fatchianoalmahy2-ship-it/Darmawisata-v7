'use client';

import { useEffect, useRef } from 'react';
import { AppSettings } from '@/types';

interface AutoRecapSchedulerProps {
  settings?: AppSettings;
  onSettingsUpdate?: (newSettings: AppSettings) => void;
}

export function AutoRecapScheduler({ settings, onSettingsUpdate }: AutoRecapSchedulerProps) {
  const isTriggeringRef = useRef(false);

  useEffect(() => {
    if (!settings || settings.autoRecapEnabled === false) {
      return;
    }

    const checkAndDispatch = async () => {
      if (isTriggeringRef.current) return;

      const targetTime = (settings.autoRecapTime || '13:00').trim();

      // Get current time & date in WIB (Asia/Jakarta)
      const now = new Date();
      const currentHM = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace('.', ':'); // Ensure HH:mm format

      const todayWIB = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      // Check if time matches autoRecapTime and not sent today
      if (currentHM === targetTime && settings.lastAutoRecapSentDate !== todayWIB) {
        // Cross-tab browser lock using localStorage to prevent multiple tabs on the same computer from triggering
        const localLockKey = `auto_recap_lock_${todayWIB}`;
        if (typeof window !== 'undefined') {
          const lockTimestamp = localStorage.getItem(localLockKey);
          if (lockTimestamp) {
            const timeSinceLock = Date.now() - parseInt(lockTimestamp, 10);
            if (timeSinceLock < 5 * 60 * 1000) {
              // Lock is still fresh (< 5 mins), another tab or process is handling this
              return;
            }
          }
          localStorage.setItem(localLockKey, Date.now().toString());
        }

        try {
          isTriggeringRef.current = true;

          // Add a minor randomized jitter (0 to 1500ms) to disperse requests from different devices
          const jitter = Math.floor(Math.random() * 1500);
          await new Promise((r) => setTimeout(r, jitter));

          console.log(`[AutoRecapScheduler] Pukul ${currentHM} WIB reached. Dispatching auto recap...`);

          const res = await fetch('/api/cron/send-recap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ simulate: false, isManual: false }),
          });

          const data = await res.json();

          if (res.ok) {
            if (data.success) {
              console.log('[AutoRecapScheduler] Auto recap sent successfully:', data);
              if (onSettingsUpdate) {
                onSettingsUpdate({
                  ...settings,
                  lastAutoRecapSentDate: todayWIB,
                  lastAutoRecapSentAt: `${data.timestamp} (${data.method})`,
                  lastAutoRecapSentStatus: 'BERHASIL',
                });
              }
            } else if (data.skipped) {
              console.log('[AutoRecapScheduler] Auto recap skipped:', data.reason);
              if (onSettingsUpdate) {
                onSettingsUpdate({
                  ...settings,
                  lastAutoRecapSentDate: todayWIB,
                  lastAutoRecapSentAt: `${now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB`,
                  lastAutoRecapSentStatus: `DILEWATI: ${data.reason}`,
                });
              }
            }
          }
        } catch (err) {
          console.error('[AutoRecapScheduler] Auto recap dispatch error:', err);
        } finally {
          isTriggeringRef.current = false;
        }
      }
    };

    // Check immediately and then every 30 seconds
    checkAndDispatch();
    const interval = setInterval(checkAndDispatch, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.autoRecapEnabled, settings?.autoRecapTime, settings?.lastAutoRecapSentDate]);

  return null;
}
