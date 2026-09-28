/**
 * PdfExportService (On-Demand PDF Generation Service)
 * OOP Wrapper with Dynamic Imports for lightweight runtime and fast compilation.
 */

export interface PdfExportOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: string | number[];
  unit?: 'pt' | 'px' | 'mm' | 'cm' | 'in';
}

export class PdfExportService {
  /**
   * Export an HTML element directly to PDF on-demand.
   */
  public static async exportElementToPdf(
    element: HTMLElement,
    options: PdfExportOptions
  ): Promise<void> {
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: options.unit || 'mm',
        format: options.format || 'a4',
      });

      await doc.html(element, {
        callback: (pdf) => {
          const filename = options.filename.endsWith('.pdf')
            ? options.filename
            : `${options.filename}.pdf`;
          pdf.save(filename);
        },
        x: 10,
        y: 10,
        width: 190, // target width in mm for A4
        windowWidth: 1024,
      });
    } catch (error) {
      console.error('[PdfExportService] Failed to export element to PDF:', error);
      throw error;
    }
  }

  /**
   * Low-level builder access to jsPDF instance
   */
  public static async createPdfDocument(options?: Partial<PdfExportOptions>) {
    const { jsPDF } = await import('jspdf');
    return new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: options?.unit || 'mm',
      format: options?.format || 'a4',
    });
  }
}
