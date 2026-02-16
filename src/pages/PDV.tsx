import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, ShoppingCart, Banknote, CreditCard, QrCode, Trash2,
  Keyboard, Hash, Percent, DollarSign, CornerDownLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProdutos, Produto } from '@/hooks/useProdutos';
import { useDepositos } from '@/hooks/useDepositos';
import { usePDV, useFinalizarVenda, PDVMode, Pagamento } from '@/hooks/usePDV';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const formaLabels: Record<string, { label: string; icon: typeof Banknote }> = {
  dinheiro: { label: 'Dinheiro', icon: Banknote },
  credito: { label: 'Crédito', icon: CreditCard },
  debito: { label: 'Débito', icon: CreditCard },
  pix: { label: 'Pix', icon: QrCode },
};

const shortcuts = [
  { key: '/', label: 'Buscar', desc: 'produto' },
  { key: 'q', label: 'Qtd', desc: 'alterar' },
  { key: 'd', label: 'Desconto', desc: 'item' },
  { key: 'p', label: 'Pagar', desc: 'finalizar' },
  { key: 'x', label: 'Remover', desc: 'item' },
  { key: 'Esc', label: 'Voltar', desc: 'cancelar' },
];

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

  // Search products
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

  // Focus management
  useEffect(() => {
    if (pdv.mode === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else if (pdv.mode === 'quantity' || pdv.mode === 'discount') {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (pdv.mode === 'payment') {
      setTimeout(() => paymentInputRef.current?.focus(), 50);
    }
  }, [pdv.mode]);

  // Keyboard handler
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if inside a select/dialog that's not ours
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    if (pdv.mode === 'search') {
      if (e.key === 'Escape') {
        e.preventDefault();
        pdv.setMode('normal');
        setSearchQuery('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSearchSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSearchSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        pdv.addItem(searchResults[searchSelectedIndex]);
        setSearchQuery('');
        pdv.setMode('search');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      return;
    }

    if (pdv.mode === 'quantity') {
      if (e.key === 'Escape') {
        e.preventDefault();
        pdv.setMode('normal');
        setInputValue('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseFloat(inputValue);
        if (!isNaN(val) && pdv.selectedIndex >= 0) {
          pdv.updateQuantity(pdv.selectedIndex, val);
        }
        setInputValue('');
        pdv.setMode('normal');
      }
      return;
    }

    if (pdv.mode === 'discount') {
      if (e.key === 'Escape') {
        e.preventDefault();
        pdv.setMode('normal');
        setInputValue('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseFloat(inputValue);
        if (!isNaN(val) && pdv.selectedIndex >= 0) {
          pdv.applyItemDiscount(pdv.selectedIndex, val);
        }
        setInputValue('');
        pdv.setMode('normal');
      }
      return;
    }

    if (pdv.mode === 'payment') {
      if (e.key === 'Escape') {
        e.preventDefault();
        pdv.setMode('normal');
        setPaymentValue('');
      } else if (e.key === 'Enter' && !isInput) {
        // handled by button
      }
      return;
    }

    // Normal mode
    if (isInput) return;

    if (e.key === '/') {
      e.preventDefault();
      pdv.setMode('search');
      setSearchQuery('');
    } else if (e.key === 'q' && pdv.items.length > 0) {
      e.preventDefault();
      if (pdv.selectedIndex < 0) pdv.setSelectedIndex(0);
      pdv.setMode('quantity');
      setInputValue(String(pdv.items[Math.max(0, pdv.selectedIndex)]?.qtd || 1));
    } else if (e.key === 'd' && pdv.items.length > 0) {
      e.preventDefault();
      if (pdv.selectedIndex < 0) pdv.setSelectedIndex(0);
      pdv.setMode('discount');
      setInputValue(String(pdv.items[Math.max(0, pdv.selectedIndex)]?.desconto || 0));
    } else if (e.key === 'p' && pdv.items.length > 0) {
      e.preventDefault();
      pdv.setMode('payment');
      setPaymentValue(String(pdv.restante.toFixed(2)));
    } else if (e.key === 'x' && pdv.items.length > 0 && pdv.selectedIndex >= 0) {
      e.preventDefault();
      pdv.removeItem(pdv.selectedIndex);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      pdv.setSelectedIndex(i => Math.min(i + 1, pdv.items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      pdv.setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      if (pdv.items.length > 0) {
        setShowConfirmCancel(true);
      }
    }
  }, [pdv, searchResults, searchSelectedIndex, inputValue, paymentValue]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const handleAddPayment = () => {
    const val = parseFloat(paymentValue);
    if (isNaN(val) || val <= 0) {
      toast.error('Valor inválido');
      return;
    }
    const troco = paymentForm === 'dinheiro' && val > pdv.restante ? val - pdv.restante : 0;
    pdv.addPagamento({ forma: paymentForm, valor: val, troco });
    setPaymentValue('');

    const newTotalPago = pdv.totalPago + val;
    if (newTotalPago >= pdv.total) {
      // Auto-finalize
      handleFinalize([...pdv.pagamentos, { forma: paymentForm, valor: val, troco }]);
    }
  };

  const handleFinalize = async (allPagamentos?: Pagamento[]) => {
    const pags = allPagamentos || pdv.pagamentos;
    if (!depositoId) {
      toast.error('Selecione um depósito');
      return;
    }
    if (pags.length === 0) {
      toast.error('Adicione pelo menos um pagamento');
      return;
    }

    await finalizarVenda.mutateAsync({
      items: pdv.items,
      pagamentos: pags,
      descontoGeral: pdv.descontoGeral,
      depositoId,
    });

    pdv.clearSale();
    pdv.setMode('normal');
  };

  const handleCancelSale = () => {
    pdv.clearSale();
    setShowConfirmCancel(false);
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const modeLabel: Record<PDVMode, string> = {
    normal: 'PRONTO',
    search: 'BUSCA',
    quantity: 'QUANTIDADE',
    discount: 'DESCONTO',
    payment: 'PAGAMENTO',
  };

  const modeColor: Record<PDVMode, string> = {
    normal: 'bg-success text-success-foreground',
    search: 'bg-primary text-primary-foreground',
    quantity: 'bg-warning text-warning-foreground',
    discount: 'bg-accent text-accent-foreground',
    payment: 'bg-success text-success-foreground',
  };

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

      {/* Main Content - Split Screen */}
      <div className="flex-1 grid grid-cols-5 gap-3 min-h-0">
        {/* Left - Search & Results */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          {/* Search Bar - always visible */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder='Buscar produto (nome, SKU, EAN)... pressione "/" para focar'
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (pdv.mode !== 'search') pdv.setMode('search');
              }}
              onFocus={() => pdv.setMode('search')}
              className="pl-9 h-12 text-base font-mono"
            />
            {pdv.mode === 'search' && searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); pdv.setMode('normal'); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {pdv.mode === 'search' && searchResults.length > 0 && (
            <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-auto flex-shrink-0 max-h-[300px]">
              {searchResults.map((produto, i) => (
                <button
                  key={produto.id}
                  onClick={() => {
                    pdv.addItem(produto);
                    setSearchQuery('');
                    pdv.setMode('search');
                    searchInputRef.current?.focus();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-border/30 last:border-0',
                    i === searchSelectedIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
                  )}
                >
                  <div>
                    <p className="font-medium text-card-foreground">{produto.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {produto.sku && <span>SKU: {produto.sku}</span>}
                      {produto.ean && <span className="ml-2">EAN: {produto.ean}</span>}
                      {produto.marca && <span className="ml-2">• {produto.marca}</span>}
                    </p>
                  </div>
                  <span className="font-bold tabular-nums text-primary">
                    {formatCurrency(produto.preco_venda || 0)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Inline Input for Quantity/Discount */}
          {(pdv.mode === 'quantity' || pdv.mode === 'discount') && (
            <div className="bg-card rounded-xl border-2 border-primary p-4 shadow-card animate-scale-in">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {pdv.mode === 'quantity' ? 'Nova quantidade para' : 'Desconto (R$) para'}{' '}
                <span className="text-foreground font-bold">
                  {pdv.items[pdv.selectedIndex]?.produto.nome}
                </span>
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {pdv.mode === 'quantity' ? (
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  ) : (
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  )}
                  <Input
                    ref={inputRef}
                    type="number"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    className="pl-9 h-12 text-lg font-mono"
                    min="0"
                    step={pdv.mode === 'quantity' ? '1' : '0.01'}
                  />
                </div>
                <Button
                  size="lg"
                  className="h-12 gradient-primary text-primary-foreground gap-2"
                  onClick={() => {
                    const val = parseFloat(inputValue);
                    if (!isNaN(val) && pdv.selectedIndex >= 0) {
                      if (pdv.mode === 'quantity') pdv.updateQuantity(pdv.selectedIndex, val);
                      else pdv.applyItemDiscount(pdv.selectedIndex, val);
                    }
                    setInputValue('');
                    pdv.setMode('normal');
                  }}
                >
                  <CornerDownLeft className="w-4 h-4" />
                  Confirmar
                </Button>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 bg-card rounded-xl border border-border/50 shadow-card overflow-auto min-h-0">
            {pdv.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-12">
                <ShoppingCart className="w-12 h-12 opacity-30" />
                <p className="text-lg font-medium">Nenhum item na venda</p>
                <p className="text-sm">Pressione <kbd className="px-2 py-0.5 rounded bg-muted font-mono text-xs">/</kbd> para buscar produtos</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">#</th>
                    <th className="px-4 py-2 font-semibold">Produto</th>
                    <th className="px-4 py-2 font-semibold text-center">Qtd</th>
                    <th className="px-4 py-2 font-semibold text-right">Unit.</th>
                    <th className="px-4 py-2 font-semibold text-right">Desc.</th>
                    <th className="px-4 py-2 font-semibold text-right">Subtotal</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {pdv.items.map((item, i) => (
                    <tr
                      key={item.id}
                      onClick={() => pdv.setSelectedIndex(i)}
                      className={cn(
                        'border-b border-border/30 cursor-pointer transition-colors',
                        i === pdv.selectedIndex
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'hover:bg-muted/30'
                      )}
                    >
                      <td className="px-4 py-2.5 text-sm text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-card-foreground text-sm">{item.produto.nome}</p>
                        <p className="text-xs text-muted-foreground">{item.produto.sku || ''}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold tabular-nums">{item.qtd}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sm">{formatCurrency(item.preco_unit)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sm text-destructive">
                        {item.desconto > 0 ? `-${formatCurrency(item.desconto)}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatCurrency(item.subtotal)}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); pdv.removeItem(i); }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right - Cart Summary & Payment */}
        <div className="col-span-2 flex flex-col gap-3 min-h-0">
          {/* Totals */}
          <div className="bg-card rounded-xl border border-border/50 shadow-card p-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Itens ({pdv.items.reduce((s, i) => s + i.qtd, 0)})</span>
                <span className="tabular-nums">{formatCurrency(pdv.items.reduce((s, i) => s + i.qtd * i.preco_unit, 0))}</span>
              </div>
              {pdv.items.some(i => i.desconto > 0) && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Descontos itens</span>
                  <span className="tabular-nums">-{formatCurrency(pdv.items.reduce((s, i) => s + i.desconto, 0))}</span>
                </div>
              )}
              {pdv.descontoGeral > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Desconto geral</span>
                  <span className="tabular-nums">-{formatCurrency(pdv.descontoGeral)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between items-end">
                  <span className="text-lg font-medium text-muted-foreground">Total</span>
                  <span className="text-3xl font-display font-bold text-foreground tabular-nums">
                    {formatCurrency(pdv.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payments */}
          {pdv.mode === 'payment' && (
            <div className="bg-card rounded-xl border-2 border-success p-4 shadow-card animate-scale-in space-y-3">
              <h3 className="font-display font-bold text-foreground">Pagamento</h3>

              {/* Payment forms */}
              <div className="grid grid-cols-4 gap-2">
                {(['dinheiro', 'credito', 'debito', 'pix'] as const).map(forma => {
                  const cfg = formaLabels[forma];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={forma}
                      onClick={() => setPaymentForm(forma)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs font-medium',
                        paymentForm === forma
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-muted-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Input
                  ref={paymentInputRef}
                  type="number"
                  value={paymentValue}
                  onChange={e => setPaymentValue(e.target.value)}
                  placeholder="Valor"
                  className="h-11 font-mono text-lg"
                  min="0"
                  step="0.01"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPayment();
                    }
                  }}
                />
                <Button onClick={handleAddPayment} className="h-11 gradient-primary text-primary-foreground px-6">
                  Add
                </Button>
              </div>

              {/* Already added payments */}
              {pdv.pagamentos.length > 0 && (
                <div className="space-y-1">
                  {pdv.pagamentos.map((pag, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{formaLabels[pag.forma].label}</Badge>
                        <span className="font-mono tabular-nums font-medium">{formatCurrency(pag.valor)}</span>
                        {pag.troco && pag.troco > 0 ? (
                          <span className="text-xs text-success">(troco: {formatCurrency(pag.troco)})</span>
                        ) : null}
                      </div>
                      <button onClick={() => pdv.removePagamento(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Remaining */}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Restante</span>
                <span className={cn(
                  'font-bold tabular-nums font-mono text-lg',
                  pdv.restante > 0 ? 'text-destructive' : 'text-success'
                )}>
                  {formatCurrency(pdv.restante)}
                </span>
              </div>

              {pdv.restante <= 0 && pdv.pagamentos.length > 0 && (
                <Button
                  onClick={() => handleFinalize()}
                  disabled={finalizarVenda.isPending}
                  className="w-full h-12 gradient-success text-success-foreground font-bold text-lg"
                >
                  {finalizarVenda.isPending ? 'Finalizando...' : 'Finalizar Venda'}
                </Button>
              )}
            </div>
          )}

          {/* Quick Payment Button (normal mode) */}
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

          {/* Keyboard Shortcuts */}
          <div className="bg-card rounded-xl border border-border/50 shadow-card p-4 mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atalhos</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {shortcuts.map(s => (
                <div key={s.key} className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs font-bold text-muted-foreground min-w-[24px] text-center">
                    {s.key}
                  </kbd>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
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
            <Button variant="destructive" onClick={handleCancelSale}>Cancelar Venda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
