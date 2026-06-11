import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils.js';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }) {
  return (
    <RadixTabs.List
      className={cn('inline-flex items-center gap-0.5 p-1 rounded-[var(--r-sm)]', className)}
      style={{ background: 'var(--surface2)' }}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'px-4 py-1.5 text-[13px] font-medium rounded cursor-pointer transition-all',
        'text-[var(--text2)] hover:text-[var(--text)]',
        'data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--text)] data-[state=active]:shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return <RadixTabs.Content className={cn('mt-4 focus:outline-none', className)} {...props} />;
}
