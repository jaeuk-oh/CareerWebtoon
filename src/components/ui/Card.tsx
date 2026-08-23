import React from 'react';
import { cn } from './cn';

export type CardAccent = 'none' | 'brand' | 'success' | 'warning' | 'danger';

const ACCENT: Record<CardAccent, string> = {
  none: '',
  brand: 'border-l-4 border-l-brand-500',
  success: 'border-l-4 border-l-emerald-500',
  warning: 'border-l-4 border-l-amber-500',
  danger: 'border-l-4 border-l-rose-500'
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: CardAccent;
  interactive?: boolean;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  accent = 'none',
  interactive = false,
  padded = true,
  className,
  children,
  ...rest
}) => (
  <div
    {...rest}
    className={cn(
      'rounded-2xl border border-slate-200 bg-white shadow-sm',
      padded && 'p-6',
      interactive && 'cursor-pointer transition-shadow hover:border-slate-300 hover:shadow-md',
      ACCENT[accent],
      className
    )}
  >
    {children}
  </div>
);
