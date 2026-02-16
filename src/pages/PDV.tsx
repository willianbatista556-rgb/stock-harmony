import { useState, useEffect, useRef, useReducer, useCallback, useMemo } from 'react';
import { ShoppingCart, Banknote, AlertTriangle, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProdutos, Produto } from '@/hooks/useProdutos';
import { useDepositos } from '@/hooks/useDepositos';
import { useCaixaAberto } from '@/hooks/useCaixa';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// PDV architecture: types, reducer, api, hotkeys
import {
  modeLabel, modeColor,
  pdvReducer, initialPDVState,
  getTotal, getTotalPago, getRestante, getDescontoGeral, getSubtotalBruto,
  useFinalizarVenda,
  usePdvHotkeys,
  Pagamento,
} from '@/lib/pdv';

// PDV UI components
import { PDVSearch } from '@/components/pdv/PDVSearch';
import { PDVInlineInput } from '@/components/pdv/PDVInlineInput';
import { PDVItemsTable } from '@/components/pdv/PDVItemsTable';
import { PDVCartSummary } from '@/components/pdv/PDVCartSummary';
import { PDVPaymentPanel } from '@/components/pdv/PDVPaymentPanel';
import { PDVShortcutsPanel } from '@/components/pdv/PDVShortcutsPanel';
import { HotkeysHelpModal } from '@/components/pdv/HotkeysHelpModal';

