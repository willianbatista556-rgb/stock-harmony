import { memo, forwardRef, useState } from 'react';
import { Banknote, CreditCard, QrCode, X, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Pagamento } from '@/hooks/usePDV';

const formaConfig = {
  dinheiro: { label: 'Dinheiro', icon: Banknote },
  credito: { label: 'Crédito', icon: CreditCard },
  debito: { label: 'Débito', icon: CreditCard },
  pix: { label: 'Pix', icon: QrCode },
  crediario: { label: 'Crediário', icon: BookOpen },
} as const;

interface PDVPaymentPanelProps {
  paymentForm: Pagamento['forma'];
  onPaymentFormChange: (forma: Pagamento['forma']) => void;
  paymentValue: string;
  onPaymentValueChange: (val: string) => void;
  onAddPayment: () => void;
  pagamentos: Pagamento[];
  onRemovePagamento: (i: number) => void;
  restante: number;
  onFinalize: () => void;
  isFinalizing: boolean;
  hasIdentifiedCustomer?: boolean;
}

export const PDVPaymentPanel = memo(forwardRef<HTMLInputElement, PDVPaymentPanelProps>(
  function PDVPaymentPanel({
    paymentForm, onPaymentFormChange,
    paymentValue, onPaymentValueChange,
    onAddPayment, pagamentos, onRemovePagamento,
    restante, onFinalize, isFinalizing, hasIdentifiedCustomer,
  }, ref) {
    const [parcelas, setParcelas] = useState(1);

    const handleFormChange = (forma: Pagamento['forma']) => {
      if (forma === 'crediario' && !hasIdentifiedCustomer) return;
      onPaymentFormChange(forma);
      if (forma !== 'crediario') setParcelas(1);
    };

    return (
      <div className="bg-card rounded-xl border-2 border-success p-4 shadow-card animate-scale-in space-y-3">
        <h3 className="font-display font-bold text-foreground">Pagamento</h3>

        {/* Payment method selector */}
        <div className="grid grid-cols-5 gap-1.5">
          {(Object.keys(formaConfig) as Array<keyof typeof formaConfig>).map(forma => {
            const cfg = formaConfig[forma];
            const Icon = cfg.icon;
            const disabled = forma === 'crediario' && !hasIdentifiedCustomer;
            return (
              <button
                key={forma}
                onClick={() => handleFormChange(forma)}
                disabled={disabled}
                title={disabled ? 'Selecione um cliente identificado (F3)' : cfg.label}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs font-medium',
                  disabled && 'opacity-40 cursor-not-allowed',
                  paymentForm === forma
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Parcelas for crediário */}
        {paymentForm === 'crediario' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Parcelas:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setParcelas(n)}
                  className={cn(
                    'w-8 h-8 rounded-md border text-xs font-bold transition-all',
                    parcelas === n
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Value input */}
        <div className="flex gap-2">
          <Input
            ref={ref}
            type="number"
            value={paymentValue}
            onChange={e => onPaymentValueChange(e.target.value)}
            placeholder="Valor"
            className="h-11 font-mono text-lg"
            min="0"
            step="0.01"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddPayment();
              }
            }}
          />
          <Button onClick={onAddPayment} className="h-11 gradient-primary text-primary-foreground px-6">
            Add
          </Button>
        </div>

        {/* Added payments list */}
        {pagamentos.length > 0 && (
          <div className="space-y-1">
            {pagamentos.map((pag, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {formaConfig[pag.forma].label}
                    {pag.parcelas && pag.parcelas > 1 ? ` ${pag.parcelas}x` : ''}
                  </Badge>
                  <span className="font-mono tabular-nums font-medium">{formatCurrency(pag.valor)}</span>
                  {pag.troco && pag.troco > 0 ? (
                    <span className="text-xs text-success">(troco: {formatCurrency(pag.troco)})</span>
                  ) : null}
                </div>
                <button onClick={() => onRemovePagamento(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Remaining amount */}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Restante</span>
          <span className={cn(
            'font-bold tabular-nums font-mono text-lg',
            restante > 0 ? 'text-destructive' : 'text-success'
          )}>
            {formatCurrency(restante)}
          </span>
        </div>

        {/* Finalize button */}
        {restante <= 0 && pagamentos.length > 0 && (
          <Button
            onClick={onFinalize}
            disabled={isFinalizing}
            className="w-full h-12 gradient-success text-success-foreground font-bold text-lg"
          >
            {isFinalizing ? 'Finalizando...' : 'Finalizar Venda'}
          </Button>
        )}
      </div>
    );
  }
));