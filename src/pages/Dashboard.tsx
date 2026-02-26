import { DollarSign, TrendingUp, Trophy, PackageX, Loader2, Calendar, BarChart3, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FaturamentoChart } from '@/components/dashboard/FaturamentoChart';
import { useAuth } from '@/contexts/AuthContext';
import {
  useFaturamentoTotal,
  useFaturamentoHoje,
  useMargemMedia,
  useProdutoCampeao,
  useEstoqueParado,
} from '@/hooks/useMetricas';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

/* ── Hero KPI Card ── */
function KPICard({
  title,
  value,
  subtitle,
  icon,
  loading,
  accent = 'primary',
  className,
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon: ReactNode;
  loading?: boolean;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}) {
  const accentMap = {
    primary: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/10 to-success/5 text-success',
    warning: 'from-warning/10 to-warning/5 text-warning',
    destructive: 'from-destructive/10 to-destructive/5 text-destructive',
  };

  return (
    <Card className={cn('overflow-hidden transition-all duration-300 hover:shadow-card-hover group', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-2" />
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-display font-bold text-card-foreground tracking-tight">
                  {value}
                </p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </div>
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br transition-transform duration-300 group-hover:scale-110',
            accentMap[accent]
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(' ')[0] || 'Usuário';

  const { data: fatHoje, isLoading: lHoje } = useFaturamentoHoje();
  const { data: fatMes, isLoading: lMes } = useFaturamentoTotal();
  const { data: margem, isLoading: lMargem } = useMargemMedia();
  const { data: campeao, isLoading: lCampeao } = useProdutoCampeao();
  const { data: parados, isLoading: lParados } = useEstoqueParado(5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumo executivo do seu negócio
        </p>
      </div>

      {/* 4 Hero KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Faturamento Hoje"
          value={formatCurrency(fatHoje?.total || 0)}
          subtitle={`${fatHoje?.num_vendas || 0} vendas`}
          icon={<Calendar className="w-5 h-5" />}
          loading={lHoje}
          accent="primary"
        />
        <KPICard
          title="Faturamento 30 dias"
          value={formatCurrency(fatMes?.total || 0)}
          subtitle={`${fatMes?.num_vendas || 0} vendas • Ticket ${formatCurrency(fatMes?.ticket_medio || 0)}`}
          icon={<DollarSign className="w-5 h-5" />}
          loading={lMes}
          accent="success"
        />
        <KPICard
          title="Margem Média"
          value={`${margem?.margem || 0}%`}
          subtitle={`Lucro bruto: ${formatCurrency(margem?.lucro || 0)}`}
          icon={<Percent className="w-5 h-5" />}
          loading={lMargem}
          accent="primary"
        />
        <KPICard
          title="Produto Campeão"
          value={campeao?.produto_nome || '—'}
          subtitle={campeao ? `Receita: ${formatCurrency(campeao.receita_total)}` : undefined}
          icon={<Trophy className="w-5 h-5" />}
          loading={lCampeao}
          accent="warning"
        />
      </div>

      {/* Chart */}
      <FaturamentoChart />

      {/* Estoque Parado */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PackageX className="w-4 h-4 text-destructive" />
            <CardTitle className="text-base font-semibold">Estoque Parado</CardTitle>
            <Badge variant="secondary" className="text-xs ml-auto">
              {parados?.length || 0} itens sem giro
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Produtos sem saída nos últimos 30 dias</p>
        </CardHeader>
        <CardContent>
          {lParados ? (
            <div className="flex items-center justify-center h-[120px]">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !parados?.length ? (
            <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
              Nenhum produto parado 🎉
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {parados.map((item) => (
                <div key={item.produto_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.produto_nome}</p>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-semibold text-destructive">{Number(item.estoque_atual)} un</p>
                    <p className="text-xs text-muted-foreground">parado</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
