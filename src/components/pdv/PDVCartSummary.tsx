import { memo } from 'react';
import { Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { PDVItem } from '@/hooks/usePDV';
import { Button } from '@/components/ui/button';
import { printReceipt } from '@/lib/print';
import type { ReceiptData } from '@/lib/print/types';
import { toast } from 'sonner';

interface PDVCartSummaryProps {
  items: PDVItem[];
  descontoGeral: number;
  total: number;
  lastReceipt?: ReceiptData | null;
  printerCodepage?: string;
}

export const PDVCartSummary = memo(function PDVCartSummary({ items, descontoGeral, total, lastReceipt, printerCodepage }: PDVCartSummaryProps) {
  const totalQtd = items.reduce((s, i) => s + i.qtd, 0);
  const totalBruto = items.reduce((s, i) => s + i.qtd * i.preco_unit, 0);
  const totalDescontoItens = items.reduce((s, i) => s + i.desconto, 0);

  const handleReprint = async () => {
    if (!lastReceipt) return;
    try {
      await printReceipt(lastReceipt, { codepage: (printerCodepage as any) || undefined });
      toast.success('Cupom reimpresso!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao imprimir.';
      toast.error('Falha na reimpressão', { description: msg });
    }
  };

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
      {lastReceipt && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleReprint}
        >
          <Printer className="w-4 h-4" />
          Reimprimir última venda
        </Button>
      )}
    </div>
  );
});
