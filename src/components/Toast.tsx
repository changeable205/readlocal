import { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const duration = message.duration ?? 5000;
    const timer = setTimeout(() => onDismiss(message.id), duration);
    return () => clearTimeout(timer);
  }, [message.id, message.duration, onDismiss]);

  const bgColor = {
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    success: 'bg-teal-600',
  }[message.type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in`}
      role="alert"
      aria-live="polite"
    >
      <span className="flex-1">{message.message}</span>
      <button
        onClick={() => onDismiss(message.id)}
        className="text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ messages, onDismiss }: ToastContainerProps) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {messages.map((msg) => (
        <Toast key={msg.id} message={msg} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
