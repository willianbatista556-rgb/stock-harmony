import { useState } from 'react';
import { Shield, Search, Filter, LogIn, Trash2, Pencil, Package, Clock, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const acaoConfig: Record<string, { icon: typeof LogIn; label: string; color: string }> = {
  login: { icon: LogIn, label: 'Login', color: 'bg-primary/10 text-primary' },
  delete: { icon: Trash2, label: 'Exclusão', color: 'bg-destructive/10 text-destructive' },
  update: { icon: Pencil, label: 'Alteração', color: 'bg-warning/10 text-warning' },
  insert: { icon: Package, label: 'Criação', color: 'bg-success/10 text-success' },
};

export default function Auditoria() {
  const { profile } = useAuth();
  const [filtroAcao, setFiltroAcao] = useState<string>('todas');
  const [filtroTabela, setFiltroTabela] = useState<string>('todas');
  const [busca, setBusca] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', profile?.empresa_id, filtroAcao, filtroTabela],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('criado_em', { ascending: false })
        .limit(200);

      if (filtroAcao !== 'todas') query = query.eq('acao', filtroAcao);
      if (filtroTabela !== 'todas') query = query.eq('tabela', filtroTabela);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.empresa_id,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['audit-profiles', profile?.empresa_id],
    queryFn: async () => {
      if (!profile?.empresa_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, nome, email')
        .eq('empresa_id', profile.empresa_id);
      return data ?? [];
    },
    enabled: !!profile?.empresa_id,
  });

  const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));

  const filtered = logs.filter(log => {
    if (!busca) return true;
    const search = busca.toLowerCase();
    const userName = profileMap[log.usuario_id]?.nome?.toLowerCase() ?? '';
    return (
      userName.includes(search) ||
      (log.tabela ?? '').toLowerCase().includes(search) ||
      log.acao.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Auditoria
          </h1>
          <p className="text-sm text-muted-foreground">
            Histórico imutável de ações críticas do sistema
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de registros', value: logs.length, icon: Clock },
          { label: 'Logins', value: logs.filter(l => l.acao === 'login').length, icon: LogIn },
          { label: 'Exclusões', value: logs.filter(l => l.acao === 'delete').length, icon: Trash2 },
          { label: 'Alterações', value: logs.filter(l => l.acao === 'update').length, icon: Pencil },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <stat.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, tabela..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroAcao} onValueChange={setFiltroAcao}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas ações</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
                <SelectItem value="update">Alteração</SelectItem>
                <SelectItem value="insert">Criação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroTabela} onValueChange={setFiltroTabela}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas tabelas</SelectItem>
                <SelectItem value="auth">Autenticação</SelectItem>
                <SelectItem value="produtos">Produtos</SelectItem>
                <SelectItem value="categorias">Categorias</SelectItem>
                <SelectItem value="depositos">Depósitos</SelectItem>
                <SelectItem value="fornecedores">Fornecedores</SelectItem>
                <SelectItem value="clientes">Clientes</SelectItem>
                <SelectItem value="empresas">Empresa</SelectItem>
                <SelectItem value="estoque_saldos">Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="w-[120px]">Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(log => {
                  const cfg = acaoConfig[log.acao] ?? { icon: Clock, label: log.acao, color: 'bg-muted text-muted-foreground' };
                  const Icon = cfg.icon;
                  const userName = profileMap[log.usuario_id]?.nome ?? 'Sistema';
                  
                  // Build detail summary
                  let detail = '';
                  if (log.acao === 'delete' && log.dados_antes) {
                    const before = log.dados_antes as Record<string, any>;
                    detail = before.nome ?? before.descricao ?? log.registro_id ?? '';
                  } else if (log.acao === 'update' && log.dados_antes && log.dados_depois) {
                    const before = log.dados_antes as Record<string, any>;
                    const after = log.dados_depois as Record<string, any>;
                    const changes = Object.keys(after).filter(k =>
                      JSON.stringify(before[k]) !== JSON.stringify(after[k]) && !['atualizado_em', 'updated_at', 'criado_em'].includes(k)
                    );
                    detail = changes.length > 0 ? `Campos: ${changes.join(', ')}` : 'Sem alterações visíveis';
                  } else if (log.acao === 'login') {
                    detail = 'Acesso ao sistema';
                  }

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {format(new Date(log.criado_em), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">{userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1 text-[10px] font-bold', cfg.color)} variant="outline">
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {log.tabela ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {detail || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
