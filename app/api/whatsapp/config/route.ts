import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/services/whatsappService';
import { getInitialSettings } from '@/services/firebaseService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ws = WhatsAppService.getInstance();
    const status = ws.getStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengambil status WhatsApp' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    const ws = WhatsAppService.getInstance();

    if (action === 'initialize') {
      const settings = await getInitialSettings();
      // Initialize asynchronously to avoid blocking the API response
      ws.initializeClient(settings).catch((err) => {
        console.error('[WhatsApp Config] Async initialization error:', err);
      });
      return NextResponse.json({ message: 'Proses inisialisasi WhatsApp dimulai...' });
    }

    if (action === 'disconnect') {
      await ws.disconnectClient();
      return NextResponse.json({ message: 'Koneksi WhatsApp diputus.' });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal memproses permintaan' },
      { status: 500 }
    );
  }
}
