import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Check, User, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useContasReceber, useReceberConta } from '@/hooks/useFinanceiro';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function Crediario() {
  const { data: contas = [], isLoading } = useContasReceber();
  const receberConta = useReceberConta();
  const [search, setSearch] = useState('');

  const hoje = new Date().toISOString().split('T')[0];

  // Filter only crediário entries (linked to a venda and a client)
  const crediarioContas = useMemo(() => {
    return contas.filter(c => c.venda_id && c.cliente_id);
  }, [contas]);

  // Group by client
  const clienteMap = useMemo(() => {
    const map = new Map<string, {
      nome: string;
      clienteId: string;
      totalDevido: number;
      totalVencido: number;
      parcelas: typeof crediarioContas;
    }>();

    for (const c of crediarioContas) {
      const key = c.cliente_id!;
      if (!map.has(key)) {
        map.set(key, {
          nome: c.clientes?.nome || 'Sem nome',
          clienteId: key,
          totalDevido: 0,
          totalVencido: 0,
          parcelas: [],
        });
      }
      const entry = map.get(key)!;
      entry.parcelas.push(c);
      if (c.status === 'pendente') {
        entry.totalDevido += Number(c.valor);
        if (c.vencimento < hoje) {
          entry.totalVencido += Number(c.valor);
        }
      }
    }
    return map;
  }, [crediarioContas, hoje]);

  const clientes = useMemo(() => {
    const arr = Array.from(clienteMap.values());
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter(c => c.nome.toLowerCase().includes(q));
  }, [clienteMap, search]);

  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const selectedData = selectedCliente ? clienteMap.get(selectedCliente) : null;

  const totalGeral = Array.from(clienteMap.values()).reduce((s, c) => s + c.totalDevido, 0);
  const totalVencidoGeral = Array.from(clienteMap.values()).reduce((s, c) => s + c.totalVencido, 0);
  const clientesComDebito = Array.from(clienteMap.values()).filter(c => c.totalDevido > 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Crediário</h1>
        <p className="text-sm text-muted-foreground">Consulte e gerencie débitos de clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes com débito</p>
              <p className="text-xl font-display font-bold text-foreground">{clientesComDebito}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total a receber</p>
              <p className="text-xl font-display font-bold text-foreground">{formatCurrency(totalGeral)}</p>
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
              <p className="text-xl font-display font-bold text-destructive">{formatCurrency(totalVencidoGeral)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client list */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : clientes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum crediário encontrado</p>
            ) : clientes.map(c => (
              <button
                key={c.clienteId}
                onClick={() => setSelectedCliente(c.clienteId)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedCliente === c.clienteId
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-foreground">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.parcelas.filter(p => p.status === 'pendente').length} parcela(s) pendente(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-foreground">{formatCurrency(c.totalDevido)}</p>
                    {c.totalVencido > 0 && (
                      <p className="text-xs text-destructive font-medium">{formatCurrency(c.totalVencido)} vencido</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Parcelas detail */}
        <div className="lg:col-span-2">
          {selectedData ? (
            <Card className="shadow-card">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-bold text-lg text-foreground">{selectedData.nome}</h2>
                  <p className="text-sm text-muted-foreground">
                    Débito total: <span className="font-bold text-foreground">{formatCurrency(selectedData.totalDevido)}</span>
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedData.parcelas
                      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
                      .map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-sm">{c.descricao}</TableCell>
                          <TableCell className="text-muted-foreground">{c.parcela}/{c.total_parcelas}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatCurrency(Number(c.valor))}</TableCell>
                          <TableCell>{formatDate(c.vencimento)}</TableCell>
                          <TableCell>
                            {c.status === 'recebido' ? (
                              <Badge className="bg-success/10 text-success border-success/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Pago
                              </Badge>
                            ) : c.vencimento < hoje ? (
                              <Badge variant="destructive">Vencido</Badge>
                            ) : (
                              <Badge className="bg-warning/10 text-warning border-warning/20">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {c.status === 'pendente' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => receberConta.mutate(c.id)}
                                disabled={receberConta.isPending}
                                className="gap-1 text-success hover:text-success"
                              >
                                <Check className="w-4 h-4" />
                                Receber
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Selecione um cliente para ver as parcelas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}