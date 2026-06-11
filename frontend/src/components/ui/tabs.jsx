import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils.js';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }) {
  return (
    <RadixTabs.List
      className={cn('inline-flex items-center border-b border-slate-200 w-full gap-0', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--accent)]',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return <RadixTabs.Content className={cn('mt-4 focus:outline-none', className)} {...props} />;
}
