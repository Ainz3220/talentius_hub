import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const icons = { success: CheckCircle, error: AlertCircle, info: Info };
const colors = {
  success: 'border-green-500 bg-green-50',
  error: 'border-red-500 bg-red-50',
  info: 'border-blue-500 bg-blue-50',
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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map(t => {
          const Icon = icons[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`flex gap-3 rounded-lg border-l-4 p-3 shadow-lg bg-white ${colors[t.type] || ''}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-sm font-medium">{t.title}</p>}
                {t.description && <p className="text-xs text-slate-600 mt-0.5">{t.description}</p>}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
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
