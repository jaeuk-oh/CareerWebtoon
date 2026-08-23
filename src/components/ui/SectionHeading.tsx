import React from 'react';
import { cn } from './cn';

export interface SectionHeadingProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  icon,
  title,
  description,
  action,
  className
}) => (
  <div className={cn('flex items-start justify-between gap-4', className)}>
    <div className="flex items-start gap-3">
      {icon && (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
  </div>
);
