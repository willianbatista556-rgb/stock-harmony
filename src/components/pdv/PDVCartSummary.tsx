import { memo } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { PDVItem } from '@/hooks/usePDV';

interface PDVCartSummaryProps {
  items: PDVItem[];
  descontoGeral: number;
  total: number;
}

export const PDVCartSummary = memo(function PDVCartSummary({ items, descontoGeral, total }: PDVCartSummaryProps) {
  const totalQtd = items.reduce((s, i) => s + i.qtd, 0);
  const totalBruto = items.reduce((s, i) => s + i.qtd * i.preco_unit, 0);
  const totalDescontoItens = items.reduce((s, i) => s + i.desconto, 0);

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{totalQtd} {totalQtd === 1 ? 'item' : 'itens'}</span>
        <span className="tabular-nums font-mono">{formatCurrency(totalBruto)}</span>
      </div>
      {totalDescontoItens > 0 && (
        <div className="flex justify-between text-sm text-destructive">
          <span>Descontos</span>
          <span className="tabular-nums font-mono">-{formatCurrency(totalDescontoItens)}</span>
        </div>
      )}
      {descontoGeral > 0 && (
        <div className="flex justify-between text-sm text-destructive">
          <span>Desc. geral</span>
          <span className="tabular-nums font-mono">-{formatCurrency(descontoGeral)}</span>
        </div>
      )}
      <div className="border-t border-border pt-4">
        <div className="flex justify-between items-end">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total</span>
          <span className="text-4xl font-display font-bold text-foreground tabular-nums tracking-tight">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
});
