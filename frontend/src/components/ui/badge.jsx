import { cn } from '../../lib/utils.js';

const variants = {
  default: 'bg-slate-100 text-slate-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  destructive: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  outline: 'border border-slate-300 text-slate-700',
  secondary: 'bg-slate-200 text-slate-700',
};

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
