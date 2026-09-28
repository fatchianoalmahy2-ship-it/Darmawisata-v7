import { AppSettings, SchoolClass, Student } from '@/types';
import qrcode from 'qrcode';

export const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.includes('@g.us')) {
    return trimmed;
  }
  let cleaned = trimmed.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
};

export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  if (phone.includes('@g.us')) return true;
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length >= 10 && cleaned.length <= 15;
};

export class WhatsAppService {
  private static instance: WhatsAppService;
  private client: any = null;
  private qrCodeBase64: string = '';
  private connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'ERROR' = 'DISCONNECTED';
  private errorMessage: string = '';

  private constructor() {}

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  public getStatus() {
    return {
      status: this.connectionStatus,
      qr: this.qrCodeBase64,
      error: this.errorMessage,
    };
  }

  /**
   * Initialize whatsapp-web.js client dynamically
   */
  public async initializeClient(settings: AppSettings) {
    if (this.client) {
      return;
    }

    this.connectionStatus = 'CONNECTING';
    this.errorMessage = '';
    this.qrCodeBase64 = '';

    try {
      // whatsapp-web.js requires puppeteer which is not supported in AI Studio
      console.log('[WhatsApp] whatsapp-web.js is not supported in AI Studio environment. Forcing SIMULATION/HTTP_GATEWAY mode.');
      this.connectionStatus = 'ERROR';
      this.errorMessage = 'Fitur whatsapp-web.js dinonaktifkan di AI Studio. Gunakan mode Gateway HTTP atau Simulasi.';
      this.client = null;
    } catch (err: any) {
      this.connectionStatus = 'ERROR';
      this.errorMessage = `Gagal memuat whatsapp-web.js. Pastikan module terinstal dan Puppeteer didukung di server Anda. Error: ${err.message || err}`;
      this.client = null;
      console.warn('[WhatsApp] whatsapp-web.js failed to load or initialize. Falling back to HTTP Gateway or Simulation mode.', err);
    }
  }

  /**
   * Terminate active whatsapp-web.js client
   */
  public async disconnectClient() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error('[WhatsApp] Error destroying client:', err);
      }
      this.client = null;
    }
    this.connectionStatus = 'DISCONNECTED';
    this.qrCodeBase64 = '';
  }

  /**
   * Send WhatsApp message using the selected mode (WEB_JS, HTTP_GATEWAY, or SIMULATION)
   */
  public async sendMessage(
    targetPhoneOrGroup: string,
    message: string,
    settings: AppSettings
  ): Promise<{ success: boolean; method: string; detail?: string }> {
    const mode = settings.whatsappMode || 'SIMULATION';
    const cleanTarget = cleanPhoneNumber(targetPhoneOrGroup);

    if (!cleanTarget) {
      throw new Error('Target nomor telepon atau grup tidak valid / kosong');
    }

    if (mode === 'SIMULATION') {
      console.log(`[WhatsApp SIMULATION] Sending to ${cleanTarget}:\n${message}`);
      return {
        success: true,
        method: 'SIMULATION',
        detail: 'Pesan dikirim melalui mode simulasi sukses harian.',
      };
    }

    if (mode === 'gateway') {
      const url = settings.whatsappGatewayUrl || 'https://api.fonnte.com/send';
      if (!url) {
        throw new Error('WhatsApp HTTP Gateway URL belum diisi pada pengaturan.');
      }

      console.log(`[WhatsApp HTTP_GATEWAY] Dispatching to ${url} for ${cleanTarget}...`);
      try {
        const isFonnte = url.includes('fonnte.com');
        const token = (settings.whatsappGatewayToken || '').replace(/^Bearer\s+/i, '').trim();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = isFonnte ? token : `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            target: cleanTarget,
            message: message,
            ...(isFonnte ? { countryCode: '62' } : {}),
          }),
        });

        const resText = await response.text();
        let resJson: any = null;
        try {
          resJson = JSON.parse(resText);
        } catch (_) {}

        if (!response.ok) {
          throw new Error(`Gateway returned HTTP ${response.status}: ${resText}`);
        }

        // Fonnte API returns HTTP 200 with { status: false, reason: "..." } on failure
        if (resJson && resJson.status === false) {
          throw new Error(`Gateway Error: ${resJson.reason || resJson.message || resJson.detail || 'Pengiriman ke WhatsApp gagal'}`);
        }

        return {
          success: true,
          method: 'gateway',
          detail: `Berhasil dikirim melalui Gateway API (${url}): ${resJson?.detail || resJson?.message || 'OK'}`,
        };
      } catch (err: any) {
        console.error('[WhatsApp HTTP_GATEWAY] Send error:', err);
        throw new Error(`Kesalahan koneksi Gateway: ${err.message || err}`);
      }
    }

    if (mode === 'direct') {
      if (!this.client || this.connectionStatus !== 'CONNECTED') {
        throw new Error('Koneksi whatsapp-web.js belum siap atau terputus. Silakan hubungkan kembali melalui Admin Panel.');
      }

      try {
        // Send using active self-hosted whatsapp-web.js client
        let jid = cleanTarget;
        if (!cleanTarget.endsWith('@c.us') && !cleanTarget.endsWith('@g.us')) {
          const cleanDigits = cleanTarget.replace(/[^0-9]/g, '');
          if (cleanDigits.startsWith('0')) {
            jid = `62${cleanDigits.substring(1)}@c.us`;
          } else {
            jid = `${cleanDigits}@c.us`;
          }
        }

        console.log(`[WhatsApp WEB_JS] Sending message to ${jid}...`);
        await this.client.sendMessage(jid, message);

        return {
          success: true,
          method: 'direct',
          detail: `Berhasil dikirim melalui whatsapp-web.js ke JID: ${jid}`,
        };
      } catch (err: any) {
        console.error('[WhatsApp WEB_JS] Send error:', err);
        throw new Error(`Gagal mengirim via whatsapp-web.js: ${err.message || err}`);
      }
    }

    throw new Error(`Mode WhatsApp '${mode}' tidak didukung.`);
  }
}
