import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DoorOpen, DoorClosed } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';

interface CaixaPanelProps {
  terminalNome: string;
  caixaAberto: boolean;
  saldoInicial?: number | null;
  onAbrir: (saldoInicial: number) => Promise<void>;
  onFechar: () => Promise<void>;
  disabled?: boolean;
}

export function CaixaPanel({
  terminalNome,
  caixaAberto,
  saldoInicial,
  onAbrir,
  onFechar,
  disabled,
}: CaixaPanelProps) {
  const [valor, setValor] = useState<string>(String(saldoInicial ?? 0));

  const title = caixaAberto ? 'Caixa Aberto' : 'Abrir Caixa';

  const parsed = useMemo(() => Number(valor.replace(',', '.')) || 0, [valor]);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-display font-semibold text-foreground">{title}</div>
          <div className="text-sm text-muted-foreground">Terminal: {terminalNome}</div>
        </div>
        {caixaAberto ? (
          <Badge className="bg-success/10 text-success border-success/20">ABERTO</Badge>
        ) : (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">FECHADO</Badge>
        )}
      </div>

      {!caixaAberto ? (
        <>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Saldo inicial (R$)
            </label>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              type="number"
              min="0"
              step="0.01"
            />
          </div>

          <Button
            className="w-full gradient-primary text-primary-foreground gap-2"
            disabled={disabled}
            onClick={() => onAbrir(Math.max(0, parsed))}
          >
            <DoorOpen className="w-4 h-4" />
            Abrir Caixa
          </Button>
        </>
      ) : (
        <>
          <div className="text-sm">
            <div className="text-muted-foreground">Saldo inicial</div>
            <div className="font-mono font-medium text-foreground tabular-nums">
              {formatCurrency(Number(saldoInicial ?? 0))}
            </div>
          </div>

          <Button
            className="w-full gap-2"
            variant="destructive"
            disabled={disabled}
            onClick={onFechar}
          >
            <DoorClosed className="w-4 h-4" />
            Fechar Caixa
          </Button>

          <p className="text-xs text-muted-foreground">
            No MVP, o saldo final pode ser calculado depois via relatório.
          </p>
        </>
      )}
    </div>
  );
}
