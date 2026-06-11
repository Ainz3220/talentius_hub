import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({ className, children, ...props }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,25,22,0.45)' }} />
      <RadixDialog.Content
        className={cn('w-full max-w-lg max-h-[90vh] overflow-y-auto focus:outline-none', className)}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          zIndex: 201,
          transform: 'translate(-50%,-50%)',
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          animation: 'dialogIn 0.18s ease',
        }}
        {...props}
      >
        {children}
        <RadixDialog.Close
          style={{
            position: 'absolute', right: 12, top: 12, padding: 4,
            border: '1px solid var(--border)', borderRadius: 6, background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text3)',
          }}
        >
          <X size={14} />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn('', className)}
      style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }) {
  return (
    <RadixDialog.Title
      className={cn('', className)}
      style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: 'var(--text)' }}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }) {
  return (
    <RadixDialog.Description
      className={cn('', className)}
      style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn('', className)}
      style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border)' }}
      {...props}
    />
  );
}
