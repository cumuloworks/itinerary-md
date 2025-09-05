import React from 'react';
import { notifyError } from '../core/errors';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        console.error('[ErrorBoundary]', error);
        notifyError('An error occurred while rendering the page');
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-0 h-full flex items-center justify-center p-6">
                    <div className="rounded-lg max-w-md w-full p-6 text-center">
                        <div className="text-xl font-bold text-red-700">An error occurred</div>
                        <div className="text-sm text-gray-600 mt-2">Please reload the page.</div>
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <button type="button" className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => window.location.reload()}>
                                Reload
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
