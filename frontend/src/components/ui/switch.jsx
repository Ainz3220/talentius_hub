import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '../../lib/utils.js';

export function Switch({ className, ...props }) {
  return (
    <RadixSwitch.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-[var(--accent)] data-[state=unchecked]:bg-slate-300',
        className
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
    </RadixSwitch.Root>
  );
}
