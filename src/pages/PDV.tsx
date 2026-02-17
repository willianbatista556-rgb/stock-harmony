import { useState, useEffect, useRef, useReducer, useCallback, useMemo } from 'react';
import { ShoppingCart, Banknote, AlertTriangle, LogOut, User, FileText, Landmark, ArrowDownUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProdutos, Produto } from '@/hooks/useProdutos';
import {
  useTerminalByIdentificador, useCreateTerminal, useTerminais,
  getOrCreateTerminalIdentificador, Terminal,
} from '@/hooks/useTerminais';
import { useDepositos } from '@/hooks/useDepositos';
import { useCaixaAbertoPorTerminal } from '@/hooks/useCaixa';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// PDV architecture
import {
  modeLabel, modeColor,
  pdvReducer, initialPDVState,
  getTotal, getTotalPago, getRestante, getDescontoGeral, getSubtotalBruto,
  useFinalizarVenda,
  usePdvHotkeys,
  Pagamento, PDVDiscount,
} from '@/lib/pdv';
import { useSalvarOrcamento } from '@/lib/pdv/pdv.api';
import { ensureClienteBalcao } from '@/lib/pdv/pdv.customers.api';
import { criarMovimentacaoCaixa } from '@/lib/pdv/pdv.caixa.api';

// PDV UI components
import { PDVSearch } from '@/components/pdv/PDVSearch';
import { PDVInlineInput } from '@/components/pdv/PDVInlineInput';
import { PDVItemsTable } from '@/components/pdv/PDVItemsTable';
import { PDVCartSummary } from '@/components/pdv/PDVCartSummary';
import { PDVPaymentPanel } from '@/components/pdv/PDVPaymentPanel';
import { PDVShortcutsPanel } from '@/components/pdv/PDVShortcutsPanel';
import { HotkeysHelpModal } from '@/components/pdv/HotkeysHelpModal';
import { CustomerModal } from '@/components/pdv/CustomerModal';
import { DiscountModal } from '@/components/pdv/DiscountModal';
import { ReceiptModal } from '@/components/pdv/ReceiptModal';
import { CaixaMovModal } from '@/components/pdv/CaixaMovModal';

