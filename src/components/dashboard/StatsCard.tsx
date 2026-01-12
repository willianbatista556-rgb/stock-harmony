import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-primary/10 text-primary',
    trend: 'text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
    trend: 'text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    trend: 'text-warning',
  },
  danger: {
    icon: 'bg-destructive/10 text-destructive',
    trend: 'text-destructive',
  },
};

export function StatsCard({ title, value, icon, trend, variant = 'default', className }: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 group",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-display font-bold text-card-foreground animate-count-up">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1.5">
              {trend.value >= 0 ? (
                <TrendingUp className={cn("w-4 h-4", styles.trend)} />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span className={cn(
                "text-sm font-medium",
                trend.value >= 0 ? styles.trend : "text-destructive"
              )}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
          styles.icon
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
