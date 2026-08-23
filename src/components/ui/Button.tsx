import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Primary stays within one hue (brand-600 -> brand-700). The old
// `bg-slate-900 hover:bg-emerald-600` jumped from near-black to green on hover,
// which read as a state change rather than a hover.
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 shadow-sm',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl'
};

const SPINNER_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || isLoading}
    className={cn(
      'inline-flex items-center justify-center font-bold transition-colors',
      'disabled:opacity-60 disabled:cursor-not-allowed',
      VARIANT[variant],
      SIZE[size],
      fullWidth && 'w-full',
      className
    )}
  >
    {isLoading ? <Loader2 className="animate-spin" size={SPINNER_SIZE[size]} /> : icon}
    {children}
  </button>
);
