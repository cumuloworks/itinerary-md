import React, { type PropsWithChildren } from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class MarkdownPreviewErrorBoundary extends React.Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MarkdownPreview rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex h-full items-center justify-center rounded border border-red-200 bg-red-50 p-4"
        >
          <div className="text-center">
            <div className="mb-2 font-medium text-red-600">
              Preview Rendering Error
            </div>
            <div className="mb-3 text-sm text-red-500">
              {this.state.error?.message ||
                'An error occurred while rendering the preview'}
            </div>
            <button
              type="button"
              onClick={() =>
                this.setState({ hasError: false, error: undefined })
              }
              className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 transition-colors hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
