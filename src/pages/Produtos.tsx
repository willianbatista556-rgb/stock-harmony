import { useState } from 'react';
import { Package, Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Upload, Printer, CheckSquare } from 'lucide-react';
import { ImportProdutosModal } from '@/components/produtos/ImportProdutosModal';
import { EtiquetasModal } from '@/components/produtos/EtiquetasModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useProdutos, type Produto } from '@/hooks/useProdutos';

function getStockStatus(estoque: number, estoqueMin: number) {
  const ratio = estoque / estoqueMin;
  if (ratio < 0.5) return { label: 'Crítico', variant: 'destructive' as const };
  if (ratio < 1) return { label: 'Baixo', variant: 'warning' as const };
  return { label: 'Normal', variant: 'success' as const };
}

export default function Produtos() {
  const [search, setSearch] = useState('');
  const { data: produtos = [], isLoading } = useProdutos();
  const [showImport, setShowImport] = useState(false);
  const [showEtiquetas, setShowEtiquetas] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredProdutos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProdutos.map(p => p.id)));
    }
  };

  const selectedProducts = produtos.filter(p => selectedIds.has(p.id));

  const filteredProdutos = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.ean || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatGrade = (p: Produto) => {
    const parts: string[] = [];
    if (p.tamanho) parts.push(p.tamanho);
    if (p.cor) parts.push(p.cor);
    return parts.length > 0 ? parts.join(' / ') : null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o cadastro de produtos do seu estoque
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={() => setShowEtiquetas(true)} className="gap-2">
              <Printer className="w-4 h-4" />
              Etiquetas ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Importar CSV
          </Button>
          <Button className="gradient-primary text-white hover:opacity-90 gap-2">
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU ou EAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Produto</TableHead>
              <TableHead className="font-semibold">Unidade</TableHead>
              <TableHead className="font-semibold">Grade</TableHead>
              <TableHead className="font-semibold text-right">Preço</TableHead>
              <TableHead className="font-semibold text-right">Comissão</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredProdutos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : filteredProdutos.map((produto, index) => {
              const grade = formatGrade(produto);
              return (
                <TableRow
                  key={produto.id}
                  className="animate-slide-in-up hover:bg-muted/50 transition-colors"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">{produto.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {produto.sku && `SKU: ${produto.sku}`}
                          {produto.sku && produto.marca && ' • '}
                          {produto.marca}
                          {produto.ean && ` • EAN: ${produto.ean}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{produto.unidade || 'UN'}</Badge>
                  </TableCell>
                  <TableCell>
                    {grade ? (
                      <span className="text-sm text-foreground">{grade}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {(produto.preco_venda ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {produto.comissao_percentual != null ? (
                      <span className="text-sm">{produto.comissao_percentual}%</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="w-4 h-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredProdutos.length} de {produtos.length} produtos
        </p>
      </div>

      <ImportProdutosModal open={showImport} onOpenChange={setShowImport} />
    </div>
  );
}
