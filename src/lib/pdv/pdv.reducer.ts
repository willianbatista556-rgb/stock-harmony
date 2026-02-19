import { Produto } from '@/hooks/useProdutos';
import type { ReceiptData } from '@/lib/print/types';
import { PDVState, PDVItem, Pagamento, PDVMode, PDVCustomer, PDVDiscount, PDVModal, PDVConfig } from './pdv.types';

// ── Action types ──────────────────────────────────────────────
export type PDVAction =
  | { type: 'ADD_ITEM'; produto: Produto; keepSearchMode?: boolean }
  | { type: 'REMOVE_ITEM'; index: number }
  | { type: 'UPDATE_QUANTITY'; index: number; qtd: number }
  | { type: 'APPLY_ITEM_DISCOUNT'; index: number; desconto: number }
  | { type: 'SET_SELECTED_INDEX'; index: number }
  | { type: 'SET_MODE'; mode: PDVMode }
  | { type: 'SET_CUSTOMER'; customer: PDVCustomer | null }
  | { type: 'SET_DISCOUNT'; discount: PDVDiscount }
  | { type: 'ADD_PAGAMENTO'; pagamento: Pagamento }
  | { type: 'REMOVE_PAGAMENTO'; index: number }
  | { type: 'SET_MODAL'; modal: PDVModal }
  | { type: 'SET_CONFIG'; bloquearSemEstoque: boolean; permitirNegativo: boolean; printerCodepage?: string; printerBaudrate?: number }
  | { type: 'SET_LAST_RECEIPT'; receipt: ReceiptData | null }
  | { type: 'SET_LOCAL_ID'; localId: string }
  | { type: 'CLEAR_SALE' };

// ── Initial state ─────────────────────────────────────────────
export const initialPDVState: PDVState = {
  items: [],
  selectedIndex: -1,
  mode: 'normal',
  modal: null,
  customer: null,
  discount: { tipo: 'valor', valor: 0 },
  pagamentos: [],
  idCounter: 0,
  config: null,
  lastReceipt: null,
  localId: null,
};

// ── Helper: recalculate subtotal ──────────────────────────────
function calcSubtotal(item: PDVItem): number {
  return item.qtd * item.preco_unit - item.desconto;
}

// ── Reducer ───────────────────────────────────────────────────
export function pdvReducer(state: PDVState, action: PDVAction): PDVState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.produto.id === action.produto.id);
      if (existing) {
        const items = state.items.map(i =>
          i.produto.id === action.produto.id
            ? { ...i, qtd: i.qtd + 1, subtotal: (i.qtd + 1) * i.preco_unit - i.desconto }
            : i
        );
        return {
          ...state,
          items,
          mode: action.keepSearchMode ? state.mode : 'normal',
        };
      }
      const newId = state.idCounter + 1;
      const newItem: PDVItem = {
        id: `pdv-${newId}`,
        produto: action.produto,
        qtd: 1,
        preco_unit: action.produto.preco_venda || 0,
        desconto: 0,
        subtotal: action.produto.preco_venda || 0,
      };
      return {
        ...state,
        items: [...state.items, newItem],
        selectedIndex: state.items.length,
        idCounter: newId,
        mode: action.keepSearchMode ? state.mode : 'normal',
      };
    }

    case 'REMOVE_ITEM': {
      const items = state.items.filter((_, i) => i !== action.index);
      return {
        ...state,
        items,
        selectedIndex: Math.min(Math.max(0, state.selectedIndex - (action.index <= state.selectedIndex ? 1 : 0)), items.length - 1),
      };
    }

    case 'UPDATE_QUANTITY': {
      if (action.qtd <= 0) {
        return pdvReducer(state, { type: 'REMOVE_ITEM', index: action.index });
      }
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.index
            ? { ...item, qtd: action.qtd, subtotal: calcSubtotal({ ...item, qtd: action.qtd }) }
            : item
        ),
      };
    }

    case 'APPLY_ITEM_DISCOUNT': {
      return {
        ...state,
        items: state.items.map((item, i) =>
          i === action.index
            ? { ...item, desconto: action.desconto, subtotal: calcSubtotal({ ...item, desconto: action.desconto }) }
            : item
        ),
      };
    }

    case 'SET_SELECTED_INDEX':
      return { ...state, selectedIndex: action.index };

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_CUSTOMER':
      return { ...state, customer: action.customer };

    case 'SET_DISCOUNT':
      return { ...state, discount: action.discount };

    case 'ADD_PAGAMENTO':
      return { ...state, pagamentos: [...state.pagamentos, action.pagamento] };

    case 'REMOVE_PAGAMENTO':
      return { ...state, pagamentos: state.pagamentos.filter((_, i) => i !== action.index) };

    case 'SET_MODAL':
      return { ...state, modal: action.modal };

    case 'SET_CONFIG':
      return { ...state, config: { bloquearSemEstoque: action.bloquearSemEstoque, permitirNegativo: action.permitirNegativo, printerCodepage: action.printerCodepage ?? 'utf8', printerBaudrate: action.printerBaudrate ?? 9600 } };

    case 'SET_LAST_RECEIPT':
      return { ...state, lastReceipt: action.receipt };

    case 'SET_LOCAL_ID':
      return { ...state, localId: action.localId };

    case 'CLEAR_SALE':
      return { ...initialPDVState, config: state.config, lastReceipt: state.lastReceipt, localId: state.localId };

    default:
      return state;
  }
}

// ── Computed selectors ────────────────────────────────────────
export function getSubtotalBruto(state: PDVState): number {
  return state.items.reduce((sum, item) => sum + item.subtotal, 0);
}

export function getDescontoGeral(state: PDVState): number {
  const subtotal = getSubtotalBruto(state);
  if (state.discount.tipo === 'percentual') {
    return subtotal * (state.discount.valor / 100);
  }
  return state.discount.valor;
}

export function getTotal(state: PDVState): number {
  return Math.max(0, getSubtotalBruto(state) - getDescontoGeral(state));
}

export function getTotalPago(state: PDVState): number {
  return state.pagamentos.reduce((sum, p) => sum + p.valor, 0);
}

export function getRestante(state: PDVState): number {
  return Math.max(0, getTotal(state) - getTotalPago(state));
}
