import * as Sentry from "@sentry/react";

export const reactTelemetryAdapter = {
	captureException: (e: unknown, ctx?: Record<string, any>) =>
		Sentry.captureException(e, { extra: ctx }),
	captureMessage: (m: string, level?: "info" | "warning" | "error") =>
		Sentry.captureMessage(m, level as any),
};

export type ReactTelemetryAdapter = typeof reactTelemetryAdapter;
