import React from 'react';
import { Package } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon = Package, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon size={24} className="text-muted-foreground" />
      </div>
      <h3 className="text-base font-600 text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-600 rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}