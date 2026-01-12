import { Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Deposit {
  id: string;
  nome: string;
  tipo: string;
  totalProdutos: number;
  valorTotal: number;
}

const mockDeposits: Deposit[] = [
  { id: '1', nome: 'Depósito Principal', tipo: 'físico', totalProdutos: 1250, valorTotal: 125000 },
  { id: '2', nome: 'Loja Centro', tipo: 'físico', totalProdutos: 430, valorTotal: 45000 },
  { id: '3', nome: 'E-commerce', tipo: 'virtual', totalProdutos: 890, valorTotal: 89500 },
  { id: '4', nome: 'Consignação', tipo: 'virtual', totalProdutos: 125, valorTotal: 12500 },
];

export function StockByDeposit() {
  const totalValue = mockDeposits.reduce((acc, d) => acc + d.valorTotal, 0);

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-display font-semibold text-card-foreground">
          Estoque por Depósito
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Distribuição de produtos e valores
        </p>
      </div>
      <div className="divide-y divide-border">
        {mockDeposits.map((deposit, index) => {
          const percentage = Math.round((deposit.valorTotal / totalValue) * 100);

          return (
            <div
              key={deposit.id}
              className="p-4 hover:bg-muted/50 transition-colors animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  deposit.tipo === 'físico' ? 'bg-primary/10' : 'bg-accent/10'
                )}>
                  <Warehouse className={cn(
                    "w-5 h-5",
                    deposit.tipo === 'físico' ? 'text-primary' : 'text-accent'
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-card-foreground">{deposit.nome}</p>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      deposit.tipo === 'físico'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-accent/10 text-accent'
                    )}>
                      {deposit.tipo}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {deposit.totalProdutos.toLocaleString('pt-BR')} produtos
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-card-foreground tabular-nums">
                    {deposit.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-sm text-muted-foreground">{percentage}% do total</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <p className="font-medium text-muted-foreground">Total em Estoque</p>
          <p className="text-xl font-display font-bold text-card-foreground">
            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>
    </div>
  );
}
