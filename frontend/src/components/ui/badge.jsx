import { cn } from '../../lib/utils.js';

const variantToClass = {
  default:     'badge-global',
  success:     'badge-active',
  warning:     'badge-pending',
  destructive: 'badge-expired',
  info:        'badge-transferred',
  outline:     'badge-repatriated',
  secondary:   'badge-custom',
};

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn('badge-dot', variantToClass[variant] ?? 'badge-global', className)}>
      {children}
    </span>
  );
}
