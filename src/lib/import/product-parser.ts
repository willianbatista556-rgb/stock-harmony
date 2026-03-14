/**
 * CSV/XLSX parser for product import.
 * Handles quoted fields, locale-aware numbers, and dynamic column mapping.
 */
import * as XLSX from 'xlsx';

export interface ParsedProduct {
  nome: string;
  sku: string | null;
  ean: string | null;
  marca: string | null;
  unidade: string | null;
  custo_medio: number | null;
  preco_venda: number | null;
  estoque_min: number | null;
  tamanho: string | null;
  cor: string | null;
  _rowIndex: number;
  _errors: string[];
}

// Expected column names (normalized, no accents)
const FIELD_ALIASES: Record<string, string[]> = {
  nome: ['nome', 'produto', 'descricao', 'description', 'name', 'item'],
  sku: ['sku', 'codigo', 'code', 'cod', 'referencia', 'ref'],
  ean: ['ean', 'ean13', 'gtin', 'codigo_barras', 'barcode', 'cod_barras'],
  marca: ['marca', 'brand', 'fabricante'],
  unidade: ['unidade', 'un', 'unit', 'und'],
  custo_medio: ['custo', 'custo_medio', 'preco_custo', 'cost', 'custo_unitario'],
  preco_venda: ['preco', 'preco_venda', 'valor', 'price', 'venda'],
  estoque_min: ['estoque_min', 'estoque_minimo', 'min_stock', 'minimo'],
  tamanho: ['tamanho', 'tam', 'size'],
  cor: ['cor', 'color', 'colour'],
};

function normalizeHeader(header: any): string {
  if (!header) return '';
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]/g, '_')     // Non-alphanumeric to underscore
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;

  let cleaned = String(value).replace(/\s/g, '').replace(/[R$€$]/g, '');

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  if (lastDot > lastComma) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const normalized = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (let i = 0; i < normalized.length; i++) {
      if (aliases.some(alias => normalized[i].includes(alias))) {
        map[field] = i;
        break;
      }
    }
  }

  return map;
}

function getCell(row: any[], colMap: Record<string, number>, field: string): any {
  const idx = colMap[field];
  if (idx === undefined) return null;
  const val = row[idx];
  if (val === undefined || val === null) return null;
  return String(val).trim() || null;
}

export function parseFile(file: File): Promise<{ headers: string[]; rows: any[][]; }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

        if (json.length < 2) {
          reject(new Error('Arquivo vazio ou sem dados suficientes.'));
          return;
        }

        // Find header row (first row with 3+ non-empty cells)
        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, json.length); i++) {
          const nonEmpty = json[i].filter(c => c !== '').length;
          if (nonEmpty >= 3) { headerIdx = i; break; }
        }

        const headers = json[headerIdx].map(String);
        const rows = json.slice(headerIdx + 1).filter(row =>
          row.some(cell => cell !== '')
        );

        resolve({ headers, rows });
      } catch (err) {
        reject(new Error('Erro ao ler o arquivo. Verifique o formato.'));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}

export function mapRowsToProducts(
  headers: string[],
  rows: any[][],
  customMap?: Record<string, number>
): ParsedProduct[] {
  const colMap = customMap || buildColumnMap(headers);

  return rows.map((row, idx) => {
    const errors: string[] = [];
    const nome = getCell(row, colMap, 'nome');

    if (!nome) errors.push('Nome obrigatório');

    return {
      nome: nome || `Produto ${idx + 1}`,
      sku: getCell(row, colMap, 'sku'),
      ean: getCell(row, colMap, 'ean'),
      marca: getCell(row, colMap, 'marca'),
      unidade: getCell(row, colMap, 'unidade') || 'UN',
      custo_medio: parseNumericValue(getCell(row, colMap, 'custo_medio')),
      preco_venda: parseNumericValue(getCell(row, colMap, 'preco_venda')),
      estoque_min: parseNumericValue(getCell(row, colMap, 'estoque_min')),
      tamanho: getCell(row, colMap, 'tamanho'),
      cor: getCell(row, colMap, 'cor'),
      _rowIndex: idx + 1,
      _errors: errors,
    };
  });
}

export function autoDetectColumnMap(headers: string[]): Record<string, number> {
  return buildColumnMap(headers);
}
