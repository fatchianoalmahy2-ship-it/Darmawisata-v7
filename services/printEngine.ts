export interface PdfExportOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: string | [number, number];
  scale?: number;
  quality?: number;
  margin?: number | [number, number, number, number];
  elementId?: string;
  element?: HTMLElement | null;
}

export class PrintEngineService {
  /**
   * Generates and downloads a standardized PDF from HTML elements using sequential off-screen rendering
   * Guarantees 1:1 preview match, eliminates blank pages, and locks 1 page per bus sheet.
   * Dynamically imports heavy 'jspdf' and 'html2canvas' only when invoked.
   */
  public static async exportToPdf(options: PdfExportOptions): Promise<boolean> {
    try {
      const targetElement = options.element || (options.elementId ? document.getElementById(options.elementId) : null);
      if (!targetElement) {
        throw new Error(`Target print element not found: ${options.elementId || 'unknown'}`);
      }

      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const html2canvas = html2canvasModule.default;

      const isLandscape = options.orientation === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: options.format || 'a4',
        compress: true,
      });

      const pageWidthMm = isLandscape ? 297 : 210;
      const pageHeightMm = isLandscape ? 210 : 297;

      // Identify individual pages if present (e.g. .bus-a4-page, .chaperone-sheet, .document-page)
      let pageElements = Array.from(
        targetElement.querySelectorAll<HTMLElement>('.bus-a4-page, .chaperone-sheet, .document-page, .printable-a4-page, .printable-bus-area')
      );

      // If no sub-page elements found, treat targetElement as a single page
      if (pageElements.length === 0) {
        pageElements = [targetElement];
      }

      // Create a clean off-screen sandbox to isolate cloned DOM from parent zoom/transforms
      const sandbox = document.createElement('div');
      sandbox.setAttribute('id', 'print-offscreen-sandbox');
      sandbox.style.position = 'fixed';
      sandbox.style.left = '-99999px';
      sandbox.style.top = '0';
      sandbox.style.width = isLandscape ? '1123px' : '794px';
      sandbox.style.minHeight = isLandscape ? '794px' : '1123px';
      sandbox.style.backgroundColor = '#ffffff';
      sandbox.style.zIndex = '-99999';
      sandbox.style.margin = '0';
      sandbox.style.padding = '0';
      sandbox.style.transform = 'none';
      sandbox.style.zoom = '1';
      document.body.appendChild(sandbox);

      try {
        for (let i = 0; i < pageElements.length; i++) {
          const originalPage = pageElements[i];
          const clone = originalPage.cloneNode(true) as HTMLElement;

          // Normalize clone styles for exact A4 paper dimensions at 96 DPI
          clone.style.transform = 'none';
          clone.style.zoom = '1';
          clone.style.margin = '0 auto';
          clone.style.boxShadow = 'none';
          clone.style.border = 'none';
          clone.style.backgroundColor = '#ffffff';
          clone.style.width = isLandscape ? '1123px' : '794px';
          clone.style.maxWidth = isLandscape ? '1123px' : '794px';
          clone.style.minWidth = isLandscape ? '1123px' : '794px';
          clone.style.boxSizing = 'border-box';
          clone.style.overflow = 'hidden';
          clone.style.display = 'block';

          // Ensure all image elements inside clone have crossOrigin attribute
          const images = clone.querySelectorAll<HTMLImageElement>('img');
          images.forEach((img) => {
            img.crossOrigin = 'anonymous';
          });

          sandbox.appendChild(clone);

          // Allow DOM reflow
          await new Promise((resolve) => setTimeout(resolve, 50));

          const canvas = await html2canvas(clone, {
            scale: options.scale || 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: isLandscape ? 1123 : 794,
            windowWidth: isLandscape ? 1123 : 794,
          });

          const imgData = canvas.toDataURL('image/jpeg', options.quality || 0.95);

          if (i > 0) {
            pdf.addPage(options.format || 'a4', isLandscape ? 'landscape' : 'portrait');
          }

          pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');

          // Clean sandbox for next page
          sandbox.innerHTML = '';
        }

        const finalFilename = options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`;
        pdf.save(finalFilename);
        return true;
      } finally {
        if (sandbox.parentNode) {
          sandbox.parentNode.removeChild(sandbox);
        }
      }
    } catch (error) {
      console.error('PrintEngineService exportToPdf error:', error);
      throw error;
    }
  }

  /**
   * Triggers native browser print dialog
   */
  public static printDocument(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
