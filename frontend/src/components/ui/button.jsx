import { cn } from '../../lib/utils.js';

const variantStyles = {
  default:     'bg-[var(--accent)] text-white hover:bg-[#163D2E]',
  outline:     'border border-[var(--border)] bg-transparent text-[var(--text2)] hover:bg-[var(--surface2)]',
  ghost:       'bg-transparent text-[var(--text2)] hover:bg-[var(--surface2)]',
  destructive: 'bg-[var(--red)] text-white hover:opacity-90',
  secondary:   'bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface3)]',
};
const sizes = {
  sm:      'h-8 px-3 text-xs gap-1',
  default: 'h-9 px-4 text-[13px]',
  lg:      'h-10 px-6 text-sm',
  icon:    'h-9 w-9 p-0',
};

export function Button({ variant = 'default', size = 'default', className, disabled, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[var(--r-sm)] font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
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
