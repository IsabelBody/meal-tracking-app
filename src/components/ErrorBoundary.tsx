/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */

import { AlertCircle, RefreshCw } from '@tamagui/lucide-icons';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Card, H4, Paragraph, YStack } from 'tamagui';

import { AppError, ErrorCodes, logError, parseError } from '../utils/errors';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * Error Boundary class component
 * 
 * Note: Error boundaries must be class components as there's no
 * hook equivalent for componentDidCatch/getDerivedStateFromError.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = parseError(error);
    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = parseError(error);
    
    // Log the error with full details
    logError(appError, {
      componentStack: errorInfo.componentStack,
      originalErrorName: error?.name,
      originalErrorMessage: error?.message,
      originalStack: error?.stack,
    });

    // Also log to console in dev for better debugging
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', {
        name: error?.name,
        message: error?.message,
        appErrorCode: appError.code,
        appErrorMessage: appError.userMessage,
        componentStack: errorInfo.componentStack?.substring(0, 500),
      });
    }

    // Call optional error handler
    this.props.onError?.(appError, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default fallback UI when an error occurs
 */
interface ErrorFallbackProps {
  error: AppError | null;
  onRetry?: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const isRetryable = error?.isRetryable ?? true;
  
  return (
    <YStack
      flex={1}
      backgroundColor="$backgroundHover"
      alignItems="center"
      justifyContent="center"
      padding="$4"
    >
      <Card
        elevate
        bordered
        padding="$5"
        maxWidth={400}
        width="100%"
        backgroundColor="$background"
      >
        <YStack alignItems="center" gap="$4">
          <YStack
            width={64}
            height={64}
            borderRadius={32}
            backgroundColor="#FEE2E2"
            alignItems="center"
            justifyContent="center"
          >
            <AlertCircle size={32} color="#EF4444" />
          </YStack>

          <YStack alignItems="center" gap="$2">
            <H4 textAlign="center" color="$color">
              Something went wrong
            </H4>
            <Paragraph
              textAlign="center"
              color="$colorHover"
              fontSize="$3"
            >
              {error?.userMessage || 'An unexpected error occurred. Please try again.'}
            </Paragraph>
          </YStack>

          {isRetryable && onRetry && (
            <Button
              size="$4"
              backgroundColor="#10B981"
              color="white"
              icon={RefreshCw}
              onPress={onRetry}
              pressStyle={{ opacity: 0.8 }}
            >
              Try Again
            </Button>
          )}

          {__DEV__ && error && (
            <Card
              padding="$3"
              backgroundColor="$backgroundHover"
              width="100%"
              marginTop="$2"
            >
              <Paragraph fontSize="$2" color="$colorHover" fontFamily="$mono">
                {error.code}: {error.message}
              </Paragraph>
            </Card>
          )}
        </YStack>
      </Card>
    </YStack>
  );
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
