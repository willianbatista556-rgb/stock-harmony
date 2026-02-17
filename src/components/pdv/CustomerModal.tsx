import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, User, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { PDVCustomer } from '@/lib/pdv/pdv.types';

const CLIENTE_BALCAO: PDVCustomer = { id: '', nome: 'Cliente Balcão' };

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCustomer: PDVCustomer | null;
  onSelect: (customer: PDVCustomer | null) => void;
}

export const CustomerModal = memo(function CustomerModal({
  open, onOpenChange, currentCustomer, onSelect,
}: CustomerModalProps) {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PDVCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !profile?.empresa_id) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, cpf_cnpj')
      .eq('empresa_id', profile.empresa_id)
      .eq('ativo', true)
      .or(`nome.ilike.%${q}%,cpf_cnpj.ilike.%${q}%`)
      .limit(10);
    setResults((data || []).map(c => ({ id: c.id, nome: c.nome, cpf_cnpj: c.cpf_cnpj || undefined })));
    setSelectedIdx(0);
    setLoading(false);
  }, [profile?.empresa_id]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleSelect = (customer: PDVCustomer) => {
    onSelect(customer.id ? customer : null);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onSelect(null);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results.length > 0) { e.preventDefault(); handleSelect(results[selectedIdx]); }
  };

  const isBalcao = !currentCustomer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Cliente</DialogTitle>
        </DialogHeader>

        {/* Current customer indicator */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border border-border">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isBalcao ? 'bg-muted-foreground/10' : 'bg-primary/10'
            )}>
              {isBalcao
                ? <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                : <User className="w-4 h-4 text-primary" />
              }
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                {currentCustomer?.nome || 'Cliente Balcão'}
              </p>
              {currentCustomer?.cpf_cnpj && (
                <p className="text-xs text-muted-foreground font-mono">{currentCustomer.cpf_cnpj}</p>
              )}
              {isBalcao && (
                <p className="text-xs text-muted-foreground">Venda sem identificação de cliente</p>
              )}
            </div>
          </div>
          {!isBalcao && (
            <Button variant="ghost" size="sm" onClick={handleRemove} className="text-destructive hover:text-destructive h-8 px-2">
              <X className="w-4 h-4 mr-1" /> Remover
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Buscar por nome ou CPF/CNPJ..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-11"
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden max-h-[240px] overflow-auto">
            {results.map((c, i) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-border/20 last:border-0 transition-colors',
                  i === selectedIdx ? 'bg-primary/8' : 'hover:bg-muted/40'
                )}
              >
                <p className="font-semibold text-foreground text-sm">{c.nome}</p>
                {c.cpf_cnpj && <p className="text-xs text-muted-foreground font-mono">{c.cpf_cnpj}</p>}
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente encontrado</p>
        )}

        {/* Quick action: back to balcão */}
        {!isBalcao && !query && (
          <button
            onClick={() => handleSelect(CLIENTE_BALCAO)}
            className="w-full text-left px-4 py-3 rounded-lg border border-dashed border-border hover:bg-muted/40 transition-colors flex items-center gap-3"
          >
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Usar Cliente Balcão</p>
              <p className="text-xs text-muted-foreground">Remover cliente e vender sem identificação</p>
            </div>
          </button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
