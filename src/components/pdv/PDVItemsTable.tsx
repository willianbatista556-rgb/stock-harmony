import { memo } from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { PDVItem } from '@/hooks/usePDV';

interface PDVItemsTableProps {
  items: PDVItem[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onRemoveItem: (i: number) => void;
}

export const PDVItemsTable = memo(function PDVItemsTable({ items, selectedIndex, onSelectIndex, onRemoveItem }: PDVItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 bg-card rounded-xl border border-border/50 shadow-card flex flex-col items-center justify-center text-muted-foreground gap-3 py-12 min-h-0">
        <ShoppingCart className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">Nenhum item na venda</p>
        <p className="text-sm">
          Pressione <kbd className="px-2 py-0.5 rounded bg-muted font-mono text-xs">/</kbd> para buscar produtos
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-card rounded-xl border border-border/50 shadow-card overflow-auto min-h-0">
      <table className="w-full">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="px-4 py-2 font-semibold w-10">#</th>
            <th className="px-4 py-2 font-semibold">Produto</th>
            <th className="px-4 py-2 font-semibold text-center w-16">Qtd</th>
            <th className="px-4 py-2 font-semibold text-right w-24">Unit.</th>
            <th className="px-4 py-2 font-semibold text-right w-24">Desc.</th>
            <th className="px-4 py-2 font-semibold text-right w-28">Subtotal</th>
            <th className="px-4 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.id}
              onClick={() => onSelectIndex(i)}
              className={cn(
                'border-b border-border/30 cursor-pointer transition-colors',
                i === selectedIndex
                  ? 'bg-primary/5 border-l-2 border-l-primary'
                  : 'hover:bg-muted/30'
              )}
            >
              <td className="px-4 py-2.5 text-sm text-muted-foreground tabular-nums">{i + 1}</td>
              <td className="px-4 py-2.5">
                <p className="font-medium text-card-foreground text-sm">{item.produto.nome}</p>
                <p className="text-xs text-muted-foreground">{item.produto.sku || ''}</p>
              </td>
              <td className="px-4 py-2.5 text-center font-bold tabular-nums">{item.qtd}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-sm">{formatCurrency(item.preco_unit)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-sm text-destructive">
                {item.desconto > 0 ? `-${formatCurrency(item.desconto)}` : '-'}
              </td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatCurrency(item.subtotal)}</td>
              <td className="px-4 py-2.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveItem(i); }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
