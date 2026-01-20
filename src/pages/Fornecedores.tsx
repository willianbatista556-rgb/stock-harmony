import { useState } from 'react';
import { Truck, Plus, Search, Edit, Trash2, MoreHorizontal, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { useFornecedores, useCreateFornecedor, useUpdateFornecedor, useDeleteFornecedor, Fornecedor } from '@/hooks/useFornecedores';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { toast } from 'sonner';

// Validation schema matching database constraints
const fornecedorSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
  cnpj_cpf: z.string().max(20, 'CNPJ/CPF deve ter no máximo 20 caracteres').optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').max(255, 'E-mail deve ter no máximo 255 caracteres').optional().or(z.literal('')),
  telefone: z.string().max(20, 'Telefone deve ter no máximo 20 caracteres').optional().or(z.literal('')),
});

export default function Fornecedores() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [nome, setNome] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  const { data: fornecedores, isLoading } = useFornecedores();
  const createFornecedor = useCreateFornecedor();
  const updateFornecedor = useUpdateFornecedor();
  const deleteFornecedor = useDeleteFornecedor();

  const filteredFornecedores = fornecedores?.filter((f) =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.cnpj_cpf?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateDialog = () => {
    setEditingFornecedor(null);
    setNome('');
    setCnpjCpf('');
    setEmail('');
    setTelefone('');
    setDialogOpen(true);
  };

  const openEditDialog = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setNome(fornecedor.nome);
    setCnpjCpf(fornecedor.cnpj_cpf || '');
    setEmail(fornecedor.email || '');
    setTelefone(fornecedor.telefone || '');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validate with Zod schema
    const result = fornecedorSchema.safeParse({
      nome,
      cnpj_cpf: cnpjCpf || undefined,
      email: email || undefined,
      telefone: telefone || undefined,
    });

    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      toast.error('Dados inválidos', { description: errors });
      return;
    }

    const data = {
      nome: result.data.nome,
      cnpj_cpf: result.data.cnpj_cpf || undefined,
      email: result.data.email || undefined,
      telefone: result.data.telefone || undefined,
    };

    if (editingFornecedor) {
      await updateFornecedor.mutateAsync({ id: editingFornecedor.id, ...data });
    } else {
      await createFornecedor.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
      await deleteFornecedor.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Fornecedores</h1>
          <p className="text-muted-foreground mt-1">
            Cadastre e gerencie seus fornecedores
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary text-white hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CNPJ/CPF..."
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
              <TableHead className="font-semibold">Fornecedor</TableHead>
              <TableHead className="font-semibold">CNPJ/CPF</TableHead>
              <TableHead className="font-semibold">Contato</TableHead>
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
                  <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredFornecedores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredFornecedores.map((fornecedor, index) => (
                <TableRow
                  key={fornecedor.id}
                  className="animate-slide-in-up hover:bg-muted/50 transition-colors"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-warning" />
                      </div>
                      <span className="font-medium">{fornecedor.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {fornecedor.cnpj_cpf || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {fornecedor.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {fornecedor.email}
                        </div>
                      )}
                      {fornecedor.telefone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {fornecedor.telefone}
                        </div>
                      )}
                      {!fornecedor.email && !fornecedor.telefone && '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fornecedor.criado_em
                      ? new Date(fornecedor.criado_em).toLocaleDateString('pt-BR')
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
                        <DropdownMenuItem onClick={() => openEditDialog(fornecedor)} className="gap-2">
                          <Edit className="w-4 h-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(fornecedor.id)}
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
            <DialogTitle>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            <DialogDescription>
              {editingFornecedor
                ? 'Atualize as informações do fornecedor'
                : 'Preencha os dados para cadastrar um novo fornecedor'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Distribuidora ABC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ/CPF</Label>
              <Input
                id="cnpj"
                value={cnpjCpf}
                onChange={(e) => setCnpjCpf(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!nome.trim() || createFornecedor.isPending || updateFornecedor.isPending}
              className="gradient-primary text-white"
            >
              {editingFornecedor ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
