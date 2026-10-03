import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  icon?: React.ElementType;
  iconColor?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'info';
  className?: string;
  children?: React.ReactNode;
}

const variantMap = {
  default: { card: 'bg-card border-border', icon: 'bg-primary/10 text-primary', label: 'text-muted-foreground' },
  warning: { card: 'bg-warning/5 border-warning/20', icon: 'bg-warning/10 text-warning', label: 'text-warning' },
  danger: { card: 'bg-danger/5 border-danger/20', icon: 'bg-danger/10 text-danger', label: 'text-danger' },
  success: { card: 'bg-success/5 border-success/20', icon: 'bg-success/10 text-success', label: 'text-success' },
  info: { card: 'bg-info/5 border-info/20', icon: 'bg-info/10 text-info', label: 'text-info' },
};

export default function MetricCard({
  label,
  value,
  subValue,
  trend,
  trendValue,
  trendLabel,
  icon: Icon,
  variant = 'default',
  className = '',
  children,
}: MetricCardProps) {
  const styles = variantMap[variant];

  return (
    <div className={`rounded-xl border p-4 ${styles.card} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-600 uppercase tracking-wider mb-2 ${styles.label}`}>{label}</p>
          <p className="text-3xl font-800 text-foreground hero-metric leading-none">{value}</p>
          {subValue && <p className="text-sm text-muted-foreground mt-1">{subValue}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      {(trend || children) && (
        <div className="mt-3 pt-3 border-t border-border/50">
          {trend && trendValue && (
            <div className="flex items-center gap-1.5">
              {trend === 'up' && <TrendingUp size={13} className="text-success" />}
              {trend === 'down' && <TrendingDown size={13} className="text-danger" />}
              {trend === 'neutral' && <Minus size={13} className="text-muted-foreground" />}
              <span className={`text-xs font-600 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-muted-foreground'}`}>
                {trendValue}
              </span>
              {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}