/**
 * useErrorHandler Hook
 * 
 * Provides a convenient way to handle errors in components with
 * automatic toast notifications and optional retry functionality.
 */

import { useCallback, useState } from 'react';
import { useToast } from '../contexts/toast';
import { AppError, parseError, logError, isNetworkError, isAuthError } from '../utils/errors';

interface UseErrorHandlerOptions {
  /**
   * Custom error handler that runs before showing toast
   */
  onError?: (error: AppError) => void;
  /**
   * Whether to automatically show toast on error (default: true)
   */
  showToast?: boolean;
  /**
   * Custom title for error toast
   */
  errorTitle?: string;
}

interface UseErrorHandlerReturn {
  /**
   * Current error state
   */
  error: AppError | null;
  /**
   * Whether an error has occurred
   */
  hasError: boolean;
  /**
   * Handle an error - parses, logs, and optionally shows toast
   */
  handleError: (error: unknown, title?: string) => AppError;
  /**
   * Clear the current error
   */
  clearError: () => void;
  /**
   * Wrap an async function with error handling
   */
  withErrorHandling: <T>(
    fn: () => Promise<T>,
    options?: { onSuccess?: (result: T) => void; onError?: (error: AppError) => void }
  ) => Promise<T | undefined>;
}

/**
 * Hook for handling errors with toast notifications
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const { showToast: shouldShowToast = true, errorTitle, onError } = options;
  const { showError } = useToast();
  const [error, setError] = useState<AppError | null>(null);

  const handleError = useCallback((err: unknown, title?: string): AppError => {
    const appError = parseError(err);
    
    // Log the error
    logError(appError);
    
    // Set error state
    setError(appError);
    
    // Call custom handler
    onError?.(appError);
    
    // Show toast if enabled
    if (shouldShowToast) {
      showError(appError, title ?? errorTitle);
    }
    
    return appError;
  }, [shouldShowToast, errorTitle, onError, showError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(async <T>(
    fn: () => Promise<T>,
    handlerOptions?: { onSuccess?: (result: T) => void; onError?: (error: AppError) => void }
  ): Promise<T | undefined> => {
    try {
      clearError();
      const result = await fn();
      handlerOptions?.onSuccess?.(result);
      return result;
    } catch (err) {
      const appError = handleError(err);
      handlerOptions?.onError?.(appError);
      return undefined;
    }
  }, [handleError, clearError]);

  return {
    error,
    hasError: error !== null,
    handleError,
    clearError,
    withErrorHandling,
  };
}

/**
 * Hook for handling async operations with loading and error states
 */
interface UseAsyncOperationOptions<T> extends UseErrorHandlerOptions {
  onSuccess?: (result: T) => void;
}

interface UseAsyncOperationReturn<T> {
  execute: (fn: () => Promise<T>) => Promise<T | undefined>;
  isLoading: boolean;
  error: AppError | null;
  clearError: () => void;
  reset: () => void;
}

export function useAsyncOperation<T = void>(
  options: UseAsyncOperationOptions<T> = {}
): UseAsyncOperationReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const { error, handleError, clearError } = useErrorHandler(options);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | undefined> => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await fn();
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      handleError(err);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError, options.onSuccess]);

  const reset = useCallback(() => {
    setIsLoading(false);
    clearError();
  }, [clearError]);

  return {
    execute,
    isLoading,
    error,
    clearError,
    reset,
  };
}

/**
 * Utility to check if error requires user to re-authenticate
 */
export function requiresReauth(error: unknown): boolean {
  return isAuthError(error);
}

/**
 * Utility to check if error is due to network issues
 */
export function isOfflineError(error: unknown): boolean {
  return isNetworkError(error);
}

export default useErrorHandler;
