import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function Select({ children, ...props }) {
  return <RadixSelect.Root {...props}>{children}</RadixSelect.Root>;
}

export function SelectTrigger({ className, children, ...props }) {
  return (
    <RadixSelect.Trigger
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon>
        <ChevronDown size={14} className="text-slate-500" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectValue(props) {
  return <RadixSelect.Value {...props} />;
}

export function SelectContent({ className, children, ...props }) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white shadow-md', className)}
        {...props}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({ className, children, ...props }) {
  return (
    <RadixSelect.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}

export function SelectGroup(props) {
  return <RadixSelect.Group {...props} />;
}

export function SelectLabel({ className, ...props }) {
  return <RadixSelect.Label className={cn('px-2 py-1.5 text-xs font-semibold text-slate-500', className)} {...props} />;
}

export function SelectSeparator({ className, ...props }) {
  return <RadixSelect.Separator className={cn('-mx-1 my-1 h-px bg-slate-200', className)} {...props} />;
}
