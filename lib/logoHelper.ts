'use client';

import schoolMetadata from '@/config/schoolMetadata.json';
import { AppSettings } from '@/types';

/**
 * Resolves the official school logo URL from settings, falling back to default static asset.
 */
export function getSchoolLogoUrl(settings?: Partial<AppSettings> | null): string {
  if (settings?.headerLogoUrl && settings.headerLogoUrl.trim() !== '') {
    return settings.headerLogoUrl.trim();
  }
  if (settings?.appLogoUrl && settings.appLogoUrl.trim() !== '') {
    return settings.appLogoUrl.trim();
  }
  return '/smkpgri2ponorogo.png';
}

/**
 * Converts a logo URL or Base64 into a clean, CORS-safe PNG Base64 string for jsPDF.
 * Uses an in-memory HTML5 canvas with a timeout fallback.
 */
export async function getBase64LogoForPdf(logoUrl?: string): Promise<string | null> {
  const url = logoUrl && logoUrl.trim() !== '' ? logoUrl.trim() : '/smkpgri2ponorogo.png';

  // If already base64 data URL
  if (url.startsWith('data:image/')) {
    return url;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      // Timeout fallback if remote image fails to load
      resolve(null);
    }, 2500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        // Bound dimensions to maximum 300x300 for crisp, lightweight PDF embedding
        const maxDim = 300;
        let width = img.naturalWidth || img.width || 120;
        let height = img.naturalHeight || img.height || 120;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = url;
  });
}
