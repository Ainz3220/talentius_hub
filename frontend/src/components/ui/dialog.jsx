import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({ className, children, ...props }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white shadow-xl focus:outline-none w-full max-w-md max-h-[90vh] overflow-y-auto',
          className
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:text-slate-700">
          <X size={16} />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 px-5 pt-5 pb-3', className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <RadixDialog.Title className={cn('text-base font-semibold text-slate-900', className)} {...props} />;
}

export function DialogDescription({ className, ...props }) {
  return <RadixDialog.Description className={cn('text-sm text-slate-500', className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return <div className={cn('flex justify-end gap-2 px-5 py-4 border-t bg-slate-50 rounded-b-lg', className)} {...props} />;
}
