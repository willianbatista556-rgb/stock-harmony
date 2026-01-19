import { Package, TrendingDown, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts';
import { StockByDeposit } from '@/components/dashboard/StockByDeposit';
import { StockForecast } from '@/components/dashboard/StockForecast';
import { useAuth } from '@/contexts/AuthContext';
import { useInventarioResumo, useContadoresHoje, useAlertasEstoqueBaixo } from '@/hooks/useDashboardData';

export default function Dashboard() {
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(' ')[0] || 'Usuário';

  const { data: resumo, isLoading: loadingResumo } = useInventarioResumo();
  const { data: contadores, isLoading: loadingContadores } = useContadoresHoje();
  const { data: alertas, isLoading: loadingAlertas } = useAlertasEstoqueBaixo();

  const isLoading = loadingResumo || loadingContadores || loadingAlertas;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o resumo do seu estoque hoje
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Produtos"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (resumo?.total_produtos?.toLocaleString('pt-BR') || '0')}
          icon={<Package className="w-6 h-6" />}
          variant="default"
        />
        <StatsCard
          title="Entradas Hoje"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (contadores?.entradas?.toLocaleString('pt-BR') || '0')}
          icon={<TrendingUp className="w-6 h-6" />}
          variant="success"
        />
        <StatsCard
          title="Saídas Hoje"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (contadores?.saidas?.toLocaleString('pt-BR') || '0')}
          icon={<TrendingDown className="w-6 h-6" />}
          variant="default"
        />
        <StatsCard
          title="Estoque Baixo"
          value={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (alertas?.length?.toString() || '0')}
          icon={<AlertTriangle className="w-6 h-6" />}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentMovements />
        <LowStockAlerts />
      </div>

      {/* Stock Forecast */}
      <StockForecast />

      {/* Stock by Deposit */}
      <StockByDeposit />
    </div>
  );
}
