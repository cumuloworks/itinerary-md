import toast from "react-hot-toast";
import { captureException } from "./telemetry";

export class AppError extends Error {
	code?: string;
	cause?: unknown;
	details?: unknown;
	constructor(
		message: string,
		options?: { code?: string; cause?: unknown; details?: unknown },
	) {
		super(message);
		this.name = "AppError";
		this.code = options?.code;
		this.cause = options?.cause;
		this.details = options?.details;
	}
}

export const notifyError = (message: string) => {
	toast.error(message, { position: "bottom-right" });
};

export const notifySuccess = (message: string) => {
	toast.success(message, { position: "bottom-right" });
};

export function normalizeError(error: unknown): Error {
	if (error instanceof Error) return error;
	try {
		return new Error(typeof error === "string" ? error : JSON.stringify(error));
	} catch {
		return new Error("Unknown error");
	}
}

export const safeLocalStorage = {
	get(key: string): string | null {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set(key: string, value: string): boolean {
		try {
			localStorage.setItem(key, value);
			return true;
		} catch {
			return false;
		}
	},
};

let globalHandlersRegistered = false;
export function registerGlobalErrorHandlers() {
	if (globalHandlersRegistered) return;
	globalHandlersRegistered = true;
	window.addEventListener("error", (ev) => {
		const err = normalizeError(ev.error ?? ev.message);
		console.error("[global error]", err);
		captureException(err, { source: "window.error" });
		notifyError("An unexpected error has occurred");
	});
	window.addEventListener("unhandledrejection", (ev) => {
		const err = normalizeError(ev.reason);
		console.error("[unhandledrejection]", err);
		captureException(err, { source: "unhandledrejection" });
		notifyError("An error occurred during processing");
	});
}
