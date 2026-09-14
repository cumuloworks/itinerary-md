import React from 'react';

import { notifyError } from '@/core/errors';
import { type Telemetry, TelemetryContext } from '@/core/telemetry';
import { tInstant } from '@/i18n';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static contextType = TelemetryContext;

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
    const telemetry = this.context as Telemetry | undefined;
    try {
      telemetry?.captureException?.(error, { component: 'ErrorBoundary' });
    } catch {}
    notifyError(tInstant('toast.unexpected'));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg p-6 text-center">
            <div className="text-xl font-bold text-red-700">
              An error occurred
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Please reload the page.
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                onClick={() => window.location.reload()}
              >
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
