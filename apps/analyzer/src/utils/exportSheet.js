/**
 * Minimal "array of flat objects -> .xlsx download" helper.
 *
 * Exists so the capsule-synergy components don't need a second Excel library.
 * The app already ships exceljs for the main export path (src/utils/excelExport.js,
 * ~1,600 lines); this covers the two simple cases that previously reached for
 * `xlsx` instead. Keys of the first row become the header.
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportRowsToXlsx(rows, sheetName, fileName) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  const headers = Object.keys(rows[0]);
  sheet.columns = headers.map(header => ({
    header,
    key: header,
    // Roughly fit the header plus a little slack; exceljs has no autofit.
    width: Math.min(Math.max(header.length + 4, 12), 40),
  }));

  rows.forEach(row => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    fileName
  );
}
