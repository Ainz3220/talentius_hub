import { cn } from '../../lib/utils.js';

export function Label({ className, ...props }) {
  return (
    <label
      className={cn('', className)}
      style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 5, display: 'block' }}
      {...props}
    />
  );
}
