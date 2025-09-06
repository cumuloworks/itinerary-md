import { Buffer } from "buffer";
import "./index.css";
import type { FC } from "react";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { registerGlobalErrorHandlers } from "./core/errors";
import {
	setTelemetry,
	type Telemetry,
	TelemetryContext,
} from "./core/telemetry";
import { I18nProvider } from "./i18n";
import { initializeRates } from "./utils/currency";

declare global {
	interface Window {
		Buffer?: typeof Buffer;
	}
}

if (typeof window !== "undefined") {
	registerGlobalErrorHandlers();
	initializeRates();
	window.Buffer = window.Buffer || Buffer;
}

// Lazy load the actual editor component for SSR safety
const EditorBare = lazy(() =>
	import("./components/Editor").then((module) => ({
		default: module.Editor,
	})),
);

export interface EditorProps {
	storageKey?: string;
	samplePath?: string;
	rate?: { from: string; to: string; value: number };
	/**
	 * UI language. Example: "en", "ja", or locale like "ja-JP".
	 * If omitted, browser language is used.
	 */
	language?: string;
	/** Optional telemetry adapter for error reporting */
	telemetry?: Telemetry;
}

export const Editor: FC<EditorProps> = (props) => {
	useEffect(() => {
		setTelemetry(props.telemetry);
		return () => setTelemetry(undefined);
	}, [props.telemetry]);

	// SSR safety check
	if (typeof window === "undefined") {
		return null;
	}

	// Avoid passing telemetry down to inner component
	const { telemetry: _telemetry, ...rest } = props as any;
	return (
		<div className="w-full h-full min-h-0 min-w-0">
			<TelemetryContext.Provider value={props.telemetry}>
				<ErrorBoundary>
					<I18nProvider language={props.language}>
						<Suspense
							fallback={
								<div className="flex items-center justify-center h-full text-gray-500 bg-white rounded-lg p-4 border border-gray-300">
									Loading editor...
								</div>
							}
						>
							<EditorBare {...(rest as any)} />
						</Suspense>
					</I18nProvider>
				</ErrorBoundary>
			</TelemetryContext.Provider>
			<Toaster />
		</div>
	);
};

export { EditorBare as EditorInner };