export default function PDV() {
  const navigate = useNavigate();
  const { user, profile, userRole, loading: authLoading } = useAuth();
  const { data: produtos = [] } = useProdutos();
  const { data: depositos = [] } = useDepositos();
  const finalizarVenda = useFinalizarVenda();
  const salvarOrcamento = useSalvarOrcamento();

  // ── Auto-register terminal via identificador ───────────────
  const terminalIdentificador = useMemo(() => getOrCreateTerminalIdentificador(), []);
  const { data: terminalByIdent, isLoading: identLoading } = useTerminalByIdentificador(terminalIdentificador);
  const createTerminal = useCreateTerminal();
  const { data: terminais = [] } = useTerminais();

  // Auto-create terminal if not found + ensure cliente balcão
  const [autoCreated, setAutoCreated] = useState(false);
  useEffect(() => {
    if (identLoading || autoCreated || terminalByIdent) return;
    if (!profile?.empresa_id || depositos.length === 0) return;
    createTerminal.mutate(
      { nome: 'Terminal PDV', depositoId: depositos[0].id, identificador: terminalIdentificador },
      {
        onSuccess: () => {
          setAutoCreated(true);
          ensureClienteBalcao(profile.empresa_id!).then((balcId) => {
            dispatch({ type: 'SET_CUSTOMER', customer: { id: balcId, nome: 'CLIENTE BALCAO' } });
          }).catch(() => {});
        },
      }
    );
  }, [identLoading, terminalByIdent, autoCreated, profile?.empresa_id, depositos, terminalIdentificador]);

  // When terminal already exists, ensure cliente balcão on first load
  const [balcaoLoaded, setBalcaoLoaded] = useState(false);
  useEffect(() => {
    if (!terminalByIdent || balcaoLoaded || !profile?.empresa_id) return;
    setBalcaoLoaded(true);
    ensureClienteBalcao(profile.empresa_id).then((balcId) => {
      dispatch({ type: 'SET_CUSTOMER', customer: { id: balcId, nome: 'CLIENTE BALCAO' } });
    }).catch(() => {});
  }, [terminalByIdent, balcaoLoaded, profile?.empresa_id]);

  const terminal: Terminal | null = terminalByIdent || null;
  const depositoId = terminal?.deposito_id || '';

  // ── Local UI state ──────────────────────────────────────
  const [budgetMode, setBudgetMode] = useState(false);
  const canBudget = userRole?.role === 'Admin' || userRole?.role === 'Gerente';

  // Caixa lookup: per terminal
  const { data: caixaAberto, isLoading: caixaLoading } = useCaixaAbertoPorTerminal(terminal?.id);

  // ── Central state (useReducer) ──────────────────────────
  const [state, dispatch] = useReducer(pdvReducer, initialPDVState);
  const total = getTotal(state);
  const totalPago = getTotalPago(state);
  const restante = getRestante(state);
  const descontoGeral = getDescontoGeral(state);
  const subtotalBruto = getSubtotalBruto(state);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [paymentForm, setPaymentForm] = useState<Pagamento['forma']>('dinheiro');
  const [paymentValue, setPaymentValue] = useState('');
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<{
    items: typeof state.items;
    pagamentos: Pagamento[];
    customer: typeof state.customer;
    subtotal: number;
    desconto: number;
    total: number;
    isBudget?: boolean;
  } | null>(null);

  // ── Refs ────────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

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

  // ── Handlers ────────────────────────────────────────────
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
    if (!depositoId) { toast.error('Terminal sem depósito vinculado'); return; }
    if (pags.length === 0) { toast.error('Adicione pelo menos um pagamento'); return; }

    const saleData = {
      items: [...state.items],
      pagamentos: pags,
      customer: state.customer,
      subtotal: subtotalBruto,
      desconto: descontoGeral,
      total,
    };

    await finalizarVenda.mutateAsync({
      items: state.items,
      pagamentos: pags,
      descontoGeral,
      depositoId,
      customer: state.customer,
      caixaId: caixaAberto?.id || null,
      subtotal: subtotalBruto,
    });

    setLastSale(saleData);
    setShowReceipt(true);
    dispatch({ type: 'CLEAR_SALE' });
  }, [state, depositoId, finalizarVenda, subtotalBruto, descontoGeral, total, caixaAberto]);

  const handleSaveBudget = useCallback(async () => {
    if (state.items.length === 0) { toast.error('Adicione itens ao orçamento'); return; }

    const saleData = {
      items: [...state.items],
      pagamentos: [] as Pagamento[],
      customer: state.customer,
      subtotal: subtotalBruto,
      desconto: descontoGeral,
      total,
      isBudget: true,
    };

    await salvarOrcamento.mutateAsync({
      items: state.items,
      descontoGeral,
      customer: state.customer,
      subtotal: subtotalBruto,
      total,
    });

    setLastSale(saleData);
    setShowReceipt(true);
    dispatch({ type: 'CLEAR_SALE' });
  }, [state, salvarOrcamento, subtotalBruto, descontoGeral, total]);

  const handleInlineConfirm = useCallback(() => {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && state.selectedIndex >= 0) {
      if (state.mode === 'quantity') dispatch({ type: 'UPDATE_QUANTITY', index: state.selectedIndex, qtd: val });
      else dispatch({ type: 'APPLY_ITEM_DISCOUNT', index: state.selectedIndex, desconto: val });
    }
    setInputValue('');
    dispatch({ type: 'SET_MODE', mode: 'normal' });
  }, [inputValue, state.selectedIndex, state.mode]);

  // ── Hotkey handlers ─────────────────────────────────────
  const hotkeyHandlers = useMemo(() => ({
    onHelp: () => dispatch({ type: 'SET_MODAL', modal: state.modal === 'hotkeys' ? null : 'hotkeys' }),
    onFocusSearch: () => {
      dispatch({ type: 'SET_MODE', mode: 'search' });
      setSearchQuery('');
      searchInputRef.current?.focus();
    },
    onFinalize: () => {
      if (state.mode === 'payment') return;
      if (state.items.length > 0) {
        dispatch({ type: 'SET_MODE', mode: 'payment' });
        setPaymentValue(String(restante.toFixed(2)));
      }
    },
    onDiscount: () => {
      if (state.items.length > 0) {
        dispatch({ type: 'SET_MODAL', modal: 'discount' });
      }
    },
    onQuantity: () => {
      if (state.items.length > 0) {
        if (state.selectedIndex < 0) dispatch({ type: 'SET_SELECTED_INDEX', index: 0 });
        dispatch({ type: 'SET_MODE', mode: 'quantity' });
        setInputValue(String(state.items[Math.max(0, state.selectedIndex)]?.qtd || 1));
      }
    },
    onCustomer: () => dispatch({ type: 'SET_MODAL', modal: 'customer' }),
    onSuprimento: () => { if (caixaAberto && !budgetMode) dispatch({ type: 'SET_MODAL', modal: 'suprimento' }); },
    onSangria: () => { if (caixaAberto && !budgetMode) dispatch({ type: 'SET_MODAL', modal: 'sangria' }); },
    onCancel: () => {
      if (state.modal) {
        dispatch({ type: 'SET_MODAL', modal: null });
      } else if (state.mode === 'payment') {
        dispatch({ type: 'SET_MODE', mode: 'normal' });
        setPaymentValue('');
      } else if (state.mode === 'quantity' || state.mode === 'discount') {
        dispatch({ type: 'SET_MODE', mode: 'normal' });
        setInputValue('');
      } else if (state.mode === 'search') {
        dispatch({ type: 'SET_MODE', mode: 'normal' });
        setSearchQuery('');
      } else if (state.items.length > 0) {
        setShowConfirmCancel(true);
      }
    },
    onRemoveItem: () => {
      if (state.items.length > 0 && state.selectedIndex >= 0) {
        dispatch({ type: 'REMOVE_ITEM', index: state.selectedIndex });
      }
    },
    onArrowUp: () => {
      if (state.mode === 'search') setSearchSelectedIndex(i => Math.max(i - 1, 0));
      else dispatch({ type: 'SET_SELECTED_INDEX', index: Math.max(state.selectedIndex - 1, 0) });
    },
    onArrowDown: () => {
      if (state.mode === 'search') setSearchSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
      else dispatch({ type: 'SET_SELECTED_INDEX', index: Math.min(state.selectedIndex + 1, state.items.length - 1) });
    },
    onEnter: () => {
      if (state.mode === 'search' && searchResults.length > 0) {
        dispatch({ type: 'ADD_ITEM', produto: searchResults[searchSelectedIndex], keepSearchMode: true });
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    },
  }), [state, restante, searchResults, searchSelectedIndex, caixaAberto, budgetMode]);

  usePdvHotkeys(hotkeyHandlers);

  // ── Bootstrap Guards ────────────────────────────────────

  // 1. Loading
  if (authLoading || identLoading || createTerminal.isPending || caixaLoading) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
          <ShoppingCart className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Carregando PDV…</p>
      </div>
    );
  }

  // 2. Not authenticated
  if (!user) {
    navigate('/auth', { replace: true });
    return null;
  }

  // 3. No empresa linked
  if (!profile?.empresa_id) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">Empresa não configurada</h1>
          <p className="text-muted-foreground max-w-md">
            Seu perfil não está vinculado a nenhuma empresa. Contacte o administrador.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
          <LogOut className="w-4 h-4" />
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  // 4. No terminal found (auto-creation failed)
  if (!terminal) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Landmark className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">Terminal não encontrado</h1>
          <p className="text-muted-foreground max-w-md">
            Não foi possível registrar este terminal. Verifique se há depósitos cadastrados.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
          <LogOut className="w-4 h-4" />
          Voltar
        </Button>
      </div>
    );
  }

  // 5. No open caixa for selected terminal (unless budget mode)
  if (!caixaAberto && !budgetMode) {
    return (
      <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">Caixa não aberto</h1>
          <p className="text-muted-foreground max-w-md">
            Nenhum caixa aberto no terminal <strong>{terminal.nome}</strong>. Abra o caixa para operar.
          </p>
          <p className="text-xs text-muted-foreground">
            Operador: {profile.nome || profile.email} · Papel: {userRole?.role || '—'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
            <LogOut className="w-4 h-4" />
            Voltar
          </Button>
          {canBudget && (
            <Button variant="outline" onClick={() => setBudgetMode(true)} className="gap-2 border-accent text-accent-foreground">
              <FileText className="w-4 h-4" />
              Modo Orçamento
            </Button>
          )}
          <Button onClick={() => navigate('/pdv/caixa')} className="gap-2 gradient-primary text-primary-foreground">
            <Banknote className="w-4 h-4" />
            Abrir Caixa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col z-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-display font-bold text-foreground tracking-tight">PDV</h1>
          {budgetMode && (
            <Badge className="text-xs px-3 py-1 font-mono font-bold tracking-wider bg-accent text-accent-foreground">
              ORÇAMENTO
            </Badge>
          )}
          <Badge className={cn('text-xs px-3 py-1 font-mono font-bold tracking-wider', modeColor[state.mode])}>
            {modeLabel[state.mode]}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Customer indicator */}
          <button
            onClick={() => dispatch({ type: 'SET_MODAL', modal: 'customer' })}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border',
              state.customer
                ? 'border-primary/30 bg-primary/8 text-primary font-medium'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <User className="w-3.5 h-3.5" />
            <div className="text-left">
              <div>{state.customer ? state.customer.nome : 'Cliente'}</div>
              {state.customer?.cpf_cnpj && (
                <div className="text-[10px] text-muted-foreground font-mono leading-tight">{state.customer.cpf_cnpj}</div>
              )}
            </div>
            <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] font-bold">F3</kbd>
          </button>

          {/* Terminal indicator */}
          {/* Terminal indicator */}
          <Badge variant="outline" className="text-xs px-2 py-1 font-mono">
            {terminal?.nome || 'Terminal'}
          </Badge>

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

            {state.mode === 'payment' && !budgetMode && (
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

            {state.mode !== 'payment' && state.items.length > 0 && !budgetMode && (
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

            {budgetMode && state.items.length > 0 && (
              <Button
                onClick={handleSaveBudget}
                disabled={salvarOrcamento.isPending}
                className="h-16 bg-accent text-accent-foreground font-bold text-xl gap-3 hover:bg-accent/90"
              >
                <FileText className="w-6 h-6" />
                {salvarOrcamento.isPending ? 'Salvando...' : 'Salvar Orçamento'}
              </Button>
            )}
          </div>

          <div className="border-t border-border">
            <PDVShortcutsPanel />
          </div>
        </div>
      </div>

      {/* Modals */}
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

      <HotkeysHelpModal open={state.modal === 'hotkeys'} onOpenChange={(open) => dispatch({ type: 'SET_MODAL', modal: open ? 'hotkeys' : null })} />

      <CustomerModal
        open={state.modal === 'customer'}
        onOpenChange={(open) => dispatch({ type: 'SET_MODAL', modal: open ? 'customer' : null })}
        currentCustomer={state.customer}
        onSelect={(customer) => dispatch({ type: 'SET_CUSTOMER', customer })}
      />

      <DiscountModal
        open={state.modal === 'discount'}
        onOpenChange={(open) => dispatch({ type: 'SET_MODAL', modal: open ? 'discount' : null })}
        currentDiscount={state.discount}
        subtotal={subtotalBruto}
        onApply={(discount) => dispatch({ type: 'SET_DISCOUNT', discount })}
      />

      {lastSale && (
        <ReceiptModal
          open={showReceipt}
          onOpenChange={setShowReceipt}
          items={lastSale.items}
          pagamentos={lastSale.pagamentos}
          customer={lastSale.customer}
          subtotal={lastSale.subtotal}
          desconto={lastSale.desconto}
          total={lastSale.total}
          isBudget={lastSale.isBudget}
        />
      )}

      {(state.modal === 'suprimento' || state.modal === 'sangria') && profile?.empresa_id && caixaAberto?.id ? (
        <CaixaMovModal
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              dispatch({ type: 'SET_MODAL', modal: null });
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }
          }}
          caixaId={caixaAberto.id}
          empresaId={profile.empresa_id}
          defaultMode={state.modal}
        />
      ) : null}
    </div>
  );
}
