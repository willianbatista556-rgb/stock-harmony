import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, Banknote, AlertTriangle, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProdutos, Produto } from '@/hooks/useProdutos';
import { useDepositos } from '@/hooks/useDepositos';
import { usePDV, useFinalizarVenda, PDVMode, Pagamento } from '@/hooks/usePDV';
import { useCaixaAberto } from '@/hooks/useCaixa';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import { PDVSearch } from '@/components/pdv/PDVSearch';
import { PDVInlineInput } from '@/components/pdv/PDVInlineInput';
import { PDVItemsTable } from '@/components/pdv/PDVItemsTable';
import { PDVCartSummary } from '@/components/pdv/PDVCartSummary';
import { PDVPaymentPanel } from '@/components/pdv/PDVPaymentPanel';
import { PDVShortcutsPanel } from '@/components/pdv/PDVShortcutsPanel';

const modeLabel: Record<PDVMode, string> = {
  normal: 'PRONTO', search: 'BUSCA', quantity: 'QUANTIDADE',
  discount: 'DESCONTO', payment: 'PAGAMENTO',
};

const modeColor: Record<PDVMode, string> = {
  normal: 'bg-success text-success-foreground',
  search: 'bg-primary text-primary-foreground',
  quantity: 'bg-warning text-warning-foreground',
  discount: 'bg-accent text-accent-foreground',
  payment: 'bg-success text-success-foreground',
};

