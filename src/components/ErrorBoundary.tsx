import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ReadLocal] Unhandled error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center font-sans bg-cream-50 dark:bg-ink-950">
        <p className="text-[15px] font-semibold text-ink-700 dark:text-cream-200">
          Something went wrong
        </p>
        <p className="text-[12.5px] text-ink-400 max-w-sm">
          {error.message || 'An unexpected error occurred. Reload the page to try again.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }
}
