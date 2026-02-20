import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, RotateCcw, ScanBarcode, AlertTriangle, CheckCircle2, Clock, MinusCircle, Keyboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Transferencia } from '@/hooks/useTransferencias';
import { useConfirmarTransferencia } from '@/hooks/useTransferencias';

interface Props {
  transferencia: Transferencia;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScanResult {
  produto_nome: string;
  qtd_esperada: number;
  qtd_conferida: number;
  status: 'ok' | 'pendente';
}

export default function ConferenciaModal({ transferencia, open, onOpenChange }: Props) {
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [showJustificativa, setShowJustificativa] = useState(false);
  const [manualQty, setManualQty] = useState<number | null>(null);
  const [showQtyInput, setShowQtyInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const confirmar = useConfirmarTransferencia();

  const itens = transferencia.transferencia_itens || [];
  const totalEsperado = itens.reduce((s, i) => s + i.qtd, 0);
  const totalConferido = itens.reduce((s, i) => s + (i.qtd_conferida || 0), 0);
  const todosConferidos = itens.every(i => (i.qtd_conferida || 0) === i.qtd);
  const temDivergencia = itens.some(i => {
    const conf = i.qtd_conferida || 0;
    return conf > 0 && conf !== i.qtd;
  });
  const itensDivergentes = itens.filter(i => {
    const conf = i.qtd_conferida || 0;
    return conf > 0 && conf !== i.qtd;
  });
  const itensNaoConferidos = itens.filter(i => (i.qtd_conferida || 0) === 0);
  const progressPct = totalEsperado > 0 ? Math.min(100, (totalConferido / totalEsperado) * 100) : 0;

  useEffect(() => {
    if (open) {
      setShowJustificativa(false);
      setJustificativa('');
      setLastScan(null);
      setManualQty(null);
      setShowQtyInput(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleScan = useCallback(async (qty?: number) => {
    if (!barcode.trim() || scanning) return;
    setScanning(true);
    const quantidade = qty ?? manualQty ?? 1;
    try {
      const { data, error } = await supabase.rpc('transferencia_bipar_item', {
        p_transferencia_id: transferencia.id,
        p_barcode: barcode.trim(),
        p_quantidade: quantidade,
      });
      if (error) throw error;
      const result = data as unknown as ScanResult;
      setLastScan(result);
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });

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
  }, [barcode, scanning, transferencia.id, queryClient, manualQty]);

  // Hotkeys: F6 = quantity, F9 = finalize, Esc = close qty input
  useEffect(() => {
    if (!open || showJustificativa) return;

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
        e.stopPropagation();
        setShowQtyInput(false);
        setManualQty(null);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, showJustificativa, showQtyInput]);

  const handleReset = async () => {
    try {
      const { error } = await supabase.rpc('transferencia_resetar_conferencia', {
        p_transferencia_id: transferencia.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
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

  const handleConfirmar = () => {
    confirmar.mutate({ id: transferencia.id, justificativa: justificativa || undefined }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const getItemStatus = (item: { qtd: number; qtd_conferida?: number }) => {
    const conf = item.qtd_conferida || 0;
    if (conf === 0) return { label: 'Aguardando', icon: Clock, className: 'text-muted-foreground' };
    if (conf === item.qtd) return { label: 'OK', icon: CheckCircle2, className: 'text-success' };
    return { label: 'Falta', icon: MinusCircle, className: 'text-destructive' };
  };

  const getDiferenca = (item: { qtd: number; qtd_conferida?: number }) => {
    const conf = item.qtd_conferida || 0;
    const diff = conf - item.qtd;
    if (diff === 0) return null;
    return diff;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onEscapeKeyDown={(e) => { if (showQtyInput) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-primary" />
            Conferência por Código de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hotkeys hint */}
          {!showJustificativa && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Keyboard className="w-3.5 h-3.5 shrink-0" />
              <span><kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">Enter</kbd> Bipar</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">F6</kbd> Quantidade</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">F9</kbd> Finalizar</span>
            </div>
          )}

          {/* Scan input + quantity */}
          {!showJustificativa && (
            <div className="space-y-2">
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
                <Button onClick={() => handleScan()} disabled={!barcode.trim() || scanning} className="h-12 px-6">
                  Bipar
                </Button>
              </div>

              {/* Manual quantity input (F6) */}
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
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  todosConferidos ? "bg-success" : temDivergencia ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{progressPct.toFixed(0)}%</p>
          </div>

          {/* Items table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center w-20">Enviado</TableHead>
                  <TableHead className="text-center w-20">Recebido</TableHead>
                  <TableHead className="text-center w-20">Diferença</TableHead>
                  <TableHead className="text-center w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => {
                  const status = getItemStatus(item);
                  const StatusIcon = status.icon;
                  const diff = getDiferenca(item);
                  const isLastScanned = lastScan?.produto_nome === item.nome_snapshot;
                  return (
                    <TableRow key={item.id} className={cn(
                      diff !== null && diff !== 0 && "bg-destructive/5",
                      isLastScanned && "ring-1 ring-primary/30 bg-primary/5"
                    )}>
                      <TableCell className="font-medium">{item.nome_snapshot || 'Produto'}</TableCell>
                      <TableCell className="text-center">{item.qtd}</TableCell>
                      <TableCell className="text-center font-bold">{item.qtd_conferida || 0}</TableCell>
                      <TableCell className="text-center">
                        {diff !== null ? (
                          <span className={cn(
                            "font-bold",
                            diff > 0 ? "text-warning" : "text-destructive"
                          )}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusIcon className={cn("w-4 h-4 inline", status.className)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Divergence summary + justificativa */}
          {showJustificativa && (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Resumo de Divergências
              </div>

              {itensDivergentes.length > 0 && (
                <div className="space-y-1">
                  {itensDivergentes.map(item => {
                    const diff = (item.qtd_conferida || 0) - item.qtd;
                    return (
                      <p key={item.id} className="text-sm">
                        <strong>{item.nome_snapshot}</strong>: enviado {item.qtd}, recebido {item.qtd_conferida || 0}{' '}
                        <span className={cn("font-bold", diff > 0 ? "text-warning" : "text-destructive")}>
                          ({diff > 0 ? `+${diff}` : diff})
                        </span>
                      </p>
                    );
                  })}
                </div>
              )}

              {itensNaoConferidos.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {itensNaoConferidos.length} item(ns) não conferido(s):
                  </p>
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
                  disabled={!justificativa.trim() || confirmar.isPending}
                  onClick={handleConfirmar}
                  className="gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmar com Divergência
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!showJustificativa && (
            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5" /> Resetar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button
                  onClick={handleTentarConfirmar}
                  disabled={confirmar.isPending || totalConferido === 0}
                  className={cn("gap-1", todosConferidos ? "bg-success hover:bg-success/90" : "bg-warning hover:bg-warning/90")}
                >
                  <Check className="w-4 h-4" />
                  {todosConferidos ? 'Confirmar Transferência' : 'Finalizar Conferência'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
