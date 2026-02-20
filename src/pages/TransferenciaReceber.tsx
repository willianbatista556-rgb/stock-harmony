import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, ScanBarcode, CheckCircle2, Clock, MinusCircle,
  RotateCcw, AlertTriangle, Keyboard, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemRow {
  id: string;
  produto_id: string;
  qtd: number;
  qtd_conferida: number;
  nome_snapshot: string | null;
}

interface ScanResult {
  produto_nome: string;
  qtd_esperada: number;
  qtd_conferida: number;
  status: 'ok' | 'pendente';
}

export default function TransferenciaReceber() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const inputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<string>('');
  const [origemNome, setOrigemNome] = useState('');
  const [destinoNome, setDestinoNome] = useState('');
  const [itens, setItens] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [manualQty, setManualQty] = useState<number | null>(null);
  const [showQtyInput, setShowQtyInput] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [showJustificativa, setShowJustificativa] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const totalEsperado = useMemo(() => itens.reduce((s, i) => s + i.qtd, 0), [itens]);
  const totalConferido = useMemo(() => itens.reduce((s, i) => s + i.qtd_conferida, 0), [itens]);
  const todosConferidos = useMemo(() => itens.length > 0 && itens.every(i => i.qtd_conferida === i.qtd), [itens]);
  const temDivergencia = useMemo(() => itens.some(i => i.qtd_conferida > 0 && i.qtd_conferida !== i.qtd), [itens]);
  const itensNaoConferidos = useMemo(() => itens.filter(i => i.qtd_conferida === 0), [itens]);
  const itensDivergentes = useMemo(() => itens.filter(i => i.qtd_conferida > 0 && i.qtd_conferida !== i.qtd), [itens]);
  const progressPct = totalEsperado > 0 ? Math.min(100, (totalConferido / totalEsperado) * 100) : 0;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transferencias')
        .select(`
          id, status,
          origem:depositos!transferencias_origem_id_fkey(nome),
          destino:depositos!transferencias_destino_id_fkey(nome),
          transferencia_itens(id, produto_id, qtd, qtd_conferida, nome_snapshot)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setStatus(data.status);
      setOrigemNome((data.origem as any)?.nome || '—');
      setDestinoNome((data.destino as any)?.nome || '—');
      setItens((data.transferencia_itens || []) as ItemRow[]);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar transferência');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading) setTimeout(() => inputRef.current?.focus(), 100);
  }, [loading]);

  const handleScan = useCallback(async () => {
    if (!barcode.trim() || scanning || !id) return;
    setScanning(true);
    const quantidade = manualQty ?? 1;
    try {
      const { data, error } = await supabase.rpc('transferencia_bipar_item', {
        p_transferencia_id: id,
        p_barcode: barcode.trim(),
        p_quantidade: quantidade,
      });
      if (error) throw error;
      const result = data as unknown as ScanResult;
      setLastScan(result);
      await load();

      if (result.status === 'ok') {
        toast.success(`✓ ${result.produto_nome} — conferido!`);
      } else {
        toast(`${result.produto_nome} — ${result.qtd_conferida}/${result.qtd_esperada}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao bipar');
    } finally {
      setBarcode('');
      setManualQty(null);
      setShowQtyInput(false);
      setScanning(false);
      inputRef.current?.focus();
    }
  }, [barcode, scanning, id, manualQty, load]);

  const handleReset = async () => {
    if (!id) return;
    try {
      const { error } = await supabase.rpc('transferencia_resetar_conferencia', {
        p_transferencia_id: id,
      });
      if (error) throw error;
      await load();
      setLastScan(null);
      setShowJustificativa(false);
      setJustificativa('');
      toast.success('Conferência resetada');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTentarConfirmar = () => {
    if (temDivergencia || itensNaoConferidos.length > 0) {
      setShowJustificativa(true);
    } else {
      handleConfirmar();
    }
  };

  const handleConfirmar = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      const { error } = await supabase.rpc('transferencia_confirmar', {
        p_transferencia_id: id,
        p_justificativa: justificativa || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-deposito'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      toast.success('Transferência confirmada! Estoque movimentado.');
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao confirmar');
    } finally {
      setConfirming(false);
    }
  };

  // Hotkeys
  useEffect(() => {
    if (showJustificativa) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        e.preventDefault();
        setShowQtyInput(true);
        setTimeout(() => qtyInputRef.current?.focus(), 50);
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleTentarConfirmar();
      }
      if (e.key === 'Escape' && showQtyInput) {
        e.preventDefault();
        setShowQtyInput(false);
        setManualQty(null);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showJustificativa, showQtyInput, temDivergencia, itensNaoConferidos.length]);

  const getItemStatus = (item: ItemRow) => {
    if (item.qtd_conferida === 0) return { label: 'Aguardando', icon: Clock, className: 'text-muted-foreground' };
    if (item.qtd_conferida === item.qtd) return { label: 'OK', icon: CheckCircle2, className: 'text-success' };
    return { label: 'Falta', icon: MinusCircle, className: 'text-destructive' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-muted-foreground">Carregando transferência...</div>
      </div>
    );
  }

  if (status === 'confirmada') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <CheckCircle2 className="w-16 h-16 text-success" />
        <h2 className="text-xl font-semibold">Transferência já confirmada</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  if (status !== 'em_recebimento') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="w-16 h-16 text-warning" />
        <h2 className="text-xl font-semibold">Transferência não está em recebimento</h2>
        <p className="text-muted-foreground">Status atual: {status}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ScanBarcode className="w-5 h-5 text-primary" />
              Receber Transferência
            </h1>
            <p className="text-sm text-muted-foreground">
              {origemNome} → {destinoNome}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
          Em Recebimento
        </Badge>
      </div>

      {/* Hotkeys bar */}
      {!showJustificativa && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Keyboard className="w-3.5 h-3.5 shrink-0" />
          <span><kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">Enter</kbd> Bipar</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">F6</kbd> Quantidade</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">F9</kbd> Finalizar</span>
        </div>
      )}

      {/* Scan input */}
      {!showJustificativa && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                placeholder="Bipe ou digite EAN/SKU..."
                className="pl-10 text-lg h-12 font-mono"
                autoFocus
                disabled={scanning}
              />
            </div>
            {manualQty !== null && (
              <Badge variant="outline" className="h-12 px-4 text-lg font-mono border-primary text-primary self-center">
                ×{manualQty}
              </Badge>
            )}
            <Button onClick={handleScan} disabled={!barcode.trim() || scanning} className="h-12 px-6">
              Bipar
            </Button>
          </div>

          {showQtyInput && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-2">
              <span className="text-sm font-medium text-primary">Quantidade:</span>
              <Input
                ref={qtyInputRef}
                type="number"
                min={1}
                className="w-24 h-8 text-center font-mono"
                placeholder="1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (val > 0) {
                      setManualQty(val);
                      setShowQtyInput(false);
                      inputRef.current?.focus();
                    }
                  }
                  if (e.key === 'Escape') {
                    setShowQtyInput(false);
                    setManualQty(null);
                    inputRef.current?.focus();
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">Enter p/ confirmar, Esc p/ cancelar</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Dica: use leitor USB. Ele "digita" e envia Enter automaticamente.
          </p>
        </div>
      )}

      {/* Last scan feedback */}
      {lastScan && !showJustificativa && (
        <div className={cn(
          "rounded-lg border p-3 text-sm animate-in fade-in slide-in-from-top-1 duration-200",
          lastScan.status === 'ok' && "bg-success/10 border-success/30 text-success",
          lastScan.status === 'pendente' && "bg-primary/10 border-primary/30 text-primary",
        )}>
          <strong>{lastScan.produto_nome}</strong> — {lastScan.qtd_conferida}/{lastScan.qtd_esperada}
          {lastScan.status === 'ok' && ' ✓'}
        </div>
      )}

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Progresso: <strong className="text-foreground">{totalConferido}</strong> / {totalEsperado} itens
          </span>
          <div className="flex gap-2">
            {todosConferidos && (
              <Badge className="bg-success/10 text-success border-success/30">Tudo conferido!</Badge>
            )}
            {temDivergencia && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                <AlertTriangle className="w-3 h-3" /> Divergência
              </Badge>
            )}
          </div>
        </div>
        <Progress value={progressPct} className="h-2.5" />
        <p className="text-xs text-muted-foreground text-right">{progressPct.toFixed(0)}%</p>
      </div>

      {/* Items table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Produto</TableHead>
              <TableHead className="font-semibold text-center w-20">Enviado</TableHead>
              <TableHead className="font-semibold text-center w-20">Recebido</TableHead>
              <TableHead className="font-semibold text-center w-20">Falta</TableHead>
              <TableHead className="font-semibold text-center w-20">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((item) => {
              const itemStatus = getItemStatus(item);
              const StatusIcon = itemStatus.icon;
              const falta = item.qtd - item.qtd_conferida;
              const isLastScanned = lastScan?.produto_nome === item.nome_snapshot;
              return (
                <TableRow key={item.id} className={cn(
                  falta !== 0 && item.qtd_conferida > 0 && "bg-destructive/5",
                  item.qtd_conferida === item.qtd && "bg-success/5",
                  isLastScanned && "ring-1 ring-primary/30 bg-primary/5"
                )}>
                  <TableCell className="font-medium">{item.nome_snapshot || 'Produto'}</TableCell>
                  <TableCell className="text-center">{item.qtd}</TableCell>
                  <TableCell className="text-center font-bold">{item.qtd_conferida}</TableCell>
                  <TableCell className="text-center">
                    {falta > 0 ? (
                      <span className="font-bold text-destructive">-{falta}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusIcon className={cn("w-4 h-4 inline", itemStatus.className)} />
                  </TableCell>
                </TableRow>
              );
            })}
            {!itens.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum item nesta transferência
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Divergence justification */}
      {showJustificativa && (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Resumo de Divergências
          </div>

          {itensDivergentes.length > 0 && (
            <div className="space-y-1">
              {itensDivergentes.map(item => {
                const diff = item.qtd_conferida - item.qtd;
                return (
                  <p key={item.id} className="text-sm">
                    <strong>{item.nome_snapshot}</strong>: enviado {item.qtd}, recebido {item.qtd_conferida}{' '}
                    <span className="font-bold text-destructive">({diff})</span>
                  </p>
                );
              })}
            </div>
          )}

          {itensNaoConferidos.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{itensNaoConferidos.length} item(ns) não conferido(s):</p>
              {itensNaoConferidos.map(item => (
                <p key={item.id} className="text-sm">
                  <strong>{item.nome_snapshot}</strong>: enviado {item.qtd}, recebido 0{' '}
                  <span className="font-bold text-destructive">(-{item.qtd})</span>
                </p>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Justificativa obrigatória <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: 2 unidades chegaram danificadas, produto X não veio na caixa..."
              rows={3}
              className="resize-none"
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowJustificativa(false)}>
              Voltar à bipagem
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!justificativa.trim() || confirming}
              onClick={handleConfirmar}
              className="gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Confirmar com Divergência
            </Button>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      {!showJustificativa && (
        <div className="flex justify-between pt-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" /> Resetar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button
              onClick={handleTentarConfirmar}
              disabled={confirming || totalConferido === 0}
              className={cn("gap-1", todosConferidos ? "bg-success hover:bg-success/90" : "bg-warning hover:bg-warning/90")}
            >
              <Check className="w-4 h-4" />
              {todosConferidos ? 'Confirmar Transferência' : 'Finalizar Conferência'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
