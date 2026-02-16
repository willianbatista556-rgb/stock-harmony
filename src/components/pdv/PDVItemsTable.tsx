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
      <div className="h-full rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center text-muted-foreground gap-4">
        <ShoppingCart className="w-16 h-16 opacity-20" />
        <p className="text-xl font-medium opacity-60">Nenhum item</p>
        <p className="text-sm opacity-40">
          Escaneie um código de barras ou pressione <kbd className="px-2 py-0.5 rounded bg-muted font-mono text-xs font-bold">F1</kbd>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border/50 overflow-auto bg-card">
      <table className="w-full">
        <thead className="sticky top-0 bg-card border-b border-border z-10">
          <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3 font-semibold w-12">#</th>
            <th className="px-4 py-3 font-semibold">Produto</th>
            <th className="px-4 py-3 font-semibold text-center w-20">Qtd</th>
            <th className="px-4 py-3 font-semibold text-right w-28">Unit.</th>
            <th className="px-4 py-3 font-semibold text-right w-28">Desc.</th>
            <th className="px-4 py-3 font-semibold text-right w-32">Subtotal</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.id}
              onClick={() => onSelectIndex(i)}
              className={cn(
                'border-b border-border/20 cursor-pointer transition-colors',
                i === selectedIndex
                  ? 'bg-primary/8 border-l-[3px] border-l-primary'
                  : 'hover:bg-muted/30'
              )}
            >
              <td className="px-4 py-3 text-sm text-muted-foreground font-mono tabular-nums">{i + 1}</td>
              <td className="px-4 py-3">
                <p className="font-semibold text-foreground">{item.produto.nome}</p>
                {item.produto.sku && <p className="text-xs text-muted-foreground font-mono">{item.produto.sku}</p>}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="font-bold text-lg tabular-nums text-foreground">{item.qtd}</span>
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-muted-foreground">{formatCurrency(item.preco_unit)}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-sm">
                {item.desconto > 0 ? (
                  <span className="text-destructive font-medium">-{formatCurrency(item.desconto)}</span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-bold font-mono tabular-nums text-lg text-foreground">
                {formatCurrency(item.subtotal)}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveItem(i); }}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
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
