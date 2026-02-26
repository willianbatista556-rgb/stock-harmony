import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Check, Trash2, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useContasReceber, useCreateContaReceber, useReceberConta, useDeleteContaReceber } from '@/hooks/useFinanceiro';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function ContasReceber() {
  const { data: contas = [], isLoading } = useContasReceber();
  const createConta = useCreateContaReceber();
  const receberConta = useReceberConta();
  const deleteConta = useDeleteContaReceber();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState('todos');

  const [form, setForm] = useState({ descricao: '', valor: '', vencimento: '', parcela: '1', total_parcelas: '1', observacao: '' });

  const hoje = new Date().toISOString().split('T')[0];

  const contasFiltradas = contas.filter(c => {
    if (filtro === 'pendente') return c.status === 'pendente';
    if (filtro === 'vencido') return c.status === 'pendente' && c.vencimento < hoje;
    if (filtro === 'recebido') return c.status === 'recebido';
    return true;
  });

  const totalPendente = contas.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0);
  const totalVencido = contas.filter(c => c.status === 'pendente' && c.vencimento < hoje).reduce((s, c) => s + Number(c.valor), 0);
  const totalRecebido = contas.filter(c => c.status === 'recebido').reduce((s, c) => s + Number(c.valor), 0);

  const handleSubmit = () => {
    if (!form.descricao || !form.valor || !form.vencimento) return;
    createConta.mutate({
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      vencimento: form.vencimento,
      parcela: parseInt(form.parcela),
      total_parcelas: parseInt(form.total_parcelas),
      observacao: form.observacao || undefined,
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ descricao: '', valor: '', vencimento: '', parcela: '1', total_parcelas: '1', observacao: '' });
      },
    });
  };

  const getStatusBadge = (conta: typeof contas[0]) => {
    if (conta.status === 'recebido') return <Badge className="bg-success/10 text-success border-success/20">Recebido</Badge>;
    if (conta.vencimento < hoje) return <Badge variant="destructive">Vencido</Badge>;
    return <Badge className="bg-warning/10 text-warning border-warning/20">Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Controle seus recebíveis e crediários</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Novo recebível
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Recebível</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimento</Label>
                  <Input type="date" value={form.vencimento} onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Parcela</Label>
                  <Input type="number" min="1" value={form.parcela} onChange={e => setForm(p => ({ ...p, parcela: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Total de parcelas</Label>
                  <Input type="number" min="1" value={form.total_parcelas} onChange={e => setForm(p => ({ ...p, total_parcelas: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observação</Label>
                <Input value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} />
              </div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSubmit} disabled={createConta.isPending}>
                {createConta.isPending ? 'Salvando…' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A receber</p>
              <p className="text-xl font-display font-bold text-foreground">{formatCurrency(totalPendente)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencido</p>
              <p className="text-xl font-display font-bold text-destructive">{formatCurrency(totalVencido)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="text-xl font-display font-bold text-foreground">{formatCurrency(totalRecebido)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[{ v: 'todos', l: 'Todos' }, { v: 'pendente', l: 'Pendentes' }, { v: 'vencido', l: 'Vencidos' }, { v: 'recebido', l: 'Recebidos' }].map(f => (
          <Button key={f.v} variant={filtro === f.v ? 'default' : 'outline'} size="sm" onClick={() => setFiltro(f.v)}>
            {f.l}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : contasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum recebível encontrado</TableCell></TableRow>
              ) : contasFiltradas.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.descricao}</TableCell>
                  <TableCell className="text-muted-foreground">{c.clientes?.nome || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.parcela}/{c.total_parcelas}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(c.valor))}</TableCell>
                  <TableCell>{formatDate(c.vencimento)}</TableCell>
                  <TableCell>{getStatusBadge(c)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {c.status === 'pendente' && (
                        <Button variant="ghost" size="icon" onClick={() => receberConta.mutate(c.id)} title="Marcar como recebido">
                          <Check className="w-4 h-4 text-success" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteConta.mutate(c.id)} title="Excluir">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
