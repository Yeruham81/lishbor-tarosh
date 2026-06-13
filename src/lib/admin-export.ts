// Client-only helpers for downloading data exports
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function ts() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function downloadCSV(rows: any[], filename: string) {
  const csv = Papa.unparse(rows ?? []);
  // Prepend BOM for Hebrew/UTF-8 in Excel
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, `${filename}-${ts()}.csv`);
}

export function downloadXLSX(sheets: Record<string, any[]>, filename: string) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows ?? []);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  saveAs(new Blob([out], { type: "application/octet-stream" }), `${filename}-${ts()}.xlsx`);
}

export async function parseFile(file: File): Promise<any[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data as any[]),
        error: reject,
      });
    });
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
}
