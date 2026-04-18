import React, { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails } = this.props;

    if (hasError && error) {
      if (fallback && errorInfo) return fallback(error, errorInfo, this.resetErrorBoundary);

      const isDevelopment = import.meta.env.DEV;
      const shouldShowDetails = showDetails !== undefined ? showDetails : isDevelopment;

      return (
        <div className="max-w-2xl mx-auto py-10 px-4">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-500 mb-2">Something went wrong</h1>
              <p className="text-gray-600">We're sorry, but something unexpected happened.</p>
            </div>
            <button className="btn-primary w-full py-3" onClick={this.resetErrorBoundary}>
              Try Again
            </button>
            {shouldShowDetails && (
              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <h3 className="font-semibold text-red-700 mb-2 text-sm">Error Details (Development Only)</h3>
                <div className="mb-4">
                  <p className="font-semibold text-sm mb-1">Error Message:</p>
                  <pre className="bg-white p-2 rounded text-xs whitespace-pre-wrap">{error.message}</pre>
                </div>
                {error.stack && (
                  <div className="mb-4">
                    <p className="font-semibold text-sm mb-1">Stack Trace:</p>
                    <pre className="bg-white p-2 rounded text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{error.stack}</pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <p className="font-semibold text-sm mb-1">Component Stack:</p>
                    <pre className="bg-white p-2 rounded text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{errorInfo.componentStack}</pre>
                  </div>
                )}
                <button className="btn-outline text-sm mt-4" onClick={() => window.location.reload()}>
                  Reload Page
                </button>
              </div>
            )}
            {!shouldShowDetails && (
              <p className="text-sm text-gray-500 text-center">If this problem persists, please contact support.</p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);
  return React.useCallback((error: Error) => {
    setError(() => { throw error; });
  }, []);
}
