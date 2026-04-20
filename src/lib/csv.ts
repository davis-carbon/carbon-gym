/**
 * Client-side CSV export helper.
 * Converts an array of records to CSV and triggers a browser download.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (value instanceof Date) str = value.toISOString();
  else if (typeof value === "object") str = JSON.stringify(value);
  else str = String(value);
  // Quote if contains comma, quote, newline, or leading/trailing whitespace
  if (/[",\n\r]/.test(str) || /^\s|\s$/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T & string; header: string }>,
): string {
  const headerRow = columns.map((c) => escapeCell(c.header)).join(",");
  const dataRows = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: Array<{ key: keyof T & string; header: string }>,
) {
  const csv = rowsToCsv(rows, columns);
  // Prepend UTF-8 BOM so Excel recognizes encoding
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamped = filename.includes(".csv")
    ? filename
    : `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  link.href = url;
  link.download = stamped;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
