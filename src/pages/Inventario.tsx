import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Eye, CheckCircle2, XCircle, Clock, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInventarios, useCriarInventario } from '@/hooks/useInventarios';
import { useDepositos } from '@/hooks/useDepositos';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  rascunho: { label: 'Rascunho', color: 'bg-muted text-muted-foreground border-border', icon: FileText },
  em_contagem: { label: 'Em Contagem', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  fechado: { label: 'Fechado', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function Inventario() {
  const navigate = useNavigate();
  const { data: inventarios = [], isLoading } = useInventarios();
  const { data: depositos = [] } = useDepositos();
  const criarInventario = useCriarInventario();

  const [showNew, setShowNew] = useState(false);
  const [depositoId, setDepositoId] = useState('');
  const [observacao, setObservacao] = useState('');

  const handleCriar = async () => {
    if (!depositoId) return;
    const id = await criarInventario.mutateAsync({ depositoId, observacao });
    setShowNew(false);
    setDepositoId('');
    setObservacao('');
    navigate(`/inventario/${id}`);
  };

  const depositoNome = (id: string) => depositos.find(d => d.id === id)?.nome || '—';

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Inventário</h1>
          <p className="text-muted-foreground mt-1">
            Contagem de estoque com snapshot, divergências e recontagem
          </p>
        </div>
        <Button className="gradient-primary text-primary-foreground hover:opacity-90 gap-2" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" />
          Novo Inventário
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {(['rascunho', 'em_contagem', 'fechado', 'cancelado'] as const).map(status => {
          const cfg = statusConfig[status];
          const count = inventarios.filter(i => i.status === status).length;
          return (
            <Card key={status} className="bg-card shadow-card">
              <CardContent className="pt-5 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', cfg.color)}>
                  <cfg.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{cfg.label}</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12 animate-pulse">Carregando…</p>
        ) : inventarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum inventário registrado.</p>
            <Button variant="outline" onClick={() => setShowNew(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Iniciar Primeiro Inventário
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Criado</TableHead>
                <TableHead className="font-semibold">Depósito</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Iniciado</TableHead>
                <TableHead className="font-semibold">Fechado</TableHead>
                <TableHead className="font-semibold">Ajustado</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventarios.map(inv => {
                const cfg = statusConfig[inv.status] || statusConfig.rascunho;
                return (
                  <TableRow
                    key={inv.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/inventario/${inv.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{formatDate(inv.criado_em)}</TableCell>
                    <TableCell>{depositoNome(inv.deposito_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', cfg.color)}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(inv.iniciado_em)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(inv.finalizado_em)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(inv.aplicado_em)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <Eye className="w-4 h-4" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Novo Inventário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Depósito</label>
              <Select value={depositoId} onValueChange={setDepositoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o depósito" /></SelectTrigger>
                <SelectContent>
                  {depositos.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Observação (opcional)</label>
              <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Inventário mensal janeiro" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={!depositoId || criarInventario.isPending} className="gradient-primary text-primary-foreground">
              Criar Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
