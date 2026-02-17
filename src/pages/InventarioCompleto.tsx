import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Play, RefreshCw,
  FileText, Search, Filter, Printer, ArrowDownCircle, ArrowUpCircle,
  Equal, AlertTriangle, Package, ClipboardList,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useInventarioItens, useAdicionarItemInventario,
  useFinalizarInventario, useAplicarAjustesInventario,
  useCancelarInventario, useInventarios, useIniciarInventario,
  useIniciarRecontagem, useInventarioSnapshot,
} from '@/hooks/useInventarios';
import { useProdutos, Produto } from '@/hooks/useProdutos';
import { useDepositos } from '@/hooks/useDepositos';
import { useCategorias } from '@/hooks/useCategorias';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function InventarioCompleto() {
  const { id: inventarioId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inventarios = [] } = useInventarios();
  const inventario = inventarios.find(i => i.id === inventarioId);
  const { data: itens = [], isLoading: itensLoading } = useInventarioItens(inventarioId);
  const { data: snapshotItems = [] } = useInventarioSnapshot(inventarioId);
  const { data: produtos = [] } = useProdutos();
  const { data: depositos = [] } = useDepositos();
  const { data: categorias = [] } = useCategorias();

  const addItem = useAdicionarItemInventario();
  const iniciar = useIniciarInventario();
  const finalizar = useFinalizarInventario();
  const aplicar = useAplicarAjustesInventario();
  const cancelar = useCancelarInventario();
  const recontagem = useIniciarRecontagem();

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [filtroMarca, setFiltroMarca] = useState('all');
  const [showIniciar, setShowIniciar] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showAplicar, setShowAplicar] = useState(false);
  const [showRecontagem, setShowRecontagem] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const editInputRef = useRef<HTMLInputElement>(null);

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

  const categoriaMap = useMemo(() => {
    const m: Record<string, string> = {};
    categorias.forEach(c => { m[c.id] = c.nome; });
    return m;
  }, [categorias]);

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

  // Build the full product list from snapshot
  const itensMap = useMemo(() => {
    const m: Record<string, { qtd_contada: number; qtd_sistema: number | null; diferenca: number | null }> = {};
    currentItens.forEach(i => {
      m[i.produto_id] = { qtd_contada: i.qtd_contada, qtd_sistema: i.qtd_sistema, diferenca: i.diferenca };
    });
    return m;
  }, [currentItens]);

  // All unique marcas from snapshot products
  const marcas = useMemo(() => {
    const set = new Set<string>();
    snapshotItems.forEach(s => {
      const p = produtoMap[s.produto_id];
      if (p?.marca) set.add(p.marca);
    });
    return Array.from(set).sort();
  }, [snapshotItems, produtoMap]);

  // All unique categorias from snapshot products
  const categoriasUsadas = useMemo(() => {
    const set = new Set<string>();
    snapshotItems.forEach(s => {
      const p = produtoMap[s.produto_id];
      if (p?.categoria_id) set.add(p.categoria_id);
    });
    return Array.from(set);
  }, [snapshotItems, produtoMap]);

  // Full product list with filters
  const listaCompleta = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return snapshotItems
      .map(s => {
        const p = produtoMap[s.produto_id];
        const contado = itensMap[s.produto_id];
        return {
          snapshotId: s.id,
          produtoId: s.produto_id,
          produto: p,
          qtdEsperada: s.qtd_esperada,
          qtdContada: contado?.qtd_contada ?? null,
          qtdSistema: contado?.qtd_sistema ?? null,
          diferenca: contado?.diferenca ?? null,
        };
      })
      .filter(item => {
        if (!item.produto) return false;
        const p = item.produto;
        if (q && !(
          p.nome.toLowerCase().includes(q) ||
          (p.ean && p.ean.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
        )) return false;
        if (filtroCategoria !== 'all' && p.categoria_id !== filtroCategoria) return false;
        if (filtroMarca !== 'all' && p.marca !== filtroMarca) return false;
        return true;
      })
      .sort((a, b) => (a.produto?.nome || '').localeCompare(b.produto?.nome || ''));
  }, [snapshotItems, produtoMap, itensMap, busca, filtroCategoria, filtroMarca]);

  // Stats
  const totalSnapshot = snapshotItems.length;
  const totalContados = Object.keys(itensMap).length;
  const faltando = totalSnapshot - totalContados;
  const divergencias = currentItens.filter(i => i.diferenca !== null && i.diferenca !== 0).length;

  // Inline edit handlers
  const handleStartEdit = useCallback((produtoId: string, currentQtd: number | null) => {
    if (!isContagem) return;
    setEditingId(produtoId);
    setEditValue(currentQtd !== null ? String(currentQtd) : '');
    setTimeout(() => editInputRef.current?.focus(), 30);
  }, [isContagem]);

  const handleSaveEdit = useCallback(async (produtoId: string) => {
    if (!inventarioId) return;
    const qtd = parseFloat(editValue);
    if (isNaN(qtd) || qtd < 0) {
      toast.error('Quantidade inválida');
      return;
    }

    // We need to set the exact quantity. Since addItem does upsert with addition,
    // we need to calculate the delta or use a direct approach.
    const existing = itensMap[produtoId];
    const currentQtd = existing?.qtd_contada ?? 0;
    const delta = qtd - currentQtd;

    if (delta === 0) {
      setEditingId(null);
      return;
    }

    if (existing) {
      // Update by adding delta
      await addItem.mutateAsync({ inventarioId, produtoId, qtd: delta, contagem: maxContagem });
    } else {
      // New item
      await addItem.mutateAsync({ inventarioId, produtoId, qtd, contagem: maxContagem });
    }

    setEditingId(null);
    toast.success('Quantidade salva', { duration: 1200 });
  }, [inventarioId, editValue, itensMap, addItem, maxContagem]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent, produtoId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(produtoId);
    }
    if (e.key === 'Escape') {
      setEditingId(null);
    }
    // Tab to next row
    if (e.key === 'Tab') {
      e.preventDefault();
      handleSaveEdit(produtoId).then(() => {
        const idx = listaCompleta.findIndex(i => i.produtoId === produtoId);
        const next = listaCompleta[idx + (e.shiftKey ? -1 : 1)];
        if (next) {
          handleStartEdit(next.produtoId, next.qtdContada);
        }
      });
    }
  }, [handleSaveEdit, listaCompleta, handleStartEdit]);

  // Focus edit input
  useEffect(() => {
    if (editingId) {
      setTimeout(() => editInputRef.current?.focus(), 30);
    }
  }, [editingId]);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Action handlers
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
    navigate('/estoque/inventarios');
  };

  if (!inventario) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Inventário não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/estoque/inventarios')}>Voltar</Button>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/estoque/inventarios/${inventarioId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-foreground">Inventário Completo</h1>
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
          <Button variant="outline" size="sm" onClick={() => navigate(`/estoque/inventarios/${inventarioId}`)} className="gap-1.5">
            <ClipboardList className="w-4 h-4" /> Modo Rápido
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          {isContagem && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelar} className="text-destructive border-destructive/30">
                <XCircle className="w-4 h-4 mr-1.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={() => setShowFinalizar(true)} disabled={totalContados === 0} className="gradient-primary text-primary-foreground gap-1.5">
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

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Inventário Completo — {depositoNome}</h1>
        <p className="text-sm text-muted-foreground">
          {inventario.observacao && `${inventario.observacao} · `}
          Impresso em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Rascunho */}
      {isRascunho && (
        <Card className="bg-card shadow-card border-dashed border-2 border-border">
          <CardContent className="pt-6 flex flex-col items-center justify-center py-16 gap-4">
            <FileText className="w-16 h-16 text-muted-foreground/30" />
            <div className="text-center space-y-1">
              <p className="font-semibold text-foreground">Inventário em Rascunho</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Inicie a contagem para carregar todos os produtos do depósito.
              </p>
            </div>
            <Button onClick={() => setShowIniciar(true)} className="gradient-primary text-primary-foreground gap-1.5">
              <Play className="w-4 h-4" /> Iniciar Contagem
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats + Filters */}
      {!isRascunho && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
            <Card className="bg-card shadow-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Produtos</p>
                <p className="text-xl font-bold tabular-nums text-foreground">{totalSnapshot}</p>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Contados</p>
                <p className="text-xl font-bold tabular-nums text-foreground">{totalContados}</p>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Faltando</p>
                <p className={cn('text-xl font-bold tabular-nums', faltando > 0 ? 'text-warning' : 'text-success')}>{faltando}</p>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Divergências</p>
                <p className={cn('text-xl font-bold tabular-nums', divergencias > 0 ? 'text-warning' : 'text-success')}>{divergencias}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto, EAN ou SKU…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categoriasUsadas.map(cId => (
                  <SelectItem key={cId} value={cId}>{categoriaMap[cId] || cId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroMarca} onValueChange={setFiltroMarca}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas marcas</SelectItem>
                {marcas.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contagem tabs */}
          {contagensList.length > 1 && !isContagem && (
            <Tabs value={String(activeContagem)} onValueChange={v => setSelectedContagem(Number(v))} className="print:hidden">
              <TabsList>
                {contagensList.map(c => (
                  <TabsTrigger key={c} value={String(c)} className="font-mono text-xs">
                    {c === 1 ? '1ª Contagem' : `Recontagem #${c}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Full product table */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            {itensLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : listaCompleta.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Package className="w-12 h-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhum produto encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Produto</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Categoria</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Marca</TableHead>
                    <TableHead className="font-semibold text-right">Esperado</TableHead>
                    <TableHead className="font-semibold text-right w-32">Contado</TableHead>
                    {!isContagem && (
                      <TableHead className="font-semibold text-right">Diferença</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaCompleta.map(item => {
                    const p = item.produto!;
                    const dif = item.diferenca ?? 0;
                    const isEditing = editingId === item.produtoId;
                    const hasCount = item.qtdContada !== null;

                    return (
                      <TableRow
                        key={item.produtoId}
                        className={cn(
                          'transition-colors',
                          !hasCount && isContagem && 'bg-warning/5',
                          hasCount && 'bg-success/5',
                        )}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground text-sm">{p.nome}</p>
                            <p className="text-xs text-muted-foreground print:hidden">
                              {p.ean && `EAN: ${p.ean}`}{p.sku && ` · SKU: ${p.sku}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {p.categoria_id ? categoriaMap[p.categoria_id] || '—' : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {p.marca || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          {item.qtdEsperada}
                        </TableCell>
                        <TableCell className="text-right">
                          {isContagem ? (
                            isEditing ? (
                              <Input
                                ref={editInputRef}
                                type="number"
                                min="0"
                                step="1"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => handleEditKeyDown(e, item.produtoId)}
                                onBlur={() => handleSaveEdit(item.produtoId)}
                                className="h-8 w-20 text-right font-mono text-sm ml-auto"
                              />
                            ) : (
                              <button
                                onClick={() => handleStartEdit(item.produtoId, item.qtdContada)}
                                className={cn(
                                  'inline-flex items-center justify-end h-8 px-2 rounded font-mono font-semibold tabular-nums text-sm min-w-[5rem] transition-colors',
                                  hasCount
                                    ? 'text-foreground bg-background border border-border hover:border-primary'
                                    : 'text-muted-foreground/50 bg-muted/50 border border-dashed border-border hover:border-primary hover:bg-background'
                                )}
                              >
                                {hasCount ? item.qtdContada : '—'}
                              </button>
                            )
                          ) : (
                            <span className="font-mono font-semibold tabular-nums text-sm">
                              {item.qtdContada ?? '—'}
                            </span>
                          )}
                        </TableCell>
                        {!isContagem && (
                          <TableCell className="text-right">
                            {item.qtdContada !== null ? (
                              <span className={cn(
                                'inline-flex items-center gap-1 font-mono font-semibold tabular-nums text-sm',
                                dif > 0 && 'text-success',
                                dif < 0 && 'text-destructive',
                                dif === 0 && 'text-muted-foreground',
                              )}>
                                {dif > 0 && <ArrowUpCircle className="w-3.5 h-3.5" />}
                                {dif < 0 && <ArrowDownCircle className="w-3.5 h-3.5" />}
                                {dif === 0 && <Equal className="w-3.5 h-3.5" />}
                                {dif > 0 ? '+' : ''}{dif}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 text-sm">—</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground print:hidden">
              {listaCompleta.length} de {totalSnapshot} produtos · Clique na coluna "Contado" para editar
            </div>
          </div>
        </>
      )}

      {/* ── Confirm Dialogs ── */}
      <Dialog open={showIniciar} onOpenChange={setShowIniciar}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar Contagem Completa?</DialogTitle>
            <DialogDescription>
              O sistema vai capturar um snapshot de todo o estoque do depósito <strong>{depositoNome}</strong> e gerar a lista de contagem.
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
              {totalContados} de {totalSnapshot} produtos contados. {faltando > 0 && `${faltando} produtos sem contagem serão considerados como 0.`}
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
              O estoque será ajustado conforme a contagem. {divergencias} divergência(s) gerarão movimentações de ajuste.
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
              Nova contagem para os {divergencias} item(ns) divergentes.
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
