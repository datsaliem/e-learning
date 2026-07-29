import "server-only";

type LogValue = string | number | boolean | null | undefined;

const SECRET_PATTERN =
  /\b(?:sk_(?:live|test)|rk_(?:live|test)|whsec|re|sb_secret)_[A-Za-z0-9_-]+\b/g;
const BEARER_PATTERN = /\bBearer\s+\S+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const SENSITIVE_QUERY_PATTERN =
  /([?&](?:access_token|refresh_token|token|code|apikey|api_key|key)=)[^&#\s]+/gi;

function redact(value: string): string {
  return value
    .replace(SECRET_PATTERN, "[redacted-secret]")
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(JWT_PATTERN, "[redacted-jwt]")
    .replace(SENSITIVE_QUERY_PATTERN, "$1[redacted]")
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .slice(0, 1_000);
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    const digest =
      "digest" in error && typeof error.digest === "string" ? redact(error.digest) : undefined;

    return {
      errorType: error.name || "Error",
      errorMessage: redact(error.message || "Unknown error"),
      digest,
      stack:
        process.env.NODE_ENV !== "production" || process.env.ENABLE_STACK_TRACES === "true"
          ? redact(error.stack ?? "")
          : undefined,
    };
  }

  return {
    errorType: "Unknown",
    errorMessage: "Unknown error",
    digest: undefined,
    stack: undefined,
  };
}

/**
 * Emits one redacted JSON line. Vercel groups console output with the request
 * invocation, so the returned errorId can be used to correlate a user report
 * without logging cookies, request headers, payloads or personal data.
 */
export function logServerError(
  event: string,
  error: unknown,
  context: Record<string, LogValue> = {},
): string {
  const errorId = globalThis.crypto.randomUUID();
  const safeContext = Object.fromEntries(
    Object.entries(context)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, typeof value === "string" ? redact(value) : value]),
  );

  console.error(
    JSON.stringify({
      ...safeContext,
      level: "error",
      event: redact(event),
      errorId,
      timestamp: new Date().toISOString(),
      ...errorDetails(error),
    }),
  );

  return errorId;
}
