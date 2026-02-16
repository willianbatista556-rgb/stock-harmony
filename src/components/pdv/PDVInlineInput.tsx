import { memo, forwardRef } from 'react';
import { Hash, DollarSign, CornerDownLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PDVMode } from '@/hooks/usePDV';

interface PDVInlineInputProps {
  mode: 'quantity' | 'discount';
  productName: string;
  value: string;
  onChange: (val: string) => void;
  onConfirm: () => void;
}

export const PDVInlineInput = memo(forwardRef<HTMLInputElement, PDVInlineInputProps>(
  function PDVInlineInput({ mode, productName, value, onChange, onConfirm }, ref) {
    const isQty = mode === 'quantity';

    return (
      <div className="bg-card rounded-xl border-2 border-primary p-4 shadow-card animate-scale-in">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {isQty ? 'Nova quantidade para' : 'Desconto (R$) para'}{' '}
          <span className="text-foreground font-bold">{productName}</span>
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            {isQty ? (
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            ) : (
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            )}
            <Input
              ref={ref}
              type="number"
              value={value}
              onChange={e => onChange(e.target.value)}
              className="pl-9 h-12 text-lg font-mono"
              min="0"
              step={isQty ? '1' : '0.01'}
            />
          </div>
          <Button
            size="lg"
            className="h-12 gradient-primary text-primary-foreground gap-2"
            onClick={onConfirm}
          >
            <CornerDownLeft className="w-4 h-4" />
            Confirmar
          </Button>
        </div>
      </div>
    );
  }
));
