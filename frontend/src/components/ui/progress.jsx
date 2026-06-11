import * as RadixProgress from '@radix-ui/react-progress';
import { cn } from '../../lib/utils.js';

export function Progress({ value, className }) {
  return (
    <RadixProgress.Root
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-slate-200', className)}
    >
      <RadixProgress.Indicator
        className="h-full bg-[var(--accent)] transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </RadixProgress.Root>
  );
}
