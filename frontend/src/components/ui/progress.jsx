import * as RadixProgress from '@radix-ui/react-progress';
import { cn } from '../../lib/utils.js';

export function Progress({ value, className }) {
  return (
    <RadixProgress.Root
      className={cn('relative overflow-hidden rounded-full', className)}
      style={{ height: 5, width: '100%', background: 'var(--surface3)' }}
    >
      <RadixProgress.Indicator
        style={{
          height: '100%',
          background: 'var(--accent)',
          transition: 'transform 0.4s',
          transform: `translateX(-${100 - (value || 0)}%)`,
          borderRadius: 4,
        }}
      />
    </RadixProgress.Root>
  );
}
