import { cn } from '../../lib/utils.js';

export function Skeleton({ className, style, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded', className)}
      style={{ background: 'var(--surface3)', borderRadius: 6, ...style }}
      {...props}
    />
  );
}
