import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Wifi, WifiOff, ScanBarcode, Plus, Trash2, ArrowLeft,
  Upload, CheckCircle, PackageSearch, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useOnlineStatus,
  getInventarioOffline,
  adicionarItemOffline,
  atualizarQtdItemOffline,
  removerItemOffline,
  type OfflineInventario,
  type OfflineContagemItem,
} from '@/lib/offline';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function InventarioOfflineContagem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { profile, user } = useAuth();

  const [inv, setInv] = useState<OfflineInventario | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [showQtdDialog, setShowQtdDialog] = useState(false);
  const [editingEan, setEditingEan] = useState('');
  const [editingQtd, setEditingQtd] = useState('');
  const [syncing, setSyncing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load inventory from IndexedDB
  useEffect(() => {
    if (!id) return;
    getInventarioOffline(id).then(data => {
      setInv(data);
      setLoading(false);
    });
  }, [id]);

  // Auto-focus scan input
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Barcode scan handler — additive
  const handleScan = useCallback(async () => {
    const ean = scanInput.trim();
    if (!ean || !id) return;

    const updated = await adicionarItemOffline(id, {
      ean,
      nome: ean, // Will be resolved on sync
      produtoId: null,
      qtd: 1,
    });

    if (updated) {
      setInv({ ...updated });
      toast.success(`+1 ${ean}`, { duration: 1000 });
    }

    setScanInput('');
    inputRef.current?.focus();
  }, [scanInput, id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  }, [handleScan]);

  // Edit quantity
  const openEditQtd = (item: OfflineContagemItem) => {
    setEditingEan(item.ean);
    setEditingQtd(String(item.qtd));
    setShowQtdDialog(true);
  };

  const saveQtd = async () => {
    if (!id) return;
    const qtd = parseInt(editingQtd);
    if (isNaN(qtd) || qtd < 0) { toast.error('Quantidade inválida'); return; }

    const updated = await atualizarQtdItemOffline(id, editingEan, qtd);
    if (updated) setInv({ ...updated });
    setShowQtdDialog(false);
  };

  // Remove item
  const handleRemove = async (ean: string) => {
    if (!id) return;
    const updated = await removerItemOffline(id, ean);
    if (updated) setInv({ ...updated });
    toast.success('Item removido');
  };

  // Sync to server
  const handleSync = async () => {
    if (!online) { toast.error('Sem conexão com a internet'); return; }
    if (!inv || !profile?.empresa_id || !user?.id) { toast.error('Dados insuficientes'); return; }
    if (inv.itens.length === 0) { toast.error('Nenhum item para sincronizar'); return; }

    setSyncing(true);
    try {
      // Resolve product IDs by EAN
      const eans = inv.itens.map(i => i.ean);
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, ean, nome')
        .eq('empresa_id', profile.empresa_id)
        .in('ean', eans);

      const eanMap = new Map(produtos?.map(p => [p.ean!, p]) || []);

      // Get default deposito
      const { data: depositos } = await supabase
        .from('depositos')
        .select('id')
        .eq('empresa_id', profile.empresa_id)
        .limit(1);

      const depositoId = depositos?.[0]?.id;
      if (!depositoId) {
        toast.error('Nenhum depósito encontrado. Crie um depósito antes de sincronizar.');
        setSyncing(false);
        return;
      }

      // Create inventory
      const { data: newInv, error: invError } = await supabase
        .from('inventarios')
        .insert({
          empresa_id: profile.empresa_id,
          deposito_id: depositoId,
          usuario_id: user.id,
          status: 'em_andamento',
          observacao: `[Offline] ${inv.descricao}`,
        })
        .select()
        .single();

      if (invError) throw invError;

      // Insert items (only those with matched products)
      const matched = inv.itens
        .filter(i => eanMap.has(i.ean))
        .map(i => ({
          inventario_id: newInv.id,
          produto_id: eanMap.get(i.ean)!.id,
          qtd_contada: i.qtd,
          nome_snapshot: eanMap.get(i.ean)!.nome,
        }));

      const unmatched = inv.itens.filter(i => !eanMap.has(i.ean));

      if (matched.length > 0) {
        const { error: itemsError } = await supabase
          .from('inventario_itens')
          .insert(matched);
        if (itemsError) throw itemsError;
      }

      // Mark as synced
      const { marcarSincronizado } = await import('@/lib/offline');
      await marcarSincronizado(inv.id);
      setInv(prev => prev ? { ...prev, sincronizado: true, sincronizadoEm: Date.now() } : prev);

      const msg = unmatched.length > 0
        ? `Sincronizado! ${matched.length} itens enviados, ${unmatched.length} EANs não encontrados.`
        : `Sincronizado com sucesso! ${matched.length} itens enviados.`;

      toast.success(msg, { duration: 5000 });
    } catch (err: any) {
      toast.error('Erro ao sincronizar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSyncing(false);
    }
  };

  const totalItens = useMemo(() =>
    inv?.itens.reduce((sum, i) => sum + i.qtd, 0) ?? 0,
    [inv?.itens]
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Carregando contagem…</p>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <PackageSearch className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Inventário não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/inventario-offline')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/inventario-offline')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-base font-display font-bold text-foreground">Contagem Offline</h1>
            <p className="text-xs text-muted-foreground">{inv.descricao}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(
            'gap-1.5',
            online ? 'text-success border-success/30' : 'text-destructive border-destructive/30'
          )}>
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'Online' : 'Offline'}
          </Badge>

          {inv.sincronizado ? (
            <Badge className="bg-success/10 text-success border-success/20 gap-1">
              <CheckCircle className="w-3 h-3" /> Sincronizado
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing || !online || inv.itens.length === 0}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {syncing ? 'Enviando…' : 'Sincronizar'}
            </Button>
          )}
        </div>
      </div>

      {/* Scan Input — large touch-friendly */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bipe ou digite o código de barras…"
              className="pl-11 h-14 text-lg font-mono"
              autoComplete="off"
              inputMode="numeric"
            />
          </div>
          <Button onClick={handleScan} className="h-14 px-6 gap-2">
            <Plus className="w-5 h-5" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            <Hash className="w-3.5 h-3.5 inline mr-1" />
            <strong className="text-foreground">{inv.itens.length}</strong> SKUs
          </span>
          <span className="text-sm text-muted-foreground">
            <strong className="text-foreground">{totalItens}</strong> unidades
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto px-4 pb-6">
        {inv.itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ScanBarcode className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum item bipado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Escaneie um código de barras para começar.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv.itens.map(item => (
                <TableRow key={item.ean}>
                  <TableCell>
                    <span className="font-mono text-sm">{item.ean}</span>
                    {item.nome !== item.ean && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.nome}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditQtd(item)}
                      className="font-mono font-bold text-lg tabular-nums min-w-[3rem]"
                    >
                      {item.qtd}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.ean)}
                      className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit Quantity Dialog */}
      <Dialog open={showQtdDialog} onOpenChange={setShowQtdDialog}>
        <DialogContent className="bg-card max-w-xs">
          <DialogHeader>
            <DialogTitle>Alterar Quantidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-mono">{editingEan}</p>
            <Input
              type="number"
              min="0"
              value={editingQtd}
              onChange={e => setEditingQtd(e.target.value)}
              className="text-center text-2xl font-mono h-14"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveQtd()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQtdDialog(false)}>Cancelar</Button>
            <Button onClick={saveQtd}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
