import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import {
  getInitialSettings,
  getInitialClasses,
  getInitialStudents,
  saveSettings,
} from '@/services/firebaseService';
import { RecapGeneratorService } from '@/services/recapGenerator';
import { WhatsAppService } from '@/services/whatsappService';

// In-memory mutex lock for active dispatches
let isDispatchInProgress = false;

async function executeRecapDispatch(simulate: boolean = false, isManual: boolean = false) {
  // Concurrency guard: If a dispatch is currently running on the server, reject overlapping calls
  if (isDispatchInProgress && !isManual) {
    return {
      success: false,
      skipped: true,
      reason: 'Proses pengiriman rekap sedang berlangsung oleh thread/permintaan lain.',
    };
  }

  const settings = await getInitialSettings();

  // Get current date & time in WIB (Asia/Jakarta)
  const now = new Date();
  const todayWIB = now.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const nowStr = now.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // 1. Check if automatic dispatch is active (only if NOT a manual trigger)
  if (!isManual) {
    if (settings.autoRecapEnabled === false) {
      return {
        success: false,
        skipped: true,
        reason: 'Auto-Send Rekap non-aktif di pengaturan.',
      };
    }

    // Strict Date Lock check: If already sent or currently processing for today, abort immediately
    if (settings.lastAutoRecapSentDate === todayWIB) {
      return {
        success: false,
        skipped: true,
        reason: `Rekap otomatis hari ini (${todayWIB}) sudah dikirim atau sedang dikunci (${settings.lastAutoRecapSentStatus || 'TERKIRIM'}).`,
      };
    }
  }

  const classes = await getInitialClasses();
  const students = await getInitialStudents();

  // 2. Check if 100% completion check is active
  if (!isManual && settings.stopAutoRecapWhenComplete !== false) {
    const totalStudents = students.length;
    const totalRegistered = students.filter((s) => s.isRegistered).length;
    if (totalStudents > 0 && totalRegistered === totalStudents) {
      return {
        success: false,
        skipped: true,
        reason: 'Angket sudah 100% terisi. Pengiriman otomatis dihentikan.',
      };
    }
  }

  // PESSIMISTIC LOCK: Lock today's date in database immediately BEFORE network call to prevent race condition
  if (!isManual) {
    isDispatchInProgress = true;
    try {
      await saveSettings({
        ...settings,
        lastAutoRecapSentDate: todayWIB,
        lastAutoRecapSentAt: `${nowStr} WIB (Sedang Diproses)`,
        lastAutoRecapSentStatus: 'SEDANG_DIPROSES',
      });
    } catch (lockErr) {
      console.warn('[Cron Send Recap] Failed to acquire lock in DB:', lockErr);
    }
  }

  // Generate the 1-page Rombongan Belajar (Rombel) summary message
  const dateStr = now.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const summaryText = RecapGeneratorService.generateWhatsAppAllUnregisteredSummary(
    classes,
    students,
    settings,
    dateStr
  );

  const targetGroup = settings.autoRecapTargetGroup || 'Grup Panitia Darmawisata';
  const targetPhone = settings.autoRecapTargetPhone || '';
  const finalTarget = targetPhone.trim() || targetGroup;

  try {
    const ws = WhatsAppService.getInstance();

    // Override mode to simulation if requested
    const updatedSettings = {
      ...settings,
      whatsappMode: simulate ? 'direct' : settings.whatsappMode || 'direct',
    };

    const sendResult = await ws.sendMessage(finalTarget, summaryText, updatedSettings);
    const successStatus = 'BERHASIL';

    await saveSettings({
      ...settings,
      lastAutoRecapSentDate: todayWIB,
      lastAutoRecapSentAt: `${nowStr} WIB (${sendResult.method})`,
      lastAutoRecapSentStatus: successStatus,
    });

    return {
      success: true,
      timestamp: `${nowStr} WIB`,
      target: finalTarget,
      method: sendResult.method,
      detail: sendResult.detail,
      message: summaryText,
    };
  } catch (err: any) {
    console.error('[Cron Send Recap] Failed to send automatic recap:', err);

    // If failed, record failure status but keep date locked to avoid infinite spam retry loops on network errors
    await saveSettings({
      ...settings,
      lastAutoRecapSentDate: todayWIB,
      lastAutoRecapSentAt: `${nowStr} WIB`,
      lastAutoRecapSentStatus: `GAGAL: ${err.message || err}`,
    });

    throw err;
  } finally {
    isDispatchInProgress = false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const simulate = searchParams.get('simulate') === 'true';
    
    const settings = await getInitialSettings();
    
    // Check if auto recap is enabled
    if (settings.autoRecapEnabled === false) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'Auto-Send Rekap non-aktif di pengaturan.',
      });
    }

    // Check if 100% completion check is active
    if (settings.stopAutoRecapWhenComplete !== false) {
      const students = await getInitialStudents();
      const totalStudents = students.length;
      const totalRegistered = students.filter((s) => s.isRegistered).length;
      if (totalStudents > 0 && totalRegistered === totalStudents) {
        return NextResponse.json({
          success: false,
          skipped: true,
          reason: 'Angket sudah 100% terisi. Pengiriman otomatis dihentikan.',
        });
      }
    }

    // Check if the current time matches the scheduled time
    const now = new Date();
    const todayWIB = now.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const targetTime = (settings.autoRecapTime || '13:00').trim(); // "HH:mm"
    const currentHM = now.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace('.', ':');

    // If already sent today, we definitely skip
    if (settings.lastAutoRecapSentDate === todayWIB) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: `Rekap otomatis hari ini (${todayWIB}) sudah terkirim sebelumnya.`,
      });
    }

    // Compare hours and minutes to check if current time is >= targetTime
    const [currH, currM] = currentHM.split(':').map(Number);
    const [targetH, targetM] = targetTime.split(':').map(Number);
    
    const currMinTotal = currH * 60 + currM;
    const targetMinTotal = targetH * 60 + targetM;

    // We only trigger if current time is past or equal to the target scheduled time
    if (currMinTotal < targetMinTotal) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: `Waktu saat ini (${currentHM} WIB) belum mencapai jadwal pengiriman (${targetTime} WIB).`,
      });
    }

    // Past target time, and not sent today yet: execute dispatch!
    const result = await executeRecapDispatch(simulate, false);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal mengirim rekap otomatis.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const simulate = body.simulate === true;
    const isManual = body.isManual === true;
    
    const result = await executeRecapDispatch(simulate, isManual);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal mengirim rekap otomatis.',
      },
      { status: 500 }
    );
  }
}
