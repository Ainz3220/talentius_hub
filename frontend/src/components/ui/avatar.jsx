import { cn, getInitials } from '../../lib/utils.js';

const colors = [
  'bg-[var(--accent)]',
  'bg-blue-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-teal-600',
];

function colorFor(name) {
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

export function Avatar({ name, src, size = 'md', className }) {
  const sizes = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium',
        colorFor(name),
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
