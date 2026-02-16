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
    <div className="bg-card rounded-xl border border-border/50 shadow-card p-5">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Itens ({totalQtd})</span>
          <span className="tabular-nums">{formatCurrency(totalBruto)}</span>
        </div>
        {totalDescontoItens > 0 && (
          <div className="flex justify-between text-sm text-destructive">
            <span>Descontos itens</span>
            <span className="tabular-nums">-{formatCurrency(totalDescontoItens)}</span>
          </div>
        )}
        {descontoGeral > 0 && (
          <div className="flex justify-between text-sm text-destructive">
            <span>Desconto geral</span>
            <span className="tabular-nums">-{formatCurrency(descontoGeral)}</span>
          </div>
        )}
        <div className="border-t border-border pt-3 mt-3">
          <div className="flex justify-between items-end">
            <span className="text-lg font-medium text-muted-foreground">Total</span>
            <span className="text-3xl font-display font-bold text-foreground tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
