/**
 * Toast Notification Context
 * 
 * Provides a global toast notification system for displaying
 * success, error, warning, and info messages to users.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AppError, getUserMessage, isAppError, logError } from '../utils/errors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  showSuccess: (message: string, title?: string) => string;
  showError: (error: unknown, title?: string) => string;
  showWarning: (message: string, title?: string) => string;
  showInfo: (message: string, title?: string) => string;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Default durations by type (in milliseconds)
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

// Maximum number of toasts to show at once
const MAX_TOASTS = 3;

let toastCounter = 0;
function generateToastId(): string {
  return `toast-${++toastCounter}-${Date.now()}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateToastId();
    const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type];

    const newToast: Toast = {
      ...toast,
      id,
      duration,
    };

    setToasts((current) => {
      // Keep only the most recent toasts
      const updated = [...current, newToast];
      if (updated.length > MAX_TOASTS) {
        return updated.slice(-MAX_TOASTS);
      }
      return updated;
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }

    return id;
  }, [hideToast]);

  const showSuccess = useCallback((message: string, title?: string): string => {
    return showToast({
      type: 'success',
      title: title ?? 'Success',
      message,
    });
  }, [showToast]);

  const showError = useCallback((error: unknown, title?: string): string => {
    // Log the error
    if (isAppError(error)) {
      logError(error);
    } else if (error instanceof Error) {
      logError(error);
    }

    // Get user-friendly message
    const message = getUserMessage(error);
    
    // Determine if we should show retry action
    const isRetryable = isAppError(error) && error.isRetryable;
    
    return showToast({
      type: 'error',
      title: title ?? 'Error',
      message,
      duration: isRetryable ? 6000 : DEFAULT_DURATIONS.error,
    });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string): string => {
    return showToast({
      type: 'warning',
      title: title ?? 'Warning',
      message,
    });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string): string => {
    return showToast({
      type: 'info',
      title,
      message,
    });
  }, [showToast]);

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      hideToast,
      hideAllToasts,
    }),
    [toasts, showToast, showSuccess, showError, showWarning, showInfo, hideToast, hideAllToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast notifications
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
