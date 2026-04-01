import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong.';
      try {
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error) {
          errorMessage = `Firestore Error: ${parsedError.error} (${parsedError.operationType})`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || 'An unexpected error occurred.';
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-gray-950 p-4 transition-colors duration-300">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl max-w-md w-full border border-rose-100 dark:border-gray-800 transition-colors duration-300">
            <h2 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mb-4">Oops! 🌸</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-rose-600 dark:bg-rose-500 text-white py-3 rounded-xl font-semibold hover:bg-rose-700 dark:hover:bg-rose-600 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
