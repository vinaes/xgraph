import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleResetProject = () => {
    try {
      localStorage.removeItem('xray-graph-autosave');
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-950 text-white p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">X</div>
            <h1 className="text-xl font-semibold">
              {this.props.fallbackMessage || 'Something went wrong'}
            </h1>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleResetProject}
                className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Reset & Reload
              </button>
            </div>
            <details className="text-left mt-4">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                Error Details
              </summary>
              <pre className="mt-2 text-[10px] text-slate-500 bg-slate-900 rounded p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                {this.state.error?.stack || 'No stack trace available'}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
