/**
 * ExcelExportService (On-Demand / Lazy-Loaded Export Engine)
 * Implements SOLID, OOP, and fast dynamic compilation without top-level bundle bloat.
 */

export interface ExcelSheetData {
  sheetName: string;
  data: Array<Record<string, any>> | Array<Array<any>>;
}

export class ExcelExportService {
  /**
   * Generates and downloads an Excel (.xlsx) file on-demand.
   * Loads XLSX library dynamically to keep initial bundle size lightweight.
   */
  public static async exportToExcel(
    filename: string,
    sheets: ExcelSheetData[]
  ): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      sheets.forEach((sheet) => {
        let worksheet;
        if (sheet.data.length > 0 && Array.isArray(sheet.data[0])) {
          worksheet = XLSX.utils.aoa_to_sheet(sheet.data as Array<Array<any>>);
        } else {
          worksheet = XLSX.utils.json_to_sheet(sheet.data);
        }
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName.substring(0, 31));
      });

      const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      XLSX.writeFile(workbook, fullFilename);
    } catch (error) {
      console.error('[ExcelExportService] Failed to export excel:', error);
      throw error;
    }
  }

  /**
   * Helper for quick single-sheet export from JSON objects
   */
  public static async exportJsonToExcel(
    filename: string,
    sheetName: string,
    data: Array<Record<string, any>>
  ): Promise<void> {
    return this.exportToExcel(filename, [{ sheetName, data }]);
  }
}
