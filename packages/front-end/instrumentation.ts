import { hostname } from "node:os";
import { scrubSentryEvent } from "shared/sentry";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    process.removeAllListeners("warning");
    process.on("warning", (warning: Error) => {
      process.stdout.write(
        JSON.stringify({
          level: 40,
          time: Date.now(),
          pid: process.pid,
          hostname: hostname(),
          msg: warning.message,
          warning: {
            name: warning.name,
            code: (warning as NodeJS.ErrnoException).code,
            stack: warning.stack,
          },
        }) + "\n",
      );
    });
  }

  // NB: Sentry for client-side is setup in initEnv
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    const { default: Sentry } = await import("@sentry/nextjs");

    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (sentryDsn) {
      Sentry.init({
        dsn: sentryDsn,
        sendDefaultPii: true,
        environment: process.env.NODE_ENV || "development",
        release: process.env.DD_VERSION || undefined,
        integrations: [
          // `data` (the body) and `cookies` default to true, independent of `sendDefaultPii`
          Sentry.requestDataIntegration({
            include: { data: false, cookies: false },
          }),
        ],
        beforeSend: (event) => scrubSentryEvent(event),
      });
    }
  }
}
