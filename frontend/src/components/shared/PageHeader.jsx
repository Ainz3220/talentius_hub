export function PageHeader({ title, description, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: 'var(--text)', lineHeight: 1.2 }}>{title}</h2>
        {description && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{description}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
    </div>
  );
}
