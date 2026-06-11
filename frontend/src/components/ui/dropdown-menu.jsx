import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils.js';

export const DropdownMenu = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;

export function DropdownMenuContent({ className, ...props }) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        className={cn('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md', className)}
        {...props}
      />
    </RadixDropdown.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }) {
  return (
    <RadixDropdown.Item
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }) {
  return (
    <RadixDropdown.Separator
      className={cn('-mx-1 my-1 h-px bg-slate-200', className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }) {
  return (
    <RadixDropdown.Label
      className={cn('px-2 py-1.5 text-xs font-semibold text-slate-500', className)}
      {...props}
    />
  );
}
