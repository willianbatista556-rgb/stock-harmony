import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProdutos, Produto } from '@/hooks/useProdutos';
import { useDepositos } from '@/hooks/useDepositos';
import { usePDV, useFinalizarVenda, PDVMode, Pagamento } from '@/hooks/usePDV';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Extracted components
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

  // Auto-select first deposit
  useEffect(() => {
    if (depositos.length > 0 && !depositoId) {
      setDepositoId(depositos[0].id);
    }
  }, [depositos, depositoId]);

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
    }, 50);
    return () => clearTimeout(timer);
  }, [pdv.mode]);

  // === Keyboard handler (vim-style) ===
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

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
    if (isInput) return;

    if (e.key === '/') { e.preventDefault(); pdv.setMode('search'); setSearchQuery(''); }
    else if (e.key === 'q' && pdv.items.length > 0) {
      e.preventDefault();
      if (pdv.selectedIndex < 0) pdv.setSelectedIndex(0);
      pdv.setMode('quantity');
      setInputValue(String(pdv.items[Math.max(0, pdv.selectedIndex)]?.qtd || 1));
    }
    else if (e.key === 'd' && pdv.items.length > 0) {
      e.preventDefault();
      if (pdv.selectedIndex < 0) pdv.setSelectedIndex(0);
      pdv.setMode('discount');
      setInputValue(String(pdv.items[Math.max(0, pdv.selectedIndex)]?.desconto || 0));
    }
    else if (e.key === 'p' && pdv.items.length > 0) {
      e.preventDefault();
      pdv.setMode('payment');
      setPaymentValue(String(pdv.restante.toFixed(2)));
    }
    else if (e.key === 'x' && pdv.items.length > 0 && pdv.selectedIndex >= 0) {
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
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-3 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">PDV</h1>
            <p className="text-xs text-muted-foreground">Ponto de Venda</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={cn('text-xs px-3 py-1 font-mono font-bold', modeColor[pdv.mode])}>
            {modeLabel[pdv.mode]}
          </Badge>
          <Select value={depositoId} onValueChange={setDepositoId}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Depósito" />
            </SelectTrigger>
            <SelectContent>
              {depositos.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content — Split Screen */}
      <div className="flex-1 grid grid-cols-5 gap-3 min-h-0">
        {/* Left — Search + Items */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
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

          {(pdv.mode === 'quantity' || pdv.mode === 'discount') && pdv.selectedIndex >= 0 && (
            <PDVInlineInput
              ref={inputRef}
              mode={pdv.mode}
              productName={pdv.items[pdv.selectedIndex]?.produto.nome || ''}
              value={inputValue}
              onChange={setInputValue}
              onConfirm={handleInlineConfirm}
            />
          )}

          <PDVItemsTable
            items={pdv.items}
            selectedIndex={pdv.selectedIndex}
            onSelectIndex={pdv.setSelectedIndex}
            onRemoveItem={pdv.removeItem}
          />
        </div>

        {/* Right — Summary + Payment + Shortcuts */}
        <div className="col-span-2 flex flex-col gap-3 min-h-0">
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
              className="h-14 gradient-primary text-primary-foreground font-bold text-lg gap-2"
            >
              <Banknote className="w-5 h-5" />
              Pagamento (p)
            </Button>
          )}

          <PDVShortcutsPanel />
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
