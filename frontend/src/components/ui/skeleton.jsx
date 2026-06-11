import { cn } from '../../lib/utils.js';

export function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded bg-slate-200', className)} {...props} />;
}
