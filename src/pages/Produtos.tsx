import { useState } from 'react';
import { Package, Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

interface Produto {
  id: string;
  sku: string;
  nome: string;
  categoria: string;
  marca: string;
  estoque: number;
  estoqueMin: number;
  preco: number;
  ativo: boolean;
}

const mockProdutos: Produto[] = [
  { id: '1', sku: 'CX001', nome: 'Caixa de Papelão 40x30x20', categoria: 'Embalagens', marca: 'PackPro', estoque: 500, estoqueMin: 100, preco: 4.50, ativo: true },
  { id: '2', sku: 'FT001', nome: 'Fita Adesiva Transparente 45mm', categoria: 'Fitas', marca: 'Adere', estoque: 80, estoqueMin: 50, preco: 8.90, ativo: true },
  { id: '3', sku: 'ET001', nome: 'Etiqueta Adesiva A4', categoria: 'Etiquetas', marca: 'Pimaco', estoque: 200, estoqueMin: 100, preco: 35.00, ativo: true },
  { id: '4', sku: 'SP001', nome: 'Saco Plástico 20x30cm', categoria: 'Embalagens', marca: 'PlastMax', estoque: 1500, estoqueMin: 500, preco: 0.15, ativo: true },
  { id: '5', sku: 'PA001', nome: 'Papel A4 Sulfite 75g', categoria: 'Papelaria', marca: 'Chamex', estoque: 25, estoqueMin: 50, preco: 28.90, ativo: true },
  { id: '6', sku: 'CX002', nome: 'Caixa de Papelão 30x20x15', categoria: 'Embalagens', marca: 'PackPro', estoque: 300, estoqueMin: 100, preco: 3.20, ativo: false },
  { id: '7', sku: 'FT002', nome: 'Fita Adesiva Marrom 48mm', categoria: 'Fitas', marca: 'Adere', estoque: 120, estoqueMin: 30, preco: 7.50, ativo: true },
  { id: '8', sku: 'PL001', nome: 'Plástico Bolha 1.20m', categoria: 'Proteção', marca: 'PlastMax', estoque: 45, estoqueMin: 20, preco: 12.00, ativo: true },
];

function getStockStatus(estoque: number, estoqueMin: number) {
  const ratio = estoque / estoqueMin;
  if (ratio < 0.5) return { label: 'Crítico', variant: 'destructive' as const };
  if (ratio < 1) return { label: 'Baixo', variant: 'warning' as const };
  return { label: 'Normal', variant: 'success' as const };
}

export default function Produtos() {
  const [search, setSearch] = useState('');

  const filteredProdutos = mockProdutos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

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
        <Button className="gradient-primary text-white hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Novo Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou SKU..."
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
              <TableHead className="font-semibold">Categoria</TableHead>
              <TableHead className="font-semibold">Estoque</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Preço</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProdutos.map((produto, index) => {
              const status = getStockStatus(produto.estoque, produto.estoqueMin);

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
                          SKU: {produto.sku} • {produto.marca}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{produto.categoria}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold tabular-nums">{produto.estoque}</p>
                      <p className="text-xs text-muted-foreground">Mín: {produto.estoqueMin}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        status.variant === 'destructive' && 'border-destructive text-destructive bg-destructive/10',
                        status.variant === 'warning' && 'border-warning text-warning bg-warning/10',
                        status.variant === 'success' && 'border-success text-success bg-success/10'
                      )}
                    >
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
          Mostrando {filteredProdutos.length} de {mockProdutos.length} produtos
        </p>
      </div>
    </div>
  );
}
