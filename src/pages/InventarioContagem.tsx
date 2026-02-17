import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, Trash2, CheckCircle2, ArrowLeft,
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Equal, XCircle,
  Loader2, Play, RefreshCw, FileText,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [qtdInput, setQtdInput] = useState('1');
  const [showIniciar, setShowIniciar] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showAplicar, setShowAplicar] = useState(false);
  const [showRecontagem, setShowRecontagem] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Determine max contagem
  const maxContagem = useMemo(() => {
    if (itens.length === 0) return 1;
    return Math.max(...itens.map(i => i.contagem));
  }, [itens]);

  // Available contagem tabs
  const contagensList = useMemo(() => {
    const set = new Set(itens.map(i => i.contagem));
    return Array.from(set).sort((a, b) => a - b);
  }, [itens]);

  const [selectedContagem, setSelectedContagem] = useState<number>(1);
  // Keep selectedContagem in sync
  const activeContagem = contagensList.includes(selectedContagem) ? selectedContagem : maxContagem;

  const currentItens = useMemo(() => {
    return itens.filter(i => i.contagem === activeContagem);
  }, [itens, activeContagem]);

  // Search
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

  const handleAddProduto = async (produto: Produto) => {
    if (!inventarioId) return;
    const qtd = parseFloat(qtdInput) || 1;
    await addItem.mutateAsync({ inventarioId, produtoId: produto.id, qtd, contagem: maxContagem });
    setBusca('');
    setQtdInput('1');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && exactEanMatch) {
      e.preventDefault();
      handleAddProduto(exactEanMatch);
    }
  };

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/inventario')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-foreground">
                Inventário
              </h1>
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
              Depósito: {depositoNome}
              {inventario.observacao && ` · ${inventario.observacao}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
                <CheckCircle2 className="w-4 h-4" /> Finalizar Contagem
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
                Ao iniciar, o sistema captura um snapshot de todo o estoque do depósito neste exato momento. Isso garante que as divergências sejam calculadas sobre o estoque real no início da contagem.
              </p>
            </div>
            <Button onClick={() => setShowIniciar(true)} className="gradient-primary text-primary-foreground gap-1.5">
              <Play className="w-4 h-4" /> Iniciar Contagem
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards (not for rascunho) */}
      {!isRascunho && (
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
          {!isContagem && (
            <Card className="bg-card shadow-card">
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Divergências</p>
                <p className={cn('text-2xl font-bold tabular-nums', divergencias > 0 ? 'text-warning' : 'text-success')}>
                  {divergencias}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search bar (only during counting) */}
      {isContagem && (
        <Card className="bg-card shadow-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="font-mono text-xs">
                Contagem #{maxContagem}
              </Badge>
              {maxContagem > 1 && (
                <span className="text-xs text-muted-foreground">Recontagem de itens divergentes</span>
              )}
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Bipe o código de barras ou busque por nome…"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Input
                type="number"
                min="0.01"
                step="1"
                value={qtdInput}
                onChange={e => setQtdInput(e.target.value)}
                className="w-24 text-center font-mono"
                placeholder="Qtd"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border border-border rounded-lg divide-y divide-border bg-popover max-h-64 overflow-y-auto">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAddProduto(p)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.ean && `EAN: ${p.ean} · `}{p.sku && `SKU: ${p.sku}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      Est: {estoqueMap[p.id] ?? 0}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items Table with tabs for contagens */}
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
                {isContagem ? 'Comece bipando ou buscando um produto acima.' : 'Nenhum item nesta contagem.'}
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
                      <TableHead className="font-semibold text-right">Esperado (Snapshot)</TableHead>
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
                      <TableCell className="text-right font-mono font-semibold tabular-nums">
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

      {/* ── Dialogs ── */}
      <Dialog open={showIniciar} onOpenChange={setShowIniciar}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar Contagem?</DialogTitle>
            <DialogDescription>
              O sistema vai capturar um snapshot de todo o estoque do depósito <strong>{depositoNome}</strong> neste momento. As divergências serão calculadas com base neste snapshot.
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
              O sistema vai comparar as quantidades contadas com o snapshot capturado no início e calcular as divergências.
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
              Uma nova contagem será criada apenas para os {divergencias} item(ns) com divergência. O inventário voltará ao status "Em Contagem".
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
