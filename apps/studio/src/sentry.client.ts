import * as Sentry from "@sentry/astro";

let inited = false;
export function initSentryBrowserOnce() {
	if (inited) return;
	const dsn = import.meta.env.PUBLIC_SENTRY_DSN as string | undefined;
	if (!dsn) return; // no-op when DSN is not provided
	inited = true;
	Sentry.init({
		dsn,
		integrations: [
			Sentry.browserTracingIntegration(),
			// Sentry.replayIntegration(),
			// Sentry.feedbackIntegration(),
		],
		tracesSampleRate: 0.2,
		beforeSend(event) {
			if (event.request?.headers) delete (event.request as any).headers;
			if (event.request?.cookies) delete (event.request as any).cookies;
			return event;
		},
	});
}
