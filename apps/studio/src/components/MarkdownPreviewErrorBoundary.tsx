import React, { type PropsWithChildren } from 'react';

type ErrorBoundaryState = {
    hasError: boolean;
    error?: Error;
};

export class MarkdownPreviewErrorBoundary extends React.Component<PropsWithChildren, ErrorBoundaryState> {
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
                <div role="alert" aria-live="assertive" className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded p-4">
                    <div className="text-center">
                        <div className="text-red-600 font-medium mb-2">Preview Rendering Error</div>
                        <div className="text-sm text-red-500 mb-3">{this.state.error?.message || 'An error occurred while rendering the preview'}</div>
                        <button type="button" onClick={() => this.setState({ hasError: false, error: undefined })} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
