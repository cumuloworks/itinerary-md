import { Buffer } from 'buffer';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerGlobalErrorHandlers } from './core/errors';
import { initializeRates } from './utils/currency';

registerGlobalErrorHandlers();

initializeRates();

const rootEl = document.getElementById('root');
if (!rootEl) {
    throw new Error('Root element not found');
}

declare global {
    interface Window {
        Buffer?: typeof Buffer;
    }
}
window.Buffer = window.Buffer || Buffer;

ReactDOM.createRoot(rootEl).render(
    <div className="min-h-svh min-w-[320px] bg-[#f8f9fa] font-sans overflow-hidden">
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
        <Toaster />
    </div>
);
