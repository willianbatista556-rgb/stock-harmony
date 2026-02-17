import { memo, useState, useEffect, useRef } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { registrarCaixaMov, CaixaMovTipo } from '@/lib/pdv/pdv.caixa.api';

interface CaixaMovModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixaId: string;
  empresaId: string;
  usuarioId: string;
}

export const CaixaMovModal = memo(function CaixaMovModal({
  open, onOpenChange, caixaId, empresaId, usuarioId,
}: CaixaMovModalProps) {
  const [tipo, setTipo] = useState<CaixaMovTipo>('sangria');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTipo('sangria');
      setValor('');
      setDescricao('');
      setTimeout(() => valorRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = async () => {
    const val = parseFloat(valor);
    if (isNaN(val) || val <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setLoading(true);
    try {
      await registrarCaixaMov({
        caixaId,
        empresaId,
        usuarioId,
        tipo,
        valor: val,
        descricao: descricao.trim() || undefined,
      });
      toast.success(tipo === 'sangria' ? 'Sangria registrada' : 'Suprimento registrado');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Sangria / Suprimento</DialogTitle>
        </DialogHeader>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTipo('sangria')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              tipo === 'sangria'
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
            onClick={() => setTipo('suprimento')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              tipo === 'suprimento'
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
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            className="h-12 text-lg font-mono"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Motivo (opcional)</label>
          <Textarea
            placeholder="Ex: Troco para cliente, pagamento de fornecedor…"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              tipo === 'sangria'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'gradient-primary text-primary-foreground'
            )}
          >
            {loading ? 'Registrando…' : tipo === 'sangria' ? 'Registrar Sangria' : 'Registrar Suprimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
