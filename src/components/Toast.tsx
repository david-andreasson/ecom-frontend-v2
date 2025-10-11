import React, { useEffect, useState } from 'react';

type ToastMessage = {
  id: number;
  message: string;
};

export const Toast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleCartReplaced = (e: Event) => {
      const event = e as CustomEvent;
      const { oldProduct, newProduct, isSameProduct } = event.detail;
      const message = isSameProduct 
        ? `Only one horoscope per purchase. Cart already contains "${oldProduct}".`
        : `Cart updated: "${oldProduct}" replaced with "${newProduct}"`;
      
      const id = Date.now();
      setToasts(prev => [...prev, { id, message }]);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };

    window.addEventListener('cart-replaced', handleCartReplaced);
    return () => window.removeEventListener('cart-replaced', handleCartReplaced);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: '#333',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: '400px',
            fontSize: '14px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
