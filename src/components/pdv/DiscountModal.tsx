import { memo, useState, useEffect, useRef } from 'react';
import { Percent, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { PDVDiscount } from '@/lib/pdv/pdv.types';

interface DiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDiscount: PDVDiscount;
  subtotal: number;
  onApply: (discount: PDVDiscount) => void;
}

export const DiscountModal = memo(function DiscountModal({
  open, onOpenChange, currentDiscount, subtotal, onApply,
}: DiscountModalProps) {
  const [tipo, setTipo] = useState<'valor' | 'percentual'>(currentDiscount.tipo);
  const [valor, setValor] = useState(String(currentDiscount.valor || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTipo(currentDiscount.tipo);
      setValor(String(currentDiscount.valor || ''));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, currentDiscount]);

  const preview = (() => {
    const v = parseFloat(valor) || 0;
    if (tipo === 'percentual') return subtotal * (v / 100);
    return v;
  })();

  const handleApply = () => {
    const v = parseFloat(valor) || 0;
    onApply({ tipo, valor: v });
    onOpenChange(false);
  };

  const handleClear = () => {
    onApply({ tipo: 'valor', valor: 0 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Desconto Geral</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTipo('valor')}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg border transition-all font-medium',
                tipo === 'valor'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground'
              )}
            >
              <DollarSign className="w-4 h-4" />
              Valor (R$)
            </button>
            <button
              onClick={() => setTipo('percentual')}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg border transition-all font-medium',
                tipo === 'percentual'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground'
              )}
            >
              <Percent className="w-4 h-4" />
              Percentual (%)
            </button>
          </div>

          {/* Input */}
          <div className="relative">
            {tipo === 'valor' ? (
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            ) : (
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            )}
            <Input
              ref={inputRef}
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder={tipo === 'valor' ? '0.00' : '0'}
              className="pl-11 h-14 text-2xl font-mono"
              min="0"
              step={tipo === 'valor' ? '0.01' : '1'}
              max={tipo === 'percentual' ? '100' : undefined}
              onKeyDown={e => { if (e.key === 'Enter') handleApply(); }}
            />
          </div>

          {/* Preview */}
          <div className="flex justify-between items-center text-sm px-1">
            <span className="text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</span>
            <span className="font-bold text-destructive">
              Desconto: -{formatCurrency(preview)}
            </span>
          </div>

          <div className="flex justify-between items-center bg-muted/50 rounded-lg px-4 py-3">
            <span className="text-sm text-muted-foreground">Total com desconto</span>
            <span className="font-bold text-xl font-mono tabular-nums text-foreground">
              {formatCurrency(Math.max(0, subtotal - preview))}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {currentDiscount.valor > 0 && (
            <Button variant="destructive" size="sm" onClick={handleClear}>Remover Desconto</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
