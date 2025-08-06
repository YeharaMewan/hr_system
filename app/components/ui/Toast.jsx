// app/components/ui/Toast.jsx
'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({
  message,
  type = 'success',
  isVisible = false,
  duration = 4000,
  onClose,
  position = 'top-right'
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setAnimate(true);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setAnimate(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border border-green-500/50 text-green-100';
      case 'error':
        return 'bg-red-900/90 border border-red-500/50 text-red-100';
      case 'warning':
        return 'bg-yellow-900/90 border border-yellow-500/50 text-yellow-100';
      case 'info':
        return 'bg-blue-900/90 border border-blue-500/50 text-blue-100';
      default:
        return 'bg-zinc-800 border border-zinc-600 text-white';
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getAnimationStyles = () => {
    if (position.includes('top')) {
      return animate 
        ? 'translate-y-0 opacity-100' 
        : '-translate-y-full opacity-0';
    } else {
      return animate 
        ? 'translate-y-0 opacity-100' 
        : 'translate-y-full opacity-0';
    }
  };

  return (
    <div 
      className={`fixed z-[9999] transition-all duration-300 ease-in-out ${getPositionStyles()} ${getAnimationStyles()}`}
    >
      <div className={`rounded-lg px-4 py-3 pr-12 min-w-[300px] max-w-[500px] ${getStyles()}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              {message}
            </p>
          </div>
          
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Provider Context
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id} // ✅ Fixed: Using unique toast.id as key
          message={toast.message}
          type={toast.type}
          isVisible={true}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
          position="top-right"
        />
      ))}
    </ToastContext.Provider>
  );
};

// Context for using toasts
const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default Toast;