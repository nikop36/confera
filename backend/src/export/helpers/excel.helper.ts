import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';

export async function parseExcel(
  buffer: Buffer,
): Promise<Record<string, unknown>[]> {
  function cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim();
    }
    if (value instanceof Date) return value.toISOString();
    // ExcelJS rich text object
    if (typeof value === 'object' && 'richText' in value) {
      return (value.richText as Array<{ text: string }>)
        .map((r) => r.text)
        .join('')
        .trim();
    }
    // Formula result
    if (typeof value === 'object' && 'result' in value) {
      const result = value.result;
      if (result === null || result === undefined) return '';
      if (typeof result === 'string') return result.trim();
      if (typeof result === 'number' || typeof result === 'boolean') {
        return String(result).trim();
      }
      if (result instanceof Date) return result.toISOString();
      return '';
    }
    return '';
  }

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
