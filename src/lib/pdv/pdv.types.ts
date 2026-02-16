import { Produto } from '@/hooks/useProdutos';

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

export type PDVMode = 'normal' | 'search' | 'quantity' | 'payment' | 'discount';

export interface PDVState {
  items: PDVItem[];
  selectedIndex: number;
  mode: PDVMode;
  pagamentos: Pagamento[];
  descontoGeral: number;
  idCounter: number;
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
