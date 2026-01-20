import { useState } from 'react';
import { FolderTree, Plus, Search, Edit, Trash2, MoreHorizontal, ChevronRight } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCategorias, useCreateCategoria, useUpdateCategoria, useDeleteCategoria, Categoria } from '@/hooks/useCategorias';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { toast } from 'sonner';

// Validation schema matching database constraints
const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  pai_id: z.string().uuid().nullable().optional(),
});

export default function Categorias() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [nome, setNome] = useState('');
  const [paiId, setPaiId] = useState<string>('');

  const { data: categorias, isLoading } = useCategorias();
  const createCategoria = useCreateCategoria();
  const updateCategoria = useUpdateCategoria();
  const deleteCategoria = useDeleteCategoria();

  const filteredCategorias = categorias?.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getCategoriaPai = (paiId: string | null) => {
    if (!paiId) return null;
    return categorias?.find(c => c.id === paiId);
  };

  const openCreateDialog = () => {
    setEditingCategoria(null);
    setNome('');
    setPaiId('');
    setDialogOpen(true);
  };

  const openEditDialog = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setNome(categoria.nome);
    setPaiId(categoria.pai_id || '');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validate with Zod schema
    const result = categoriaSchema.safeParse({
      nome,
      pai_id: paiId || null,
    });

    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      toast.error('Dados inválidos', { description: errors });
      return;
    }

    if (editingCategoria) {
      await updateCategoria.mutateAsync({
        id: editingCategoria.id,
        nome: result.data.nome,
        pai_id: result.data.pai_id || null,
      });
    } else {
      await createCategoria.mutateAsync({
        nome: result.data.nome,
        pai_id: result.data.pai_id || null,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      await deleteCategoria.mutateAsync(id);
    }
  };

  // Filter out current category from parent options
  const parentOptions = categorias?.filter(c => c.id !== editingCategoria?.id) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground mt-1">
            Organize seus produtos em categorias e subcategorias
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary text-white hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Categoria</TableHead>
              <TableHead className="font-semibold">Categoria Pai</TableHead>
              <TableHead className="font-semibold">Criado em</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredCategorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma categoria encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredCategorias.map((categoria, index) => {
                const pai = getCategoriaPai(categoria.pai_id);
                return (
                  <TableRow
                    key={categoria.id}
                    className="animate-slide-in-up hover:bg-muted/50 transition-colors"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <FolderTree className="w-5 h-5 text-accent" />
                        </div>
                        <span className="font-medium">{categoria.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pai ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ChevronRight className="w-4 h-4" />
                          <Badge variant="outline">{pai.nome}</Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {categoria.criado_em
                        ? new Date(categoria.criado_em).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => openEditDialog(categoria)} className="gap-2">
                            <Edit className="w-4 h-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(categoria.id)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            <DialogDescription>
              {editingCategoria
                ? 'Atualize as informações da categoria'
                : 'Preencha os dados para criar uma nova categoria'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Eletrônicos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pai">Categoria Pai (opcional)</Label>
              <Select value={paiId} onValueChange={setPaiId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria pai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma (categoria raiz)</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!nome.trim() || createCategoria.isPending || updateCategoria.isPending}
              className="gradient-primary text-white"
            >
              {editingCategoria ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
