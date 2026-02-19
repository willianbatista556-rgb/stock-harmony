import { Produto } from '@/hooks/useProdutos';
import type { ReceiptData } from '@/lib/print/types';

export interface PDVItem {
  id: string;
  produto: Produto;
  qtd: number;
  preco_unit: number;
  desconto: number;
  subtotal: number;
}

export interface Pagamento {
  forma: 'dinheiro' | 'credito' | 'debito' | 'pix';
  valor: number;
  troco?: number;
}

export interface PDVCustomer {
  id: string;
  nome: string;
  cpf_cnpj?: string;
}

export interface PDVDiscount {
  tipo: 'valor' | 'percentual';
  valor: number;
}

export type PDVMode = 'normal' | 'search' | 'quantity' | 'payment' | 'discount';

export type PDVModal = 'customer' | 'discount' | 'hotkeys' | 'sangria' | 'suprimento' | null;

export interface PDVConfig {
  bloquearSemEstoque: boolean;
  permitirNegativo: boolean;
  printerCodepage: string;
  printerBaudrate: number;
}

export interface PDVState {
  items: PDVItem[];
  selectedIndex: number;
  mode: PDVMode;
  modal: PDVModal;
  customer: PDVCustomer | null;
  discount: PDVDiscount;
  pagamentos: Pagamento[];
  idCounter: number;
  config: PDVConfig | null;
  lastReceipt: ReceiptData | null;
  localId: string | null;
}

export const modeLabel: Record<PDVMode, string> = {
  normal: 'PRONTO',
  search: 'BUSCA',
  quantity: 'QUANTIDADE',
  discount: 'DESCONTO',
  payment: 'PAGAMENTO',
};

export const modeColor: Record<PDVMode, string> = {
  normal: 'bg-success text-success-foreground',
  search: 'bg-primary text-primary-foreground',
  quantity: 'bg-warning text-warning-foreground',
  discount: 'bg-accent text-accent-foreground',
  payment: 'bg-success text-success-foreground',
};
