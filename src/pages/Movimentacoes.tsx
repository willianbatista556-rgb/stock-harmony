import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, RefreshCcw, ArrowLeftRight, Plus, Search, Filter, Calendar } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface Movimentacao {
  id: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  origem: string;
  produto: string;
  deposito: string;
  qtd: number;
  custoUnit: number;
  data: string;
  usuario: string;
}

const mockMovimentacoes: Movimentacao[] = [
  { id: '1', tipo: 'entrada', origem: 'compra', produto: 'Caixa de Papelão 40x30', deposito: 'Depósito Principal', qtd: 500, custoUnit: 4.50, data: '2024-01-12T14:30:00', usuario: 'Maria Silva' },
  { id: '2', tipo: 'saida', origem: 'venda', produto: 'Fita Adesiva Transparente', deposito: 'Loja Centro', qtd: 100, custoUnit: 8.90, data: '2024-01-12T13:15:00', usuario: 'João Santos' },
  { id: '3', tipo: 'ajuste', origem: 'ajuste', produto: 'Etiqueta Adesiva A4', deposito: 'Depósito Principal', qtd: -20, custoUnit: 35.00, data: '2024-01-12T11:00:00', usuario: 'Carlos Oliveira' },
  { id: '4', tipo: 'entrada', origem: 'devolucao', produto: 'Saco Plástico 20x30', deposito: 'E-commerce', qtd: 50, custoUnit: 0.15, data: '2024-01-12T10:45:00', usuario: 'Ana Pereira' },
  { id: '5', tipo: 'transferencia', origem: 'ajuste', produto: 'Papel A4 Sulfite', deposito: 'Loja Centro', qtd: 10, custoUnit: 28.90, data: '2024-01-12T09:30:00', usuario: 'Pedro Costa' },
  { id: '6', tipo: 'saida', origem: 'consumo', produto: 'Plástico Bolha 1.20m', deposito: 'Depósito Principal', qtd: 5, custoUnit: 12.00, data: '2024-01-11T16:00:00', usuario: 'Maria Silva' },
  { id: '7', tipo: 'entrada', origem: 'compra', produto: 'Caixa de Papelão 30x20', deposito: 'Depósito Principal', qtd: 300, custoUnit: 3.20, data: '2024-01-11T14:00:00', usuario: 'João Santos' },
  { id: '8', tipo: 'saida', origem: 'venda', produto: 'Fita Adesiva Marrom', deposito: 'E-commerce', qtd: 50, custoUnit: 7.50, data: '2024-01-11T12:30:00', usuario: 'Carlos Oliveira' },
];

const tipoConfig = {
  entrada: { icon: ArrowDownRight, label: 'Entrada', color: 'text-success', bg: 'bg-success/10' },
  saida: { icon: ArrowUpRight, label: 'Saída', color: 'text-destructive', bg: 'bg-destructive/10' },
  ajuste: { icon: RefreshCcw, label: 'Ajuste', color: 'text-warning', bg: 'bg-warning/10' },
  transferencia: { icon: ArrowLeftRight, label: 'Transferência', color: 'text-primary', bg: 'bg-primary/10' },
};

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

  const filteredMovimentacoes = mockMovimentacoes.filter((m) =>
    m.produto.toLowerCase().includes(search.toLowerCase()) ||
    m.deposito.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Movimentações</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de entradas, saídas e ajustes de estoque
          </p>
        </div>
        <Button className="gradient-primary text-white hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Nova Movimentação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(tipoConfig).map(([key, config]) => {
          const count = mockMovimentacoes.filter((m) => m.tipo === key).length;
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
        <Button variant="outline" className="gap-2">
          <Calendar className="w-4 h-4" />
          Período
        </Button>
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
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold">Produto</TableHead>
              <TableHead className="font-semibold">Depósito</TableHead>
              <TableHead className="font-semibold text-right">Qtd</TableHead>
              <TableHead className="font-semibold text-right">Custo</TableHead>
              <TableHead className="font-semibold">Data/Hora</TableHead>
              <TableHead className="font-semibold">Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovimentacoes.map((mov, index) => {
              const config = tipoConfig[mov.tipo];
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
                        <p className="text-xs text-muted-foreground">{origemLabels[mov.origem]}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{mov.produto}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{mov.deposito}</Badge>
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-semibold tabular-nums",
                    mov.qtd > 0 ? "text-success" : "text-destructive"
                  )}>
                    {mov.qtd > 0 ? '+' : ''}{mov.qtd}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {mov.custoUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {new Date(mov.data).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(mov.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{mov.usuario}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredMovimentacoes.length} de {mockMovimentacoes.length} movimentações
        </p>
      </div>
    </div>
  );
}
