import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { BadRequestException } from '@nestjs/common';

export function parseCsv(buffer: Buffer): Record<string, unknown>[] {
  try {
    return parse(buffer, {
      columns: true, // first row is header
      skip_empty_lines: true,
      trim: true,
      bom: true, // handle Excel-exported CSVs with BOM
    });
  } catch {
    throw new BadRequestException('The CSV file is invalid');
  }
}

export function buildCsv(data: Record<string, unknown>): Buffer {
  const row = flattenForExport(data);
  const csv = stringify([row], { header: true });
  return Buffer.from(csv, 'utf-8');
}

// Converts arrays to pipe-separated strings for CSV export
function flattenForExport(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = Array.isArray(value) ? value.join('|') : value;
  }
  return result;
}
