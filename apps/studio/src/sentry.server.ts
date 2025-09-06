import * as Sentry from "@sentry/astro";

let inited = false;
export function initSentryServerOnce() {
	if (inited) return;
	const dsn = process.env.SENTRY_DSN as string | undefined;
	if (!dsn) return; // no-op when DSN is not provided
	inited = true;
	Sentry.init({
		dsn,
		tracesSampleRate: 0.2,
	});
}
