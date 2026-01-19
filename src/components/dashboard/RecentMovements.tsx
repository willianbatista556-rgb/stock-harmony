import { ArrowDownRight, ArrowUpRight, RefreshCcw, ArrowLeftRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMovimentacoesRecentes } from '@/hooks/useDashboardData';
import { Link } from 'react-router-dom';

const tipoConfig = {
  entrada: { icon: ArrowDownRight, color: 'text-success', bg: 'bg-success/10', label: 'Entrada' },
  saida: { icon: ArrowUpRight, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Saída' },
  ajuste: { icon: RefreshCcw, color: 'text-warning', bg: 'bg-warning/10', label: 'Ajuste' },
  transferencia: { icon: ArrowLeftRight, color: 'text-primary', bg: 'bg-primary/10', label: 'Transferência' },
};

const origemLabels: Record<string, string> = {
  compra: 'Compra',
  venda: 'Venda',
  devolucao: 'Devolução',
  perda: 'Perda',
  consumo: 'Consumo',
  ajuste: 'Ajuste',
};

export function RecentMovements() {
  const { data: movimentacoes, isLoading } = useMovimentacoesRecentes();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = movimentacoes || [];

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-display font-semibold text-card-foreground">
          Movimentações Recentes
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Últimas entradas e saídas de estoque
        </p>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {items.map((mov, index) => {
            const config = tipoConfig[mov.tipo as keyof typeof tipoConfig] || tipoConfig.ajuste;
            const Icon = config.icon;
            const produto = mov.produto as { id: string; nome: string } | null;
            const qtd = Number(mov.qtd);

            return (
              <div
                key={mov.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
                  <Icon className={cn("w-5 h-5", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground truncate">
                    {produto?.nome || 'Produto'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {config.label} • {origemLabels[mov.origem] || mov.origem}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-semibold tabular-nums",
                    mov.tipo === 'entrada' ? "text-success" : 
                    mov.tipo === 'saida' ? "text-destructive" : "text-warning"
                  )}>
                    {mov.tipo === 'entrada' ? '+' : mov.tipo === 'saida' ? '-' : ''}{Math.abs(qtd)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mov.data && new Date(mov.data).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-4 border-t border-border">
        <Link 
          to="/movimentacoes"
          className="w-full text-sm text-primary hover:text-primary/80 font-medium transition-colors block text-center"
        >
          Ver todas as movimentações →
        </Link>
      </div>
    </div>
  );
}
