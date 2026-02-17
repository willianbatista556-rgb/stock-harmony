/**
 * Receipt template for 80mm / 58mm thermal printers.
 * Uses the simplified EscPosBuilder API and ReceiptData types.
 */

import { EscPosBuilder } from './escpos';
import { ReceiptData } from './types';

const COLS = 42; // 80mm standard

function currency(val: number): string {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function columns(left: string, right: string, cols = COLS): string {
  const pad = cols - left.length - right.length;
  return left + ' '.repeat(Math.max(1, pad)) + right;
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const b = new EscPosBuilder();
  const date = new Date(data.dataIso);
  const dateStr = date.toLocaleDateString('pt-BR');
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  b.init();

  // ── Header ──────────────────────────────────────────────
  b.alignCenter();
  b.bold(true).sizeDouble();
  b.line('CUPOM NAO FISCAL');
  b.sizeNormal().bold(false);
  if (data.empresaNome) b.line(data.empresaNome);
  if (data.cnpj) b.line(`CNPJ: ${data.cnpj}`);
  if (data.endereco) b.line(data.endereco);
  if (data.telefone) b.line(`Tel: ${data.telefone}`);
  b.line(`${dateStr}  ${timeStr}`);
  b.line(`Venda: ${data.vendaId}`);
  b.alignLeft();
  b.hr();

  // ── Customer ────────────────────────────────────────────
  if (data.clienteNome) {
    b.line(`Cliente: ${data.clienteNome}`);
    b.hr();
  }

  // ── Items ───────────────────────────────────────────────
  b.bold(true);
  b.line(columns('ITEM', 'TOTAL'));
  b.bold(false);

  for (let i = 0; i < data.itens.length; i++) {
    const item = data.itens[i];
    const nome = `${i + 1}. ${item.nome}`.substring(0, COLS - 12);
    b.line(nome);
    const detail = `  ${item.qtd}x ${currency(item.preco)}`;
    b.line(columns(detail, currency(item.subtotal)));
  }

  b.hr();

  // ── Totals ──────────────────────────────────────────────
  b.line(columns('Subtotal:', currency(data.subtotal)));
  if (data.desconto > 0) {
    b.line(columns('Desconto:', `-${currency(data.desconto)}`));
  }
  b.bold(true).sizeDouble();
  b.line(columns('TOTAL:', `R$ ${currency(data.total)}`));
  b.sizeNormal().bold(false);

  // ── Payments ────────────────────────────────────────────
  if (data.pagamentos.length > 0) {
    b.hr();
    b.bold(true).line('PAGAMENTOS:').bold(false);
    for (const p of data.pagamentos) {
      b.line(columns(p.metodo, `R$ ${currency(p.valor)}`));
    }
  }

  // ── Footer ──────────────────────────────────────────────
  b.hr();
  b.alignCenter();
  if (data.footer) {
    b.line(data.footer);
  } else {
    b.line('Obrigado pela preferencia!');
  }
  b.feed(2);
  b.cut();

  return b.build();
}
