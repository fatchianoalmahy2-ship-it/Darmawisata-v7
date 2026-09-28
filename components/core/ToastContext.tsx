'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastItem, ToastType } from '@/types/masterCore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  showSuccess: (title: string, message?: string) => string;
  showError: (title: string, message?: string) => string;
  showInfo: (title: string, message?: string) => string;
  showWarning: (title: string, message?: string) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const newToast: ToastItem = { ...toast, id, duration: toast.duration || 3000 };

      // Keep only 1 active toast to avoid notification flood
      setToasts([newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => showToast({ type: 'success', title, message }),
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => showToast({ type: 'error', title, message }),
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => showToast({ type: 'info', title, message }),
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => showToast({ type: 'warning', title, message }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        removeToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider so app never crashes
    return {
      toasts: [],
      showToast: () => '',
      showSuccess: (t: string, m?: string) => console.log('Toast (success):', t, m) || '',
      showError: (t: string, m?: string) => console.error('Toast (error):', t, m) || '',
      showInfo: (t: string, m?: string) => console.info('Toast (info):', t, m) || '',
      showWarning: (t: string, m?: string) => console.warn('Toast (warning):', t, m) || '',
      removeToast: () => {},
    };
  }
  return context;
};

const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
  };

  const bgMap: Record<ToastType, string> = {
    success: 'bg-white border-emerald-200 shadow-emerald-500/10',
    error: 'bg-white border-rose-200 shadow-rose-500/10',
    info: 'bg-white border-blue-200 shadow-blue-500/10',
    warning: 'bg-white border-amber-200 shadow-amber-500/10',
  };

  return (
    <div
      id="toast-global-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 rounded-2xl border shadow-lg flex items-start gap-3 transition-all transform translate-y-0 duration-200 animate-in fade-in slide-in-from-bottom-2 ${bgMap[toast.type]}`}
        >
          {iconMap[toast.type]}
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-black text-slate-900 leading-snug">{toast.title}</h5>
            {toast.message && (
              <p className="text-[11px] font-medium text-slate-600 leading-relaxed mt-0.5">
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
