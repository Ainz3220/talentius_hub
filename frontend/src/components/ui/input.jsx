import { cn } from '../../lib/utils.js';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[13px] transition-colors placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{ fontFamily: 'inherit', color: 'var(--text)' }}
      {...props}
    />
  );
}
