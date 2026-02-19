import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, RotateCcw, ScanBarcode, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
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
  status: 'ok' | 'excesso' | 'pendente';
}

export default function ConferenciaModal({ transferencia, open, onOpenChange }: Props) {
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const confirmar = useConfirmarTransferencia();

  const itens = transferencia.transferencia_itens || [];
  const totalEsperado = itens.reduce((s, i) => s + i.qtd, 0);
  const totalConferido = itens.reduce((s, i) => s + (i.qtd_conferida || 0), 0);
  const todosConferidos = itens.every(i => (i.qtd_conferida || 0) >= i.qtd);
  const temDivergencia = itens.some(i => (i.qtd_conferida || 0) !== i.qtd && (i.qtd_conferida || 0) > 0);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleScan = useCallback(async () => {
    if (!barcode.trim() || scanning) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.rpc('transferencia_bipar_item', {
        p_transferencia_id: transferencia.id,
        p_barcode: barcode.trim(),
      });
      if (error) throw error;
      const result = data as unknown as ScanResult;
      setLastScan(result);
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });

      if (result.status === 'ok') {
        toast.success(`✓ ${result.produto_nome} — conferido!`);
      } else if (result.status === 'excesso') {
        toast.warning(`⚠ ${result.produto_nome} — excesso! (${result.qtd_conferida}/${result.qtd_esperada})`);
      } else {
        toast(`${result.produto_nome} — ${result.qtd_conferida}/${result.qtd_esperada}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao bipar');
    } finally {
      setBarcode('');
      setScanning(false);
      inputRef.current?.focus();
    }
  }, [barcode, scanning, transferencia.id, queryClient]);

  const handleReset = async () => {
    try {
      const { error } = await supabase.rpc('transferencia_resetar_conferencia', {
        p_transferencia_id: transferencia.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      setLastScan(null);
      toast.success('Conferência resetada');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirmar = () => {
    confirmar.mutate(transferencia.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const getItemStatus = (item: { qtd: number; qtd_conferida?: number }) => {
    const conf = item.qtd_conferida || 0;
    if (conf === 0) return { label: 'Aguardando', icon: Clock, className: 'text-muted-foreground' };
    if (conf === item.qtd) return { label: 'OK', icon: CheckCircle2, className: 'text-success' };
    if (conf > item.qtd) return { label: 'Excesso', icon: AlertTriangle, className: 'text-warning' };
    return { label: `${conf}/${item.qtd}`, icon: ScanBarcode, className: 'text-primary' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-primary" />
            Conferência por Código de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scan input */}
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
            <Button onClick={handleScan} disabled={!barcode.trim() || scanning} className="h-12 px-6">
              Bipar
            </Button>
          </div>

          {/* Last scan feedback */}
          {lastScan && (
            <div className={cn(
              "rounded-lg border p-3 text-sm",
              lastScan.status === 'ok' && "bg-success/10 border-success/30 text-success",
              lastScan.status === 'excesso' && "bg-warning/10 border-warning/30 text-warning",
              lastScan.status === 'pendente' && "bg-primary/10 border-primary/30 text-primary",
            )}>
              <strong>{lastScan.produto_nome}</strong> — {lastScan.qtd_conferida}/{lastScan.qtd_esperada}
              {lastScan.status === 'ok' && ' ✓'}
              {lastScan.status === 'excesso' && ' ⚠ EXCESSO'}
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Progresso: <strong className="text-foreground">{totalConferido}</strong> / {totalEsperado} itens
            </span>
            <div className="flex gap-2">
              {todosConferidos && (
                <Badge className="bg-success/10 text-success border-success/30">Tudo conferido!</Badge>
              )}
              {temDivergencia && (
                <Badge className="bg-warning/10 text-warning border-warning/30">Com divergência</Badge>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn("h-2 rounded-full transition-all", todosConferidos ? "bg-success" : "bg-primary")}
              style={{ width: `${Math.min(100, totalEsperado > 0 ? (totalConferido / totalEsperado) * 100 : 0)}%` }}
            />
          </div>

          {/* Items table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center w-24">Esperado</TableHead>
                  <TableHead className="text-center w-24">Conferido</TableHead>
                  <TableHead className="text-center w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => {
                  const status = getItemStatus(item);
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome_snapshot || 'Produto'}</TableCell>
                      <TableCell className="text-center">{item.qtd}</TableCell>
                      <TableCell className="text-center font-bold">{item.qtd_conferida || 0}</TableCell>
                      <TableCell className="text-center">
                        <StatusIcon className={cn("w-4 h-4 inline", status.className)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" /> Resetar Conferência
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                onClick={handleConfirmar}
                disabled={confirmar.isPending || totalConferido === 0}
                className={cn("gap-1", todosConferidos ? "bg-success hover:bg-success/90" : "bg-warning hover:bg-warning/90")}
              >
                <Check className="w-4 h-4" />
                {todosConferidos ? 'Confirmar Transferência' : 'Confirmar com Divergência'}
              </Button>
            </div>
          </div>

          {temDivergencia && (
            <p className="text-xs text-warning text-center">
              ⚠ Existem divergências. Confirmar assim registrará as quantidades originais no estoque.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
