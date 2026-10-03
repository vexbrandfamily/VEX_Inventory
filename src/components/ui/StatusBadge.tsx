import React from 'react';

type BadgeVariant =
  | 'active' |'suspended' |'deactivated' |'pending' |'expired' |'cancelled' |'expiring' |'available' |'normal' |'low-stock' |'critical' |'out-of-stock' |'overstocked' |'store' |'business' |'permanent' |'consumable' |'perishable' |'paid' |'unpaid' |'overdue' |'draft' |'confirmed';

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-success/10 text-success border-success/20',
  suspended: 'bg-warning/10 text-warning border-warning/20',
  deactivated: 'bg-danger/10 text-danger border-danger/20',
  pending: 'bg-info/10 text-info border-info/20',
  expired: 'bg-danger/10 text-danger border-danger/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
  expiring: 'bg-warning/10 text-warning border-warning/20',
  available: 'bg-success/10 text-success border-success/20',
  normal: 'bg-success/10 text-success border-success/20',
  'low-stock': 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-danger/10 text-danger border-danger/20',
  'out-of-stock': 'bg-slate-900 text-white border-slate-900',
  overstocked: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  store: 'bg-accent/10 text-accent border-accent/20',
  business: 'bg-warning/10 text-warning border-warning/20',
  permanent: 'bg-primary/10 text-primary border-primary/20',
  consumable: 'bg-info/10 text-info border-info/20',
  perishable: 'bg-warning/10 text-warning border-warning/20',
  paid: 'bg-success/10 text-success border-success/20',
  unpaid: 'bg-warning/10 text-warning border-warning/20',
  overdue: 'bg-danger/10 text-danger border-danger/20',
  draft: 'bg-muted text-muted-foreground border-border',
  confirmed: 'bg-success/10 text-success border-success/20',
};

const variantLabels: Record<BadgeVariant, string> = {
  active: 'Active',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
  pending: 'Pending',
  expired: 'Expired',
  cancelled: 'Cancelled',
  expiring: 'Expiring Soon',
  available: 'Available',
  normal: 'Normal',
  'low-stock': 'Low Stock',
  critical: 'Critical',
  'out-of-stock': 'Out of Stock',
  overstocked: 'Overstocked',
  store: 'Store',
  business: 'Business',
  permanent: 'Permanent',
  consumable: 'Consumable',
  perishable: 'Perishable',
  paid: 'Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  draft: 'Draft',
  confirmed: 'Confirmed',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ variant, label, size = 'sm' }: StatusBadgeProps) {
  const text = label ?? variantLabels[variant];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center font-500 rounded-full border ${sizeClass} ${variantStyles[variant]}`}>
      {text}
    </span>
  );
}