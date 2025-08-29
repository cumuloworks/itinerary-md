import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerGlobalErrorHandlers } from './core/errors';

registerGlobalErrorHandlers();

const rootEl = document.getElementById('root');
if (!rootEl) {
    throw new Error('Root element not found');
}

ReactDOM.createRoot(rootEl).render(
    <>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
        <Toaster />
    </>
);
