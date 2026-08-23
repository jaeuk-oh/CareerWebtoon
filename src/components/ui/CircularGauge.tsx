import React from 'react';
import { cn } from './cn';

export type GaugeTone = 'brand' | 'success' | 'warning' | 'danger';

const STROKE: Record<GaugeTone, string> = {
  brand: 'var(--color-brand-600)',
  success: 'var(--color-emerald-500)',
  warning: 'var(--color-amber-500)',
  danger: 'var(--color-rose-500)'
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface CircularGaugeProps {
  /** 0-100. Callers must pass a real measured value — never a placeholder. */
  value: number;
  tone?: GaugeTone;
  /** Rendered inside the ring. Defaults to the value with a % sign. */
  label?: React.ReactNode;
  caption?: React.ReactNode;
  className?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  tone = 'brand',
  label,
  caption,
  className
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label={`${clamped}%`}>
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--color-slate-100)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-slate-900">
          {label ?? (
            <>
              {clamped}
              <span className="text-lg">%</span>
            </>
          )}
        </span>
        {caption}
      </div>
    </div>
  );
};
