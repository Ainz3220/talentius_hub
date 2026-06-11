import { cn } from '../../lib/utils.js';

const variants = {
  default: 'bg-[var(--accent)] text-white hover:opacity-90',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
};
const sizes = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-base',
  icon: 'h-9 w-9 p-0',
};

export function Button({ variant = 'default', size = 'default', className, disabled, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
