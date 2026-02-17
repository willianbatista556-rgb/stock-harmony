import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { criarMovimentacaoCaixa, CashMoveOrigin } from '@/lib/pdv/pdv.caixa.api';

interface CaixaMovModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixaId: string;
  empresaId: string;
  defaultMode?: CashMoveOrigin;
}

export const CaixaMovModal = memo(function CaixaMovModal({
  open, onOpenChange, caixaId, empresaId, defaultMode = 'sangria',
}: CaixaMovModalProps) {
  const [tipo, setTipo] = useState<CashMoveOrigin>(defaultMode);
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => Number(valor.replace(',', '.')) || 0, [valor]);
  const isSangria = tipo === 'sangria';

  useEffect(() => {
    if (open) {
      setTipo(defaultMode);
      setValor('');
      setObs('');
      requestAnimationFrame(() => valorRef.current?.focus());
    }
  }, [open]);

  const handleConfirm = async () => {
    const v = Math.max(0, parsed);
    if (v <= 0) { toast.error('Informe um valor válido'); return; }

    setLoading(true);
    try {
      await criarMovimentacaoCaixa({
        caixaId,
        empresaId,
        tipo: isSangria ? 'saida' : 'entrada',
        origem: tipo,
        valor: isSangria ? -v : v,
        descricao: obs.trim() || undefined,
      });
      toast.success(isSangria ? 'Sangria registrada' : 'Suprimento registrado');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && parsed > 0) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center justify-between">
            <span>{isSangria ? 'Sangria (retirar do caixa)' : 'Suprimento (colocar no caixa)'}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] font-bold border border-border/50">Enter</kbd> confirma · <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px] font-bold border border-border/50">Esc</kbd> fecha
          </p>
        </DialogHeader>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setTipo('sangria'); valorRef.current?.focus(); }}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              isSangria
                ? 'border-destructive bg-destructive/8 text-destructive'
                : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
            )}
          >
            <ArrowDownCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold text-sm">Sangria</p>
              <p className="text-[11px] opacity-70">Retirar dinheiro</p>
            </div>
          </button>

          <button
            onClick={() => { setTipo('suprimento'); valorRef.current?.focus(); }}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              !isSangria
                ? 'border-primary bg-primary/8 text-primary'
                : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
            )}
          >
            <ArrowUpCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold text-sm">Suprimento</p>
              <p className="text-[11px] opacity-70">Adicionar dinheiro</p>
            </div>
          </button>
        </div>

        {/* Value */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Valor (R$)</label>
          <Input
            ref={valorRef}
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="h-12 text-lg font-mono"
          />
        </div>

        {/* Observation */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Observação (opcional)</label>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Ex.: troco para cliente, retirada para depósito…"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || parsed <= 0}
            className={cn(
              isSangria
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'gradient-primary text-primary-foreground'
            )}
          >
            {loading ? 'Registrando…' : isSangria ? 'Registrar Sangria' : 'Registrar Suprimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
