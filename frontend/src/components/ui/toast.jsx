import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const icons = { success: CheckCircle, error: AlertCircle, info: Info };
const toastStyles = {
  success: { borderLeft: '3px solid var(--green)',  background: 'var(--green-light)',  color: 'var(--green)' },
  error:   { borderLeft: '3px solid var(--red)',    background: 'var(--red-light)',    color: 'var(--red)' },
  info:    { borderLeft: '3px solid var(--blue)',   background: 'var(--blue-light)',   color: 'var(--blue)' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, type = 'info', duration = 4000 }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, description, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8, width: 320 }}>
        {toasts.map(t => {
          const Icon = icons[t.type] || Info;
          const style = toastStyles[t.type] || toastStyles.info;
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                gap: 10,
                borderRadius: 'var(--r)',
                padding: '10px 12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                ...style,
              }}
            >
              <Icon size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {t.title && <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.title}</p>}
                {t.description && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{t.description}</p>}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
