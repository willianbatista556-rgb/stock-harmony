import { Package, TrendingDown, TrendingUp, AlertTriangle, Loader2, DollarSign, ShoppingCart, Receipt } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts';
import { StockByDeposit } from '@/components/dashboard/StockByDeposit';
import { StockForecast } from '@/components/dashboard/StockForecast';
import { FaturamentoChart } from '@/components/dashboard/FaturamentoChart';
import { FaturamentoFilialCard, CurvaABCCard, GiroEstoqueCard, TopMargemCard } from '@/components/dashboard/MetricasNegocio';
import { useAuth } from '@/contexts/AuthContext';
import { useInventarioResumo, useContadoresHoje, useAlertasEstoqueBaixo } from '@/hooks/useDashboardData';
import { useFaturamentoTotal } from '@/hooks/useMetricas';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export default function Dashboard() {
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(' ')[0] || 'Usuário';

  const { data: resumo, isLoading: loadingResumo } = useInventarioResumo();
  const { data: contadores, isLoading: loadingContadores } = useContadoresHoje();
  const { data: alertas, isLoading: loadingAlertas } = useAlertasEstoqueBaixo();
  const { data: faturamento, isLoading: loadingFat } = useFaturamentoTotal();

  const isLoading = loadingResumo || loadingContadores || loadingAlertas || loadingFat;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o resumo do seu negócio hoje
        </p>
      </div>

      {/* Stats Grid - 6 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Total de Produtos"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (resumo?.total_produtos?.toLocaleString('pt-BR') || '0')}
          icon={<Package className="w-5 h-5" />}
          variant="default"
        />
        <StatsCard
          title="Faturamento 30d"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : fmtBRL(faturamento?.total || 0)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
        />
        <StatsCard
          title="Vendas 30d"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (faturamento?.num_vendas?.toLocaleString('pt-BR') || '0')}
          icon={<ShoppingCart className="w-5 h-5" />}
          variant="default"
        />
        <StatsCard
          title="Ticket Médio"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : fmtBRL(faturamento?.ticket_medio || 0)}
          icon={<Receipt className="w-5 h-5" />}
          variant="default"
        />
        <StatsCard
          title="Entradas Hoje"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (contadores?.entradas?.toLocaleString('pt-BR') || '0')}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="success"
        />
        <StatsCard
          title="Estoque Baixo"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (alertas?.length?.toString() || '0')}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="warning"
        />
      </div>

      {/* Chart */}
      <FaturamentoChart />

      {/* Business Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FaturamentoFilialCard />
        <CurvaABCCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GiroEstoqueCard />
        <TopMargemCard />
      </div>

      {/* Stock Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentMovements />
        <LowStockAlerts />
      </div>

      <StockForecast />
      <StockByDeposit />
    </div>
  );
}
