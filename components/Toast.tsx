import React, { useEffect } from 'react';

export interface ToastMsg {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Props {
  toasts: ToastMsg[];
  removeToast: (id: number) => void;
}

const Toast: React.FC<Props> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex flex-col items-center pointer-events-none space-y-2 p-4">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMsg; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(onRemove, 2500);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const bg = toast.type === 'success' ? 'bg-down/90' : toast.type === 'error' ? 'bg-up/90' : 'bg-gray-800/90';

  return (
    <div className={`${bg} backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium animate-pop flex items-center gap-2`}>
      {toast.type === 'success' && (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {toast.type === 'info' && (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      )}
      <span>{toast.message}</span>
    </div>
  );
};

export default Toast;