export default function PDV() {
  const { data: produtos = [] } = useProdutos();
  const { data: depositos = [] } = useDepositos();
  const finalizarVenda = useFinalizarVenda();
  const navigate = useNavigate();

  const [depositoId, setDepositoId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [paymentForm, setPaymentForm] = useState<'dinheiro' | 'credito' | 'debito' | 'pix'>('dinheiro');
  const [paymentValue, setPaymentValue] = useState('');
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  const pdv = usePDV();
  const { data: caixaAberto } = useCaixaAberto();

  // Auto-select first deposit
  useEffect(() => {
    if (depositos.length > 0 && !depositoId) {
      setDepositoId(depositos[0].id);
    }
  }, [depositos, depositoId]);

  // Auto-focus search on mount (barcode scanner ready)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
      pdv.setMode('search');
    }, 100);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Search products (client-side filtering — instant)
  useEffect(() => {
    if (pdv.mode === 'search' && searchQuery.trim()) {
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
  }, [searchQuery, produtos, pdv.mode]);

  // Focus management per mode
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pdv.mode === 'search') searchInputRef.current?.focus();
      else if (pdv.mode === 'quantity' || pdv.mode === 'discount') inputRef.current?.focus();
      else if (pdv.mode === 'payment') paymentInputRef.current?.focus();
      else if (pdv.mode === 'normal') searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [pdv.mode]);

  // === Keyboard handler (padrão ERP brasileiro) ===
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    // --- Global F-keys (work in any mode) ---

    // F1 = Ajuda (toggle shortcuts visibility — for now just toast)
    if (e.key === 'F1') {
      e.preventDefault();
      toast.info('Atalhos: F2=Desconto | F3=Cliente | F4=Finalizar | F6=Qtd | Ctrl+L=Busca | Del=Remover | Esc=Cancelar');
      return;
    }

    // F2 = Desconto no item selecionado
    if (e.key === 'F2') {
      e.preventDefault();
      if (pdv.items.length > 0) {
        if (pdv.selectedIndex < 0) pdv.setSelectedIndex(0);
        pdv.setMode('discount');
        setInputValue(String(pdv.items[Math.max(0, pdv.selectedIndex)]?.desconto || 0));
      }
      return;
    }

    // F3 = Buscar cliente (placeholder — futuro)
    if (e.key === 'F3') {
      e.preventDefault();
      toast.info('Busca de cliente será implementada em breve');
      return;
    }

    // F4 = Finalizar venda (abre pagamento)
    if (e.key === 'F4') {
      e.preventDefault();
      if (pdv.items.length > 0) {
        pdv.setMode('payment');
        setPaymentValue(String(pdv.restante.toFixed(2)));
      }
      return;
    }

    // F6 = Alterar quantidade do item selecionado
    if (e.key === 'F6') {
      e.preventDefault();
      if (pdv.items.length > 0) {
        if (pdv.selectedIndex < 0) pdv.setSelectedIndex(0);
        pdv.setMode('quantity');
        setInputValue(String(pdv.items[Math.max(0, pdv.selectedIndex)]?.qtd || 1));
      }
      return;
    }

    // Ctrl+L = Foco na busca
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      pdv.setMode('search');
      setSearchQuery('');
      searchInputRef.current?.focus();
      return;
    }

    // --- Search mode ---
    if (pdv.mode === 'search') {
      if (e.key === 'Escape') { e.preventDefault(); pdv.setMode('normal'); setSearchQuery(''); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSearchSelectedIndex(i => Math.min(i + 1, searchResults.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchSelectedIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        pdv.addItem(searchResults[searchSelectedIndex], true);
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      return;
    }

    // --- Quantity mode ---
    if (pdv.mode === 'quantity') {
      if (e.key === 'Escape') { e.preventDefault(); pdv.setMode('normal'); setInputValue(''); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseFloat(inputValue);
        if (!isNaN(val) && pdv.selectedIndex >= 0) pdv.updateQuantity(pdv.selectedIndex, val);
        setInputValue(''); pdv.setMode('normal');
      }
      return;
    }

    // --- Discount mode ---
    if (pdv.mode === 'discount') {
      if (e.key === 'Escape') { e.preventDefault(); pdv.setMode('normal'); setInputValue(''); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseFloat(inputValue);
        if (!isNaN(val) && pdv.selectedIndex >= 0) pdv.applyItemDiscount(pdv.selectedIndex, val);
        setInputValue(''); pdv.setMode('normal');
      }
      return;
    }

    // --- Payment mode ---
    if (pdv.mode === 'payment') {
      if (e.key === 'Escape') { e.preventDefault(); pdv.setMode('normal'); setPaymentValue(''); }
      return;
    }

    // --- Normal mode ---
    if (isInput) {
      if (e.key === 'Escape') { e.preventDefault(); pdv.setMode('normal'); setSearchQuery(''); }
      return;
    }

    if (e.key === 'Delete' && pdv.items.length > 0 && pdv.selectedIndex >= 0) {
      e.preventDefault(); pdv.removeItem(pdv.selectedIndex);
    }
    else if (e.key === 'ArrowDown') { e.preventDefault(); pdv.setSelectedIndex(i => Math.min(i + 1, pdv.items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pdv.setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Escape' && pdv.items.length > 0) { setShowConfirmCancel(true); }
  }, [pdv, searchResults, searchSelectedIndex, inputValue]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // === Payment handlers ===
  const handleAddPayment = useCallback(() => {
    const val = parseFloat(paymentValue);
    if (isNaN(val) || val <= 0) { toast.error('Valor inválido'); return; }
    const troco = paymentForm === 'dinheiro' && val > pdv.restante ? val - pdv.restante : 0;
    pdv.addPagamento({ forma: paymentForm, valor: val, troco });
    setPaymentValue('');

    const newTotalPago = pdv.totalPago + val;
    if (newTotalPago >= pdv.total) {
      handleFinalize([...pdv.pagamentos, { forma: paymentForm, valor: val, troco }]);
    }
  }, [paymentValue, paymentForm, pdv]);

  const handleFinalize = useCallback(async (allPagamentos?: Pagamento[]) => {
    const pags = allPagamentos || pdv.pagamentos;
    if (!depositoId) { toast.error('Selecione um depósito'); return; }
    if (pags.length === 0) { toast.error('Adicione pelo menos um pagamento'); return; }

    await finalizarVenda.mutateAsync({
      items: pdv.items, pagamentos: pags,
      descontoGeral: pdv.descontoGeral, depositoId,
    });
    pdv.clearSale(); pdv.setMode('normal');
  }, [pdv, depositoId, finalizarVenda]);

  const handleInlineConfirm = useCallback(() => {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && pdv.selectedIndex >= 0) {
      if (pdv.mode === 'quantity') pdv.updateQuantity(pdv.selectedIndex, val);
      else pdv.applyItemDiscount(pdv.selectedIndex, val);
    }
    setInputValue(''); pdv.setMode('normal');
  }, [inputValue, pdv]);

  return (
    <div className="h-screen w-screen fixed inset-0 bg-background flex flex-col z-50">
      {/* Top Bar — Compact, high contrast */}
      <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-display font-bold text-foreground tracking-tight">PDV</h1>
          <Badge className={cn('text-xs px-3 py-1 font-mono font-bold tracking-wider', modeColor[pdv.mode])}>
            {modeLabel[pdv.mode]}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content — Full height, 60/40 split */}
      <div className="flex-1 flex min-h-0">
        {/* Left — Search + Items (60%) */}
        <div className="flex-[3] flex flex-col border-r border-border min-h-0">
          {/* Search bar */}
          <div className="p-3 border-b border-border/50">
            <PDVSearch
              ref={searchInputRef}
              query={searchQuery}
              onQueryChange={q => {
                setSearchQuery(q);
                if (pdv.mode !== 'search') pdv.setMode('search');
              }}
              onFocus={() => pdv.setMode('search')}
              onClear={() => { setSearchQuery(''); pdv.setMode('normal'); }}
              isSearchMode={pdv.mode === 'search'}
              results={searchResults}
              selectedIndex={searchSelectedIndex}
              onSelectProduct={(produto) => {
                pdv.addItem(produto, true);
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            />
          </div>

          {/* Inline input (quantity/discount) */}
          {(pdv.mode === 'quantity' || pdv.mode === 'discount') && pdv.selectedIndex >= 0 && (
            <div className="px-3 pt-3">
              <PDVInlineInput
                ref={inputRef}
                mode={pdv.mode}
                productName={pdv.items[pdv.selectedIndex]?.produto.nome || ''}
                value={inputValue}
                onChange={setInputValue}
                onConfirm={handleInlineConfirm}
              />
            </div>
          )}

          {/* Items table */}
          <div className="flex-1 p-3 min-h-0">
            <PDVItemsTable
              items={pdv.items}
              selectedIndex={pdv.selectedIndex}
              onSelectIndex={pdv.setSelectedIndex}
              onRemoveItem={pdv.removeItem}
            />
          </div>
        </div>

        {/* Right — Summary + Payment (40%) */}
        <div className="flex-[2] flex flex-col min-h-0 bg-muted/30">
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-auto">
            <PDVCartSummary
              items={pdv.items}
              descontoGeral={pdv.descontoGeral}
              total={pdv.total}
            />

            {pdv.mode === 'payment' && (
              <PDVPaymentPanel
                ref={paymentInputRef}
                paymentForm={paymentForm}
                onPaymentFormChange={setPaymentForm}
                paymentValue={paymentValue}
                onPaymentValueChange={setPaymentValue}
                onAddPayment={handleAddPayment}
                pagamentos={pdv.pagamentos}
                onRemovePagamento={pdv.removePagamento}
                restante={pdv.restante}
                onFinalize={() => handleFinalize()}
                isFinalizing={finalizarVenda.isPending}
              />
            )}

            {pdv.mode !== 'payment' && pdv.items.length > 0 && (
              <Button
                onClick={() => {
                  pdv.setMode('payment');
                  setPaymentValue(String(pdv.restante.toFixed(2)));
                }}
                className="h-16 gradient-primary text-primary-foreground font-bold text-xl gap-3"
              >
                <Banknote className="w-6 h-6" />
                Finalizar Venda
                <kbd className="ml-2 px-2 py-0.5 rounded bg-primary-foreground/20 text-sm font-mono">F4</kbd>
              </Button>
            )}
          </div>

          {/* Shortcuts — fixed at bottom */}
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
            Todos os {pdv.items.length} itens serão removidos. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmCancel(false)}>Voltar</Button>
            <Button variant="destructive" onClick={() => { pdv.clearSale(); setShowConfirmCancel(false); }}>
              Cancelar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
