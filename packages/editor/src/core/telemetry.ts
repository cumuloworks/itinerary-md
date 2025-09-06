export type Telemetry = {
	captureException?: (error: unknown, ctx?: Record<string, any>) => void;
	captureMessage?: (msg: string, level?: "info" | "warning" | "error") => void;
};

import { createContext, useContext } from "react";

let currentTelemetry: Telemetry | undefined;

export function setTelemetry(telemetry: Telemetry | undefined): void {
	currentTelemetry = telemetry;
}

export function getTelemetry(): Telemetry | undefined {
	return currentTelemetry;
}

export function captureException(
	error: unknown,
	ctx?: Record<string, any>,
): void {
	try {
		currentTelemetry?.captureException?.(error, ctx);
	} catch {
		// noop: capturing must never throw
	}
}

export function captureMessage(
	msg: string,
	level?: "info" | "warning" | "error",
): void {
	try {
		currentTelemetry?.captureMessage?.(msg, level);
	} catch {
		// noop: capturing must never throw
	}
}

export const TelemetryContext = createContext<Telemetry | undefined>(undefined);
export function useTelemetry(): Telemetry | undefined {
	return useContext(TelemetryContext);
}
