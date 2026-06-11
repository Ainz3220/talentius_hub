import { cn } from '../../lib/utils.js';

export function Card({ className, style, ...props }) {
  return (
    <div
      className={cn('table-card', className)}
      style={style}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('', className)}
      style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('', className)}
      style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn('', className)}
      style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn('', className)} style={{ padding: 16 }} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('', className)}
      style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}
      {...props}
    />
  );
}
