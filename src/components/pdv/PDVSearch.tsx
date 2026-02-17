import { memo, forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Produto } from '@/hooks/useProdutos';

interface PDVSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  onFocus: () => void;
  onClear: () => void;
  isSearchMode: boolean;
  results: Produto[];
  selectedIndex: number;
  onSelectProduct: (produto: Produto) => void;
  estoqueMap?: Record<string, number>;
}

export const PDVSearch = memo(forwardRef<HTMLInputElement, PDVSearchProps>(
  function PDVSearch({ query, onQueryChange, onFocus, onClear, isSearchMode, results, selectedIndex, onSelectProduct, estoqueMap = {} }, ref) {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={ref}
            placeholder='Código de barras, nome ou SKU...'
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onFocus={onFocus}
            className="pl-11 h-14 text-lg font-mono border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
          />
          {isSearchMode && query && (
            <button
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isSearchMode && results.length > 0 && (
          <div className="absolute left-0 right-0 mx-3 mt-1 bg-card rounded-xl border border-border shadow-lg overflow-auto max-h-[350px] z-20">
            {results.map((produto, i) => (
              <button
                key={produto.id}
                onClick={() => onSelectProduct(produto)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors border-b border-border/20 last:border-0',
                  i === selectedIndex ? 'bg-primary/8' : 'hover:bg-muted/40'
                )}
              >
                <div>
                  <p className="font-semibold text-foreground">{produto.nome}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {produto.sku && <span>SKU: {produto.sku}</span>}
                    {produto.ean && <span className="ml-3">EAN: {produto.ean}</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-bold tabular-nums font-mono text-lg text-primary">
                    {formatCurrency(produto.preco_venda || 0)}
                  </span>
                  <span className={cn(
                    'text-xs font-mono tabular-nums',
                    (estoqueMap[produto.id] ?? 0) > 0 ? 'text-success' : 'text-destructive'
                  )}>
                    Est: {estoqueMap[produto.id] ?? 0}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }
));