export default function PDV() {
  const { data: produtos = [] } = useProdutos();
  const { data: depositos = [] } = useDepositos();
  const finalizarVenda = useFinalizarVenda();
  const navigate = useNavigate();
  const { data: caixaAberto } = useCaixaAberto();

  // ── Central state (useReducer) ──────────────────────────
  const [state, dispatch] = useReducer(pdvReducer, initialPDVState);
  const total = getTotal(state);
  const totalPago = getTotalPago(state);
  const restante = getRestante(state);
  const descontoGeral = getDescontoGeral(state);

  // ── Local UI state (not business logic) ─────────────────
  const [depositoId, setDepositoId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [paymentForm, setPaymentForm] = useState<Pagamento['forma']>('dinheiro');
  const [paymentValue, setPaymentValue] = useState('');
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── Refs ────────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-select first deposit ───────────────────────────
  useEffect(() => {
    if (depositos.length > 0 && !depositoId) setDepositoId(depositos[0].id);
  }, [depositos, depositoId]);

  // ── Auto-focus search on mount ──────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      searchInputRef.current?.focus();
      dispatch({ type: 'SET_MODE', mode: 'search' });
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // ── Client-side product search ──────────────────────────
  useEffect(() => {
    if (state.mode === 'search' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const results = produtos.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.ean && p.ean.toLowerCase().includes(q))
      ).slice(0, 10);
      setSearchResults(results);
      setSearchSelectedIndex(0);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, produtos, state.mode]);

  // ── Focus management per mode ───────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (state.mode === 'search' || state.mode === 'normal') searchInputRef.current?.focus();
      else if (state.mode === 'quantity' || state.mode === 'discount') inputRef.current?.focus();
      else if (state.mode === 'payment') paymentInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [state.mode]);

  // ── Payment handlers ────────────────────────────────────
  const handleAddPayment = useCallback(() => {
    const val = parseFloat(paymentValue);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    const troco = paymentForm === 'dinheiro' && val > restante ? val - restante : 0;
    const pagamento: Pagamento = { forma: paymentForm, valor: val, troco };
    dispatch({ type: 'ADD_PAGAMENTO', pagamento });
    setPaymentValue('');

    if (totalPago + val >= total) {
      handleFinalize([...state.pagamentos, pagamento]);
    }
  }, [paymentValue, paymentForm, restante, totalPago, total, state.pagamentos]);

  const handleFinalize = useCallback(async (allPagamentos?: Pagamento[]) => {
    const pags = allPagamentos || state.pagamentos;
    if (!depositoId) { toast.error('Selecione um depósito'); return; }
    if (pags.length === 0) { toast.error('Adicione pelo menos um pagamento'); return; }

    await finalizarVenda.mutateAsync({
      items: state.items,
      pagamentos: pags,
      descontoGeral,
      depositoId,
      customer: state.customer,
      caixaId: caixaAberto?.id || null,
      subtotal: getSubtotalBruto(state),
    });
    dispatch({ type: 'CLEAR_SALE' });
  }, [state, depositoId, finalizarVenda]);

  const handleInlineConfirm = useCallback(() => {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && state.selectedIndex >= 0) {
      if (state.mode === 'quantity') dispatch({ type: 'UPDATE_QUANTITY', index: state.selectedIndex, qtd: val });
      else dispatch({ type: 'APPLY_ITEM_DISCOUNT', index: state.selectedIndex, desconto: val });
    }
    setInputValue('');
    dispatch({ type: 'SET_MODE', mode: 'normal' });
  }, [inputValue, state.selectedIndex, state.mode]);

  // ── Hotkey handlers (clean API) ─────────────────────────
  const hotkeyHandlers = useMemo(() => ({
    onHelp: () => setShowHelp(prev => !prev),
    onFocusSearch: () => {
      dispatch({ type: 'SET_MODE', mode: 'search' });
      setSearchQuery('');
      searchInputRef.current?.focus();
    },
    onFinalize: () => {
      if (state.mode === 'payment') return; // already in payment
      if (state.items.length > 0) {
        dispatch({ type: 'SET_MODE', mode: 'payment' });
        setPaymentValue(String(restante.toFixed(2)));
      }
    },
    onDiscount: () => {
      if (state.items.length > 0) {
        if (state.selectedIndex < 0) dispatch({ type: 'SET_SELECTED_INDEX', index: 0 });
        dispatch({ type: 'SET_MODE', mode: 'discount' });
        setInputValue(String(state.items[Math.max(0, state.selectedIndex)]?.desconto || 0));
      }
    },
    onQuantity: () => {
      if (state.items.length > 0) {
        if (state.selectedIndex < 0) dispatch({ type: 'SET_SELECTED_INDEX', index: 0 });
        dispatch({ type: 'SET_MODE', mode: 'quantity' });
        setInputValue(String(state.items[Math.max(0, state.selectedIndex)]?.qtd || 1));
      }
    },
    onCustomer: () => {
      toast.info('Busca de cliente será implementada em breve');
    },
    onCancel: () => {
      if (state.mode === 'payment') { dispatch({ type: 'SET_MODE', mode: 'normal' }); setPaymentValue(''); }
      else if (state.mode === 'quantity' || state.mode === 'discount') { dispatch({ type: 'SET_MODE', mode: 'normal' }); setInputValue(''); }
      else if (state.mode === 'search') { dispatch({ type: 'SET_MODE', mode: 'normal' }); setSearchQuery(''); }
      else if (state.items.length > 0) { setShowConfirmCancel(true); }
    },
    onRemoveItem: () => {
      if (state.items.length > 0 && state.selectedIndex >= 0) {
        dispatch({ type: 'REMOVE_ITEM', index: state.selectedIndex });
      }
    },
    onArrowUp: () => {
      if (state.mode === 'search') {
        setSearchSelectedIndex(i => Math.max(i - 1, 0));
      } else {
        dispatch({ type: 'SET_SELECTED_INDEX', index: Math.max(state.selectedIndex - 1, 0) });
      }
    },
    onArrowDown: () => {
      if (state.mode === 'search') {
        setSearchSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
      } else {
        dispatch({ type: 'SET_SELECTED_INDEX', index: Math.min(state.selectedIndex + 1, state.items.length - 1) });
      }
    },
    onEnter: () => {
      if (state.mode === 'search' && searchResults.length > 0) {
        dispatch({ type: 'ADD_ITEM', produto: searchResults[searchSelectedIndex], keepSearchMode: true });
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    },
  }), [state, restante, searchResults, searchSelectedIndex]);

  usePdvHotkeys(hotkeyHandlers);

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col z-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-display font-bold text-foreground tracking-tight">PDV</h1>
          <Badge className={cn('text-xs px-3 py-1 font-mono font-bold tracking-wider', modeColor[state.mode])}>
            {modeLabel[state.mode]}
          </Badge>
          {!caixaAberto && (
            <div className="flex items-center gap-1.5 text-warning text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Sem caixa</span>
              <Link to="/caixa" className="underline font-bold hover:text-warning/80">Abrir</Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Select value={depositoId} onValueChange={setDepositoId}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder="Depósito" />
            </SelectTrigger>
            <SelectContent>
              {depositos.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground gap-1.5">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main: 60/40 split */}
      <div className="flex-1 flex min-h-0">
        {/* Left — Search + Cart */}
        <div className="flex-[3] flex flex-col border-r border-border min-h-0">
          <div className="p-3 border-b border-border/50">
            <PDVSearch
              ref={searchInputRef}
              query={searchQuery}
              onQueryChange={q => {
                setSearchQuery(q);
                if (state.mode !== 'search') dispatch({ type: 'SET_MODE', mode: 'search' });
              }}
              onFocus={() => dispatch({ type: 'SET_MODE', mode: 'search' })}
              onClear={() => { setSearchQuery(''); dispatch({ type: 'SET_MODE', mode: 'normal' }); }}
              isSearchMode={state.mode === 'search'}
              results={searchResults}
              selectedIndex={searchSelectedIndex}
              onSelectProduct={(produto) => {
                dispatch({ type: 'ADD_ITEM', produto, keepSearchMode: true });
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            />
          </div>

          {(state.mode === 'quantity' || state.mode === 'discount') && state.selectedIndex >= 0 && (
            <div className="px-3 pt-3">
              <PDVInlineInput
                ref={inputRef}
                mode={state.mode}
                productName={state.items[state.selectedIndex]?.produto.nome || ''}
                value={inputValue}
                onChange={setInputValue}
                onConfirm={handleInlineConfirm}
              />
            </div>
          )}

          <div className="flex-1 p-3 min-h-0">
            <PDVItemsTable
              items={state.items}
              selectedIndex={state.selectedIndex}
              onSelectIndex={(i) => dispatch({ type: 'SET_SELECTED_INDEX', index: i })}
              onRemoveItem={(i) => dispatch({ type: 'REMOVE_ITEM', index: i })}
            />
          </div>
        </div>

        {/* Right — Summary + Payment */}
        <div className="flex-[2] flex flex-col min-h-0 bg-muted/30">
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-auto">
            <PDVCartSummary items={state.items} descontoGeral={descontoGeral} total={total} />

            {state.mode === 'payment' && (
              <PDVPaymentPanel
                ref={paymentInputRef}
                paymentForm={paymentForm}
                onPaymentFormChange={setPaymentForm}
                paymentValue={paymentValue}
                onPaymentValueChange={setPaymentValue}
                onAddPayment={handleAddPayment}
                pagamentos={state.pagamentos}
                onRemovePagamento={(i) => dispatch({ type: 'REMOVE_PAGAMENTO', index: i })}
                restante={restante}
                onFinalize={() => handleFinalize()}
                isFinalizing={finalizarVenda.isPending}
              />
            )}

            {state.mode !== 'payment' && state.items.length > 0 && (
              <Button
                onClick={() => {
                  dispatch({ type: 'SET_MODE', mode: 'payment' });
                  setPaymentValue(String(restante.toFixed(2)));
                }}
                className="h-16 gradient-primary text-primary-foreground font-bold text-xl gap-3"
              >
                <Banknote className="w-6 h-6" />
                Finalizar Venda
                <kbd className="ml-2 px-2 py-0.5 rounded bg-primary-foreground/20 text-sm font-mono">F4</kbd>
              </Button>
            )}
          </div>

          <div className="border-t border-border">
            <PDVShortcutsPanel />
          </div>
        </div>
      </div>

      {/* Cancel Confirmation */}
      <Dialog open={showConfirmCancel} onOpenChange={setShowConfirmCancel}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar venda?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todos os {state.items.length} itens serão removidos. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmCancel(false)}>Voltar</Button>
            <Button variant="destructive" onClick={() => { dispatch({ type: 'CLEAR_SALE' }); setShowConfirmCancel(false); }}>
              Cancelar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotkeys Help Modal */}
      <HotkeysHelpModal open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
}
