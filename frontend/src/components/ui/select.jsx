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
        'flex h-9 w-full items-center justify-between rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[13px] focus:outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{ fontFamily: 'inherit', color: 'var(--text)' }}
      {...props}
    >
      {children}
      <RadixSelect.Icon>
        <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
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
        className={cn('z-50 min-w-[8rem] overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-md', className)}
        style={{ borderRadius: 'var(--r-sm)' }}
        {...props}
      >
        <RadixSelect.Viewport style={{ padding: 4 }}>{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({ className, children, ...props }) {
  return (
    <RadixSelect.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded px-2 py-1.5 text-[13px] outline-none focus:bg-[var(--surface2)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      style={{ fontFamily: 'inherit', color: 'var(--text)' }}
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
  return <RadixSelect.Label className={cn('px-2 py-1.5 text-xs font-semibold', className)} style={{ color: 'var(--text3)' }} {...props} />;
}

export function SelectSeparator({ className, ...props }) {
  return <RadixSelect.Separator className={cn('-mx-1 my-1 h-px', className)} style={{ background: 'var(--border)' }} {...props} />;
}
