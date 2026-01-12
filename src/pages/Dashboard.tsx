import { Package, TrendingDown, TrendingUp, Warehouse, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts';
import { StockByDeposit } from '@/components/dashboard/StockByDeposit';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { profile } = useAuth();
  const firstName = profile?.nome?.split(' ')[0] || 'Usuário';

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
          value="2.847"
          icon={<Package className="w-6 h-6" />}
          trend={{ value: 12, label: 'vs mês anterior' }}
          variant="default"
        />
        <StatsCard
          title="Entradas Hoje"
          value="156"
          icon={<TrendingUp className="w-6 h-6" />}
          trend={{ value: 8, label: 'vs ontem' }}
          variant="success"
        />
        <StatsCard
          title="Saídas Hoje"
          value="89"
          icon={<TrendingDown className="w-6 h-6" />}
          trend={{ value: -5, label: 'vs ontem' }}
          variant="default"
        />
        <StatsCard
          title="Estoque Baixo"
          value="23"
          icon={<AlertTriangle className="w-6 h-6" />}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentMovements />
        <LowStockAlerts />
      </div>

      {/* Stock by Deposit */}
      <StockByDeposit />
    </div>
  );
}
