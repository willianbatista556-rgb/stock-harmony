import { DollarSign, TrendingUp, Trophy, PackageX, Loader2, Calendar, BarChart3, Percent, ChevronRight } from 'lucide-react';
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
import { ReactNode, useState } from 'react';

/* ── Touch-friendly KPI Card ── */
function KPICard({
  title,
  value,
  subtitle,
  icon,
  loading,
  accent = 'primary',
  className,
  onClick,
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon: ReactNode;
  loading?: boolean;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
  onClick?: () => void;
}) {
  const accentMap = {
    primary: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/10 to-success/5 text-success',
    warning: 'from-warning/10 to-warning/5 text-warning',
    destructive: 'from-destructive/10 to-destructive/5 text-destructive',
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200 group cursor-pointer',
        'active:scale-[0.97] active:shadow-sm hover:shadow-card-hover',
        'touch-manipulation select-none',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-2" />
            ) : (
              <>
                <p className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-card-foreground tracking-tight truncate">
                  {value}
                </p>
                {subtitle && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
                )}
              </>
            )}
          </div>
          <div className={cn(
            'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br transition-transform duration-200 group-active:scale-95',
            accentMap[accent]
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Expandable section for mobile ── */
function CollapsibleSection({
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center gap-2 p-4 sm:px-6 sm:py-4 text-left touch-manipulation active:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm sm:text-base font-semibold flex-1">{title}</span>
        {badge}
        <ChevronRight className={cn(
          'w-4 h-4 text-muted-foreground transition-transform duration-200',
          open && 'rotate-90'
        )} />
      </button>
      {open && (
        <CardContent className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6">
          {children}
        </CardContent>
      )}
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
    <div className="space-y-5 sm:space-y-8 animate-fade-in pb-6">
      {/* Header — compact on mobile */}
      <div className="px-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
          Resumo executivo do seu negócio
        </p>
      </div>

      {/* 4 Hero KPIs — 2x2 grid on mobile, scrollable feel */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Hoje"
          value={formatCurrency(fatHoje?.total || 0)}
          subtitle={`${fatHoje?.num_vendas || 0} vendas`}
          icon={<Calendar className="w-5 h-5" />}
          loading={lHoje}
          accent="primary"
        />
        <KPICard
          title="30 dias"
          value={formatCurrency(fatMes?.total || 0)}
          subtitle={`Ticket ${formatCurrency(fatMes?.ticket_medio || 0)}`}
          icon={<DollarSign className="w-5 h-5" />}
          loading={lMes}
          accent="success"
        />
        <KPICard
          title="Margem"
          value={`${margem?.margem || 0}%`}
          subtitle={`Lucro: ${formatCurrency(margem?.lucro || 0)}`}
          icon={<Percent className="w-5 h-5" />}
          loading={lMargem}
          accent="primary"
        />
        <KPICard
          title="Campeão"
          value={campeao?.produto_nome || '—'}
          subtitle={campeao ? formatCurrency(campeao.receita_total) : undefined}
          icon={<Trophy className="w-5 h-5" />}
          loading={lCampeao}
          accent="warning"
        />
      </div>

      {/* Chart — collapsible on mobile */}
      <CollapsibleSection
        title="Movimentações"
        icon={<BarChart3 className="w-4 h-4" />}
        defaultOpen={true}
      >
        <div className="-mx-2 sm:mx-0">
          <FaturamentoChart embedded />
        </div>
      </CollapsibleSection>

      {/* Estoque Parado — collapsible */}
      <CollapsibleSection
        title="Estoque Parado"
        icon={<PackageX className="w-4 h-4 text-destructive" />}
        badge={
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            {parados?.length || 0} itens
          </Badge>
        }
        defaultOpen={false}
      >
        {lParados ? (
          <div className="flex items-center justify-center h-[80px]">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !parados?.length ? (
          <div className="flex items-center justify-center h-[80px] text-sm text-muted-foreground">
            Nenhum produto parado 🎉
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {parados.map((item) => (
              <div
                key={item.produto_id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 touch-manipulation active:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.produto_nome}</p>
                  {item.sku && (
                    <p className="text-[11px] text-muted-foreground">SKU: {item.sku}</p>
                  )}
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-destructive">{Number(item.estoque_atual)} un</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
