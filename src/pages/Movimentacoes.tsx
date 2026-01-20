import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, RefreshCcw, Plus, Search, Filter, Calendar } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useMovimentacoes, useCreateMovimentacao } from '@/hooks/useMovimentacoes';
import { useDepositos } from '@/hooks/useDepositos';
import { useProdutos } from '@/hooks/useProdutos';
import { Skeleton } from '@/components/ui/skeleton';

const tipoConfig = {
  entrada: { icon: ArrowDownRight, label: 'Entrada', color: 'text-success', bg: 'bg-success/10' },
  saida: { icon: ArrowUpRight, label: 'Saída', color: 'text-destructive', bg: 'bg-destructive/10' },
  ajuste: { icon: RefreshCcw, label: 'Ajuste', color: 'text-warning', bg: 'bg-warning/10' },
};

const origemOptions = [
  { value: 'compra', label: 'Compra' },
  { value: 'venda', label: 'Venda' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'perda', label: 'Perda' },
  { value: 'consumo', label: 'Consumo' },
  { value: 'ajuste', label: 'Ajuste de Inventário' },
];

const origemLabels: Record<string, string> = {
  compra: 'Compra',
  venda: 'Venda',
  devolucao: 'Devolução',
  perda: 'Perda',
  consumo: 'Consumo',
  ajuste: 'Ajuste',
};

export default function Movimentacoes() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [origem, setOrigem] = useState('compra');
  const [produtoId, setProdutoId] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [qtd, setQtd] = useState('');
  const [custoUnit, setCustoUnit] = useState('');
  const [observacao, setObservacao] = useState('');

  const { data: movimentacoes, isLoading } = useMovimentacoes();
  const { data: depositos } = useDepositos();
  const { data: produtos } = useProdutos();
  const createMovimentacao = useCreateMovimentacao();

  const filteredMovimentacoes = movimentacoes?.filter((m) =>
    m.produto?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.deposito?.nome?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateDialog = () => {
    setTipo('entrada');
    setOrigem('compra');
    setProdutoId('');
    setDepositoId('');
    setQtd('');
    setCustoUnit('');
    setObservacao('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!produtoId || !depositoId || !qtd) return;

    await createMovimentacao.mutateAsync({
      tipo,
      origem,
      produto_id: produtoId,
      deposito_id: depositoId,
      qtd: parseFloat(qtd),
      custo_unit: custoUnit ? parseFloat(custoUnit) : undefined,
      observacao: observacao || undefined,
    });
    
    setDialogOpen(false);
  };

  // Count by type
  const countByType = {
    entrada: movimentacoes?.filter(m => m.tipo === 'entrada').length || 0,
    saida: movimentacoes?.filter(m => m.tipo === 'saida').length || 0,
    ajuste: movimentacoes?.filter(m => m.tipo === 'ajuste').length || 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Movimentações</h1>
          <p className="text-muted-foreground mt-1">
            Registre entradas, saídas e ajustes de estoque
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary text-white hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Nova Movimentação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(tipoConfig).map(([key, config]) => {
          const count = countByType[key as keyof typeof countByType];
          const Icon = config.icon;
          return (
            <div
              key={key}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3"
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
                <Icon className={cn("w-5 h-5", config.color)} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{count}</p>
                <p className="text-sm text-muted-foreground">{config.label}s</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto ou depósito..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold">Produto</TableHead>
              <TableHead className="font-semibold">Depósito</TableHead>
              <TableHead className="font-semibold text-right">Qtd</TableHead>
              <TableHead className="font-semibold text-right">Custo</TableHead>
              <TableHead className="font-semibold">Data/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                </TableRow>
              ))
            ) : filteredMovimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredMovimentacoes.map((mov, index) => {
                const config = tipoConfig[mov.tipo as keyof typeof tipoConfig] || tipoConfig.ajuste;
                const Icon = config.icon;

                return (
                  <TableRow
                    key={mov.id}
                    className="animate-slide-in-up hover:bg-muted/50 transition-colors"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bg)}>
                          <Icon className={cn("w-4 h-4", config.color)} />
                        </div>
                        <div>
                          <p className="font-medium">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{origemLabels[mov.origem] || mov.origem}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{mov.produto?.nome || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{mov.deposito?.nome || '-'}</Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold tabular-nums",
                      mov.qtd > 0 ? "text-success" : "text-destructive"
                    )}>
                      {mov.qtd > 0 ? '+' : ''}{mov.qtd}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {mov.custo_unit
                        ? mov.custo_unit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {mov.data ? (
                        <div>
                          <p className="font-medium">
                            {new Date(mov.data).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(mov.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredMovimentacoes.length} movimentações
        </p>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
            <DialogDescription>
              Registre uma entrada, saída ou ajuste de estoque
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tipo */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(tipoConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = tipo === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTipo(key as 'entrada' | 'saida' | 'ajuste')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
                      <Icon className={cn("w-5 h-5", config.color)} />
                    </div>
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Origem */}
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {origemOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produto */}
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select value={produtoId} onValueChange={setProdutoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku ? `${p.sku} - ` : ''}{p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Depósito */}
            <div className="space-y-2">
              <Label>Depósito *</Label>
              <Select value={depositoId} onValueChange={setDepositoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um depósito" />
                </SelectTrigger>
                <SelectContent>
                  {depositos?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade e Custo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={qtd}
                  onChange={(e) => setQtd(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Custo Unitário</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={custoUnit}
                  onChange={(e) => setCustoUnit(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!produtoId || !depositoId || !qtd || createMovimentacao.isPending}
              className="gradient-primary text-white"
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
