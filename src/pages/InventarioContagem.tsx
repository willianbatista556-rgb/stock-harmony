import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, Trash2, CheckCircle2, ArrowLeft,
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Equal, XCircle,
  Loader2, Play, RefreshCw, FileText, Package, Hash, List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useInventarioItens, useAdicionarItemInventario,
  useRemoverItemInventario, useFinalizarInventario,
  useAplicarAjustesInventario, useCancelarInventario,
  useInventarios, useIniciarInventario, useIniciarRecontagem,
} from '@/hooks/useInventarios';
import { useProdutos, Produto } from '@/hooks/useProdutos';
import { useDepositos } from '@/hooks/useDepositos';
import { useEstoquePorDeposito } from '@/hooks/useEstoquePorDeposito';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function InventarioContagem() {
  const { id: inventarioId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inventarios = [] } = useInventarios();
  const inventario = inventarios.find(i => i.id === inventarioId);
  const { data: itens = [], isLoading: itensLoading } = useInventarioItens(inventarioId);
  const { data: produtos = [] } = useProdutos();
  const { data: depositos = [] } = useDepositos();
  const { data: estoqueMap = {} } = useEstoquePorDeposito(inventario?.deposito_id);

  const addItem = useAdicionarItemInventario();
  const removeItem = useRemoverItemInventario();
  const iniciar = useIniciarInventario();
  const finalizar = useFinalizarInventario();
  const aplicar = useAplicarAjustesInventario();
  const cancelar = useCancelarInventario();
  const recontagem = useIniciarRecontagem();

  const [busca, setBusca] = useState('');
  const [showIniciar, setShowIniciar] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showAplicar, setShowAplicar] = useState(false);
  const [showRecontagem, setShowRecontagem] = useState(false);
  const [showQtdModal, setShowQtdModal] = useState(false);
  const [qtdModalProduto, setQtdModalProduto] = useState<Produto | null>(null);
  const [qtdModalValue, setQtdModalValue] = useState('');
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const [ultimosContados, setUltimosContados] = useState<Array<{ produto: Produto; qtd: number; ts: number }>>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const qtdInputRef = useRef<HTMLInputElement>(null);

  const status = inventario?.status || 'rascunho';
  const isRascunho = status === 'rascunho';
  const isContagem = status === 'em_contagem';
  const isFechado = status === 'fechado';
  const isAplicado = isFechado && !!inventario?.aplicado_em;

  const depositoNome = inventario ? depositos.find(d => d.id === inventario.deposito_id)?.nome || '—' : '—';

  const produtoMap = useMemo(() => {
    const m: Record<string, Produto> = {};
    produtos.forEach(p => { m[p.id] = p; });
    return m;
  }, [produtos]);

  // Contagem logic
  const maxContagem = useMemo(() => {
    if (itens.length === 0) return 1;
    return Math.max(...itens.map(i => i.contagem));
  }, [itens]);

  const contagensList = useMemo(() => {
    const set = new Set(itens.map(i => i.contagem));
    return Array.from(set).sort((a, b) => a - b);
  }, [itens]);

  const [selectedContagem, setSelectedContagem] = useState<number>(1);
  const activeContagem = contagensList.includes(selectedContagem) ? selectedContagem : maxContagem;

  const currentItens = useMemo(() => {
    return itens.filter(i => i.contagem === activeContagem);
  }, [itens, activeContagem]);

  // Search with EAN exact match priority
  const searchResults = useMemo(() => {
    if (!busca.trim() || !isContagem) return [];
    const q = busca.toLowerCase().trim();
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.ean && p.ean.toLowerCase() === q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [busca, produtos, isContagem]);

  const exactEanMatch = useMemo(() => {
    if (!busca.trim() || !isContagem) return null;
    return produtos.find(p => p.ean && p.ean.toLowerCase() === busca.toLowerCase().trim()) || null;
  }, [busca, produtos, isContagem]);

  // Reset search index on results change
  useEffect(() => { setSelectedSearchIdx(0); }, [searchResults.length]);

  const handleAddProduto = useCallback(async (produto: Produto, qtd: number = 1) => {
    if (!inventarioId) return;
    await addItem.mutateAsync({ inventarioId, produtoId: produto.id, qtd, contagem: maxContagem });
    // Track últimos contados
    setUltimosContados(prev => {
      const next = [{ produto, qtd, ts: Date.now() }, ...prev.filter(u => u.produto.id !== produto.id)];
      return next.slice(0, 5);
    });
    setBusca('');
    toast.success(`+${qtd} ${produto.nome}`, { duration: 1500 });
    inputRef.current?.focus();
  }, [inventarioId, addItem, maxContagem]);

  // Keyboard handler for search input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (exactEanMatch) {
        // EAN exact: add +1 immediately (barcode scanner behavior)
        handleAddProduto(exactEanMatch, 1);
      } else if (searchResults.length > 0) {
        const selected = searchResults[selectedSearchIdx];
        if (selected) handleAddProduto(selected, 1);
      }
      return;
    }

    // F6 = open quantity modal for selected product
    if (e.key === 'F6') {
      e.preventDefault();
      const target = exactEanMatch || (searchResults.length > 0 ? searchResults[selectedSearchIdx] : null);
      if (target) {
        setQtdModalProduto(target);
        setQtdModalValue('');
        setShowQtdModal(true);
      }
      return;
    }

    // Arrow navigation in search results
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIdx(i => Math.min(i + 1, searchResults.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIdx(i => Math.max(i - 1, 0));
    }

    // Escape clears search
    if (e.key === 'Escape') {
      setBusca('');
    }
  };

  // Quantity modal confirm
  const handleQtdConfirm = () => {
    if (!qtdModalProduto) return;
    const qtd = parseFloat(qtdModalValue);
    if (!qtd || qtd <= 0) {
      toast.error('Quantidade inválida');
      return;
    }
    handleAddProduto(qtdModalProduto, qtd);
    setShowQtdModal(false);
    setQtdModalProduto(null);
  };

  // Focus quantity input when modal opens
  useEffect(() => {
    if (showQtdModal) {
      setTimeout(() => qtdInputRef.current?.focus(), 50);
    }
  }, [showQtdModal]);

  // Global keyboard shortcuts
  useEffect(() => {
    if (!isContagem) return;
    const handler = (e: KeyboardEvent) => {
      // Don't capture if modal open
      if (showQtdModal || showFinalizar || showIniciar) return;
      
      // Focus search on any printable character if not focused
      if (document.activeElement !== inputRef.current && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isContagem, showQtdModal, showFinalizar, showIniciar]);

  const handleIniciar = async () => {
    if (!inventarioId) return;
    await iniciar.mutateAsync(inventarioId);
    setShowIniciar(false);
  };

  const handleFinalizar = async () => {
    if (!inventarioId) return;
    await finalizar.mutateAsync(inventarioId);
    setShowFinalizar(false);
  };

  const handleAplicar = async () => {
    if (!inventarioId) return;
    await aplicar.mutateAsync(inventarioId);
    setShowAplicar(false);
  };

  const handleRecontagem = async () => {
    if (!inventarioId) return;
    const novaContagem = await recontagem.mutateAsync(inventarioId);
    setSelectedContagem(novaContagem);
    setShowRecontagem(false);
  };

  const handleCancelar = async () => {
    if (!inventarioId) return;
    await cancelar.mutateAsync(inventarioId);
    navigate('/inventario');
  };

  // Stats
  const totalItens = currentItens.length;
  const totalContado = currentItens.reduce((s, i) => s + i.qtd_contada, 0);
  const divergencias = currentItens.filter(i => i.diferenca !== null && i.diferenca !== 0).length;

  if (!inventario) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Inventário não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/inventario')}>Voltar</Button>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    rascunho: 'Rascunho',
    em_contagem: 'Em Contagem',
    fechado: isAplicado ? 'Ajustes Aplicados' : 'Fechado',
    cancelado: 'Cancelado',
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/inventario')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-foreground">Inventário</h1>
              <Badge variant="outline" className={cn('text-xs',
                isRascunho && 'bg-muted text-muted-foreground',
                isContagem && 'bg-warning/10 text-warning border-warning/20',
                isFechado && !isAplicado && 'bg-primary/10 text-primary border-primary/20',
                isAplicado && 'bg-success/10 text-success border-success/20',
                status === 'cancelado' && 'bg-destructive/10 text-destructive border-destructive/20',
              )}>
                {statusLabel[status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {depositoNome}
              {inventario.observacao && ` · ${inventario.observacao}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isRascunho && status !== 'cancelado' && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/inventario/${inventarioId}/completo`)} className="gap-1.5">
              <List className="w-4 h-4" /> Modo Completo
            </Button>
          )}
          {isRascunho && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelar} className="text-destructive border-destructive/30">
                <XCircle className="w-4 h-4 mr-1.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={() => setShowIniciar(true)} className="gradient-primary text-primary-foreground gap-1.5">
                <Play className="w-4 h-4" /> Iniciar Contagem
              </Button>
            </>
          )}
          {isContagem && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelar} className="text-destructive border-destructive/30">
                <XCircle className="w-4 h-4 mr-1.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={() => setShowFinalizar(true)} disabled={totalItens === 0} className="gradient-primary text-primary-foreground gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Finalizar
              </Button>
            </>
          )}
          {isFechado && !isAplicado && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowRecontagem(true)} className="gap-1.5">
                <RefreshCw className="w-4 h-4" /> Recontagem
              </Button>
              <Button size="sm" onClick={() => setShowAplicar(true)} className="gradient-primary text-primary-foreground gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Aplicar Ajustes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Rascunho state */}
      {isRascunho && (
        <Card className="bg-card shadow-card border-dashed border-2 border-border">
          <CardContent className="pt-6 flex flex-col items-center justify-center py-16 gap-4">
            <FileText className="w-16 h-16 text-muted-foreground/30" />
            <div className="text-center space-y-1">
              <p className="font-semibold text-foreground">Inventário em Rascunho</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Ao iniciar, o sistema captura um snapshot de todo o estoque do depósito. As divergências serão calculadas sobre o estoque real no início da contagem.
              </p>
            </div>
            <Button onClick={() => setShowIniciar(true)} className="gradient-primary text-primary-foreground gap-1.5">
              <Play className="w-4 h-4" /> Iniciar Contagem
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── COUNTING MODE ── */}
      {isContagem && (
        <>
          {/* Search bar - prominent, keyboard-first */}
          <Card className="bg-card shadow-card border-2 border-primary/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="font-mono text-xs">
                  Contagem #{maxContagem}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Enter = +1 · F6 = quantidade · ↑↓ = navegar
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Bipe o código de barras ou digite o nome do produto…"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-11 h-12 text-lg font-mono border-2 border-border focus:border-primary"
                  autoFocus
                />
                {busca && (
                  <button
                    onClick={() => { setBusca(''); inputRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-border rounded-lg divide-y divide-border bg-popover max-h-64 overflow-y-auto shadow-lg">
                  {searchResults.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddProduto(p, 1)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 transition-colors text-left',
                        idx === selectedSearchIdx ? 'bg-accent' : 'hover:bg-accent/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.ean && `EAN: ${p.ean}`}{p.ean && p.sku && ' · '}{p.sku && `SKU: ${p.sku}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-mono">
                          Est: {estoqueMap[p.id] ?? 0}
                        </Badge>
                        {idx === selectedSearchIdx && (
                          <Badge className="text-xs bg-primary text-primary-foreground">
                            Enter
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {busca.trim() && searchResults.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground text-center py-3">
                  Nenhum produto encontrado para "{busca}"
                </p>
              )}
            </CardContent>
          </Card>

          {/* Últimos contados */}
          {ultimosContados.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-muted-foreground font-semibold shrink-0 uppercase tracking-wider">Últimos:</span>
              {ultimosContados.map((u, i) => (
                <Badge
                  key={`${u.produto.id}-${u.ts}`}
                  variant="outline"
                  className={cn(
                    'shrink-0 cursor-pointer hover:bg-accent transition-colors font-mono',
                    i === 0 && 'border-primary/40 bg-primary/5'
                  )}
                  onClick={() => {
                    setBusca(u.produto.ean || u.produto.nome);
                    inputRef.current?.focus();
                  }}
                >
                  +{u.qtd} {u.produto.nome.length > 20 ? u.produto.nome.slice(0, 20) + '…' : u.produto.nome}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats inline */}
          <div className="flex items-center gap-6 px-1">
            <div className="flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground tabular-nums">{totalItens}</span>
              <span className="text-xs text-muted-foreground">produtos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground tabular-nums">{totalContado}</span>
              <span className="text-xs text-muted-foreground">unidades</span>
            </div>
          </div>
        </>
      )}

      {/* Stats Cards (fechado) */}
      {!isRascunho && !isContagem && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card shadow-card">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Produtos Contados</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{totalItens}</p>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-card">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Contado</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{totalContado}</p>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-card">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Divergências</p>
              <p className={cn('text-2xl font-bold tabular-nums', divergencias > 0 ? 'text-warning' : 'text-success')}>
                {divergencias}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Items Table */}
      {!isRascunho && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          {contagensList.length > 1 && !isContagem && (
            <div className="px-4 pt-4">
              <Tabs value={String(activeContagem)} onValueChange={v => setSelectedContagem(Number(v))}>
                <TabsList>
                  {contagensList.map(c => (
                    <TabsTrigger key={c} value={String(c)} className="font-mono text-xs">
                      {c === 1 ? '1ª Contagem' : `Recontagem #${c}`}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          {itensLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentItens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {isContagem ? 'Bipe ou busque um produto acima para começar.' : 'Nenhum item nesta contagem.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Produto</TableHead>
                  <TableHead className="font-semibold text-right">Contado</TableHead>
                  {!isContagem && (
                    <>
                      <TableHead className="font-semibold text-right">Esperado</TableHead>
                      <TableHead className="font-semibold text-right">Diferença</TableHead>
                    </>
                  )}
                  {isContagem && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItens.map(item => {
                  const p = produtoMap[item.produto_id];
                  const nome = item.nome_snapshot || p?.nome || 'Produto';
                  const dif = item.diferenca ?? 0;

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {p?.ean && `EAN: ${p.ean}`}{p?.sku && ` · SKU: ${p.sku}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold tabular-nums text-lg">
                        {item.qtd_contada}
                      </TableCell>
                      {!isContagem && (
                        <>
                          <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                            {item.qtd_sistema ?? '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              'inline-flex items-center gap-1 font-mono font-semibold tabular-nums',
                              dif > 0 && 'text-success',
                              dif < 0 && 'text-destructive',
                              dif === 0 && 'text-muted-foreground',
                            )}>
                              {dif > 0 && <ArrowUpCircle className="w-3.5 h-3.5" />}
                              {dif < 0 && <ArrowDownCircle className="w-3.5 h-3.5" />}
                              {dif === 0 && <Equal className="w-3.5 h-3.5" />}
                              {dif > 0 ? '+' : ''}{dif}
                            </span>
                          </TableCell>
                        </>
                      )}
                      {isContagem && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem.mutate({ itemId: item.id, inventarioId: inventarioId! })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* ── Quantity Modal (F6) ── */}
      <Dialog open={showQtdModal} onOpenChange={(open) => { setShowQtdModal(open); if (!open) inputRef.current?.focus(); }}>
        <DialogContent className="bg-card max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Quantidade</DialogTitle>
            <DialogDescription>
              {qtdModalProduto?.nome}
            </DialogDescription>
          </DialogHeader>
          <Input
            ref={qtdInputRef}
            type="number"
            min="0.01"
            step="1"
            value={qtdModalValue}
            onChange={e => setQtdModalValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleQtdConfirm(); }
              if (e.key === 'Escape') { setShowQtdModal(false); }
            }}
            placeholder="Ex: 24"
            className="h-14 text-2xl text-center font-mono"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQtdModal(false)}>Cancelar</Button>
            <Button onClick={handleQtdConfirm} className="gradient-primary text-primary-foreground">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Dialogs ── */}
      <Dialog open={showIniciar} onOpenChange={setShowIniciar}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar Contagem?</DialogTitle>
            <DialogDescription>
              O sistema vai capturar um snapshot de todo o estoque do depósito <strong>{depositoNome}</strong> neste momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIniciar(false)}>Cancelar</Button>
            <Button onClick={handleIniciar} disabled={iniciar.isPending} className="gradient-primary text-primary-foreground">
              {iniciar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFinalizar} onOpenChange={setShowFinalizar}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Finalizar Contagem?</DialogTitle>
            <DialogDescription>
              O sistema vai comparar {totalItens} produto(s) contados com o snapshot e calcular divergências.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizar(false)}>Cancelar</Button>
            <Button onClick={handleFinalizar} disabled={finalizar.isPending} className="gradient-primary text-primary-foreground">
              {finalizar.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAplicar} onOpenChange={setShowAplicar}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Aplicar Ajustes?</DialogTitle>
            <DialogDescription>
              O estoque será ajustado para refletir as quantidades da última contagem. {divergencias} divergência(s) gerarão movimentações de ajuste.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAplicar(false)}>Cancelar</Button>
            <Button onClick={handleAplicar} disabled={aplicar.isPending} className="gradient-primary text-primary-foreground">
              {aplicar.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRecontagem} onOpenChange={setShowRecontagem}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar Recontagem?</DialogTitle>
            <DialogDescription>
              Nova contagem para os {divergencias} item(ns) divergentes. O inventário volta a "Em Contagem".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecontagem(false)}>Cancelar</Button>
            <Button onClick={handleRecontagem} disabled={recontagem.isPending} className="gradient-primary text-primary-foreground gap-1.5">
              {recontagem.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <RefreshCw className="w-4 h-4" /> Recontar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
