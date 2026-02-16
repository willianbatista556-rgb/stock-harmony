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
}

export const PDVSearch = memo(forwardRef<HTMLInputElement, PDVSearchProps>(
  function PDVSearch({ query, onQueryChange, onFocus, onClear, isSearchMode, results, selectedIndex, onSelectProduct }, ref) {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={ref}
            placeholder='Buscar produto (nome, SKU, EAN)... pressione "/" para focar'
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onFocus={onFocus}
            className="pl-9 h-12 text-base font-mono"
          />
          {isSearchMode && query && (
            <button
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isSearchMode && results.length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-auto flex-shrink-0 max-h-[300px]">
            {results.map((produto, i) => (
              <button
                key={produto.id}
                onClick={() => onSelectProduct(produto)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-border/30 last:border-0',
                  i === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
                )}
              >
                <div>
                  <p className="font-medium text-card-foreground">{produto.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {produto.sku && <span>SKU: {produto.sku}</span>}
                    {produto.ean && <span className="ml-2">EAN: {produto.ean}</span>}
                    {produto.marca && <span className="ml-2">• {produto.marca}</span>}
                  </p>
                </div>
                <span className="font-bold tabular-nums text-primary">
                  {formatCurrency(produto.preco_venda || 0)}
                </span>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }
));
