import { useState } from 'react';
import { Warehouse, Plus, Search, Edit, Trash2, MoreHorizontal } from 'lucide-react';
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
import { useDepositos, useCreateDeposito, useUpdateDeposito, useDeleteDeposito, Deposito } from '@/hooks/useDepositos';
import { Skeleton } from '@/components/ui/skeleton';

const tiposDeposito = [
  { value: 'fisico', label: 'Físico' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'loja', label: 'Loja' },
  { value: 'ecommerce', label: 'E-commerce' },
];

export default function Depositos() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeposito, setEditingDeposito] = useState<Deposito | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('fisico');

  const { data: depositos, isLoading } = useDepositos();
  const createDeposito = useCreateDeposito();
  const updateDeposito = useUpdateDeposito();
  const deleteDeposito = useDeleteDeposito();

  const filteredDepositos = depositos?.filter((d) =>
    d.nome.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateDialog = () => {
    setEditingDeposito(null);
    setNome('');
    setTipo('fisico');
    setDialogOpen(true);
  };

  const openEditDialog = (deposito: Deposito) => {
    setEditingDeposito(deposito);
    setNome(deposito.nome);
    setTipo(deposito.tipo || 'fisico');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!nome.trim()) return;

    if (editingDeposito) {
      await updateDeposito.mutateAsync({ id: editingDeposito.id, nome, tipo });
    } else {
      await createDeposito.mutateAsync({ nome, tipo });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este depósito?')) {
      await deleteDeposito.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Depósitos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus depósitos e locais de armazenamento
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary text-white hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Novo Depósito
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar depósito..."
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
              <TableHead className="font-semibold">Depósito</TableHead>
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold">Criado em</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredDepositos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum depósito encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredDepositos.map((deposito, index) => (
                <TableRow
                  key={deposito.id}
                  className="animate-slide-in-up hover:bg-muted/50 transition-colors"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Warehouse className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium">{deposito.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {tiposDeposito.find(t => t.value === deposito.tipo)?.label || deposito.tipo || 'Físico'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deposito.criado_em
                      ? new Date(deposito.criado_em).toLocaleDateString('pt-BR')
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
                        <DropdownMenuItem onClick={() => openEditDialog(deposito)} className="gap-2">
                          <Edit className="w-4 h-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(deposito.id)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editingDeposito ? 'Editar Depósito' : 'Novo Depósito'}</DialogTitle>
            <DialogDescription>
              {editingDeposito
                ? 'Atualize as informações do depósito'
                : 'Preencha os dados para criar um novo depósito'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Depósito Principal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposDeposito.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
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
              disabled={!nome.trim() || createDeposito.isPending || updateDeposito.isPending}
              className="gradient-primary text-white"
            >
              {editingDeposito ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
