/**
 * Receipt template for 80mm / 58mm thermal printers.
 * Generates ESC/POS bytes from sale data.
 */

import { EscPosBuilder } from './escpos';
import { PDVItem, Pagamento, PDVCustomer } from '@/lib/pdv/pdv.types';

interface ReceiptData {
  items: PDVItem[];
  pagamentos: Pagamento[];
  customer: PDVCustomer | null;
  subtotal: number;
  desconto: number;
  total: number;
  isBudget?: boolean;
  empresaNome?: string;
  terminalNome?: string;
  operador?: string;
}

const COLS = 48; // 80mm standard (58mm = 32 cols, but wraps gracefully)

const formaLabel: Record<string, string> = {
  dinheiro: 'Dinheiro',
  credito: 'Credito',
  debito: 'Debito',
  pix: 'Pix',
};

function currency(val: number): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const b = new EscPosBuilder();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  b.init();

  // ── Header ──────────────────────────────────────────────
  b.align('center');
  b.bold().double();
  b.line(data.isBudget ? 'ORCAMENTO' : 'CUPOM NAO FISCAL');
  b.double(false).bold(false);
  if (data.empresaNome) b.line(data.empresaNome);
  b.line(`${dateStr}  ${timeStr}`);
  if (data.terminalNome) b.line(`Terminal: ${data.terminalNome}`);
  if (data.operador) b.line(`Operador: ${data.operador}`);
  b.align('left');
  b.separator();

  // ── Customer ────────────────────────────────────────────
  if (data.customer) {
    b.line(`Cliente: ${data.customer.nome}`);
    if (data.customer.cpf_cnpj) b.line(`CPF/CNPJ: ${data.customer.cpf_cnpj}`);
    b.separator();
  }

  // ── Items ───────────────────────────────────────────────
  b.bold();
  b.columns('ITEM', 'TOTAL', COLS);
  b.bold(false);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const nome = `${i + 1}. ${item.produto.nome}`.substring(0, COLS - 12);
    b.line(nome);
    const detail = `  ${item.qtd}x ${currency(item.preco_unit)}`;
    const subtStr = currency(item.subtotal);
    b.columns(detail, subtStr, COLS);
    if (item.desconto > 0) {
      b.columns('  Desc.:', `-${currency(item.desconto)}`, COLS);
    }
  }

  b.separator();

  // ── Totals ──────────────────────────────────────────────
  b.columns('Subtotal:', currency(data.subtotal), COLS);
  if (data.desconto > 0) {
    b.columns('Desconto:', `-${currency(data.desconto)}`, COLS);
  }
  b.bold();
  b.double();
  b.columns('TOTAL:', `R$ ${currency(data.total)}`, COLS);
  b.double(false);
  b.bold(false);

  // ── Payments ────────────────────────────────────────────
  if (data.pagamentos.length > 0) {
    b.separator();
    b.bold().line('PAGAMENTOS:').bold(false);
    for (const p of data.pagamentos) {
      const label = formaLabel[p.forma] || p.forma;
      let val = `R$ ${currency(p.valor)}`;
      if (p.troco && p.troco > 0) {
        val += ` (troco: ${currency(p.troco)})`;
      }
      b.columns(label, val, COLS);
    }
  }

  // ── Footer ──────────────────────────────────────────────
  b.separator();
  b.align('center');
  if (data.isBudget) {
    b.line('Este documento e apenas um orcamento');
    b.line('e nao possui valor fiscal.');
  }
  b.line('Obrigado pela preferencia!');
  b.feed(1);
  b.cut();

  return b.build();
}
