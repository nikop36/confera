import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';

function primitiveCellToString(value: unknown): string | null {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

function richTextCellToString(value: object): string | null {
  if (!('richText' in value)) return null;
  return (value.richText as Array<{ text: string }>)
    .map((entry) => entry.text)
    .join('')
    .trim();
}

function formulaResultToString(value: object): string | null {
  if (!('result' in value)) return null;
  return primitiveCellToString(value.result) ?? '';
}

function cellToString(value: ExcelJS.CellValue): string {
  const primitive = primitiveCellToString(value);
  if (primitive !== null) return primitive;
  if (typeof value !== 'object') return '';

  const richText = richTextCellToString(value);
  if (richText !== null) return richText;

  const formulaResult = formulaResultToString(value);
  if (formulaResult !== null) return formulaResult;

  return '';
}

export async function parseExcel(
  buffer: Buffer,
): Promise<Record<string, unknown>[]> {
  try {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('The Excel file is empty');

    const rows: Record<string, unknown>[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row is headers
        row.eachCell((cell) => {
          headers.push(cellToString(cell.value));
        });
        return;
      }

      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) rowData[header] = cellToString(cell.value);
      });
      rows.push(rowData);
    });

    return rows;
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException('The Excel file is not valid');
  }
}

export async function buildExcel(
  data: Record<string, unknown>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Profil');

  const headers = Object.keys(data);
  worksheet.addRow(headers);

  // Flatten arrays to pipe-separated strings
  const values = headers.map((key) => {
    const value = data[key];
    return Array.isArray(value) ? value.join('|') : value;
  });
  worksheet.addRow(values);

  // Auto-width columns
  worksheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildExcelMany(
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Registrations');

  if (rows.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  const headers = Object.keys(rows[0]);
  worksheet.addRow(headers);
  worksheet.columns.forEach((col) => {
    col.width = 20;
  });

  for (const row of rows) {
    const values = headers.map((key) => {
      const v = row[key];
      return Array.isArray(v) ? v.join('|') : v;
    });
    worksheet.addRow(values);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
