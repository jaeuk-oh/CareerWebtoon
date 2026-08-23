import React from 'react';
import { cn } from './cn';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Dashed border reads as "nothing here yet"; solid reads as "this is a real, empty panel". */
  bordered?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  bordered = true,
  className
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-12 text-center',
      bordered ? 'border border-dashed border-slate-300' : 'border border-slate-200',
      className
    )}
  >
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      {icon}
    </div>
    <h4 className="mb-1.5 text-lg font-bold text-slate-900">{title}</h4>
    {description && <p className="mb-6 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>}
    {action}
  </div>
);
