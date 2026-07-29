import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.7";

import {
  renderTransactionalEmail,
  type TransactionalEmailTemplate,
} from "../_shared/transactional-email-templates.ts";

interface EmailJob {
  job_id: string;
  template: TransactionalEmailTemplate;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  payload: Record<string, unknown>;
  dedupe_key: string;
  attempt_count: number;
}

interface ResendResponse {
  id?: string;
  name?: string;
  message?: string;
  statusCode?: number;
}

interface WorkerSummary {
  claimed: number;
  sent: number;
  retrying: number;
  deadLettered: number;
  acknowledgementErrors: number;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_BATCH_SIZE = 10;
const RESEND_TIMEOUT_MS = 15_000;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function optionalEnv(name: string): string | undefined {
  return Deno.env.get(name)?.trim() || undefined;
}

function batchSize(): number {
  const parsed = Number(Deno.env.get("EMAIL_WORKER_BATCH_SIZE"));
  if (!Number.isFinite(parsed)) return DEFAULT_BATCH_SIZE;
  return Math.min(25, Math.max(1, Math.trunc(parsed)));
}

function structuredLog(
  level: "info" | "warn" | "error",
  event: string,
  details: Record<string, unknown> = {},
): void {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });

  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

async function readResendResponse(response: Response): Promise<ResendResponse> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object" ? (value as ResendResponse) : {};
  } catch {
    return {};
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

function isRetryableResendError(status: number, errorName?: string): boolean {
  if (errorName === "invalid_idempotent_request") return false;
  if (errorName === "concurrent_idempotent_requests") return true;
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function markFailed(
  admin: SupabaseClient,
  job: EmailJob,
  errorMessage: string,
  responseStatus: number | null,
  retryable: boolean,
  retryAfterSeconds: number | null,
): Promise<"retry" | "dead_letter" | "ignored"> {
  const { data, error } = await admin.rpc("mark_transactional_email_failed", {
    p_job_id: job.job_id,
    p_error_message: errorMessage,
    p_response_status: responseStatus,
    p_retryable: retryable,
    p_retry_after_seconds: retryAfterSeconds,
  });

  if (error) {
    structuredLog("error", "email_failure_acknowledgement_failed", {
      jobId: job.job_id,
      template: job.template,
      attempt: job.attempt_count,
      error: error.message,
    });
    throw error;
  }

  return data === "dead_letter" || data === "retry" ? data : "ignored";
}

async function deliverJob(
  admin: SupabaseClient,
  job: EmailJob,
  config: {
    apiKey: string;
    from: string;
    replyTo?: string;
    appUrl: string;
  },
): Promise<"sent" | "retry" | "dead_letter" | "acknowledgement_error"> {
  let rendered;
  try {
    rendered = renderTransactionalEmail({
      template: job.template,
      recipientName: job.recipient_name,
      subject: job.subject,
      payload: job.payload,
      appUrl: config.appUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email template rendering failed.";
    try {
      const status = await markFailed(admin, job, message, null, false, null);
      structuredLog("error", "email_template_failed", {
        jobId: job.job_id,
        template: job.template,
        attempt: job.attempt_count,
        queueStatus: status,
        error: message,
      });
      return status === "retry" ? "retry" : "dead_letter";
    } catch {
      return "acknowledgement_error";
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      from: config.from,
      to: [job.recipient_email],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };
    if (config.replyTo) body.reply_to = config.replyTo;

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": job.dedupe_key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const responseBody = await readResendResponse(response);

    if (!response.ok || !responseBody.id) {
      const errorName = responseBody.name;
      const errorMessage =
        responseBody.message ||
        `Resend returned HTTP ${response.status}${responseBody.id ? "" : " without a message id"}.`;
      const retryable = isRetryableResendError(response.status, errorName);
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));

      try {
        const status = await markFailed(
          admin,
          job,
          errorName ? `${errorName}: ${errorMessage}` : errorMessage,
          response.status,
          retryable,
          retryAfter,
        );
        structuredLog(retryable ? "warn" : "error", "email_delivery_failed", {
          jobId: job.job_id,
          template: job.template,
          attempt: job.attempt_count,
          queueStatus: status,
          responseStatus: response.status,
          resendError: errorName,
        });
        return status === "retry" ? "retry" : "dead_letter";
      } catch {
        return "acknowledgement_error";
      }
    }

    const { data: acknowledged, error: acknowledgementError } = await admin.rpc(
      "mark_transactional_email_sent",
      {
        p_job_id: job.job_id,
        p_provider_message_id: responseBody.id,
        p_response_status: response.status,
      },
    );

    if (acknowledgementError || !acknowledged) {
      structuredLog("error", "email_success_acknowledgement_failed", {
        jobId: job.job_id,
        template: job.template,
        attempt: job.attempt_count,
        providerMessageId: responseBody.id,
        error: acknowledgementError?.message || "Job lease was no longer active.",
      });
      return "acknowledgement_error";
    }

    structuredLog("info", "email_sent", {
      jobId: job.job_id,
      template: job.template,
      attempt: job.attempt_count,
      providerMessageId: responseBody.id,
    });
    return "sent";
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "Resend request timed out."
        : error instanceof Error
          ? error.message
          : "Resend network request failed.";

    try {
      const status = await markFailed(admin, job, message, null, true, null);
      structuredLog("warn", "email_network_failed", {
        jobId: job.job_id,
        template: job.template,
        attempt: job.attempt_count,
        queueStatus: status,
        error: message,
      });
      return status === "retry" ? "retry" : "dead_letter";
    } catch {
      return "acknowledgement_error";
    }
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const workerToken = request.headers.get("X-Worker-Token");
    if (!workerToken) {
      return json({ error: "Unauthorized." }, 401);
    }

    const { data: isAuthorized, error: authorizationError } = await admin.rpc(
      "verify_transactional_email_worker",
      {
        p_token: workerToken,
      },
    );
    if (authorizationError || !isAuthorized) {
      structuredLog("warn", "email_worker_unauthorized", {
        error: authorizationError?.message,
      });
      return json({ error: "Unauthorized." }, 401);
    }

    // Validate all provider configuration before claiming work. A project can
    // safely deploy and schedule this worker before its Resend secrets exist.
    const config = {
      apiKey: requiredEnv("RESEND_API_KEY"),
      from: requiredEnv("RESEND_FROM_EMAIL"),
      replyTo: optionalEnv("RESEND_REPLY_TO"),
      appUrl: requiredEnv("EMAIL_APP_URL"),
    };

    const { data, error } = await admin.rpc("claim_transactional_email_jobs", {
      p_limit: batchSize(),
    });
    if (error) {
      structuredLog("error", "email_jobs_claim_failed", { error: error.message });
      return json({ error: "Unable to claim transactional email jobs." }, 500);
    }

    const jobs = (Array.isArray(data) ? data : []) as EmailJob[];
    const summary: WorkerSummary = {
      claimed: jobs.length,
      sent: 0,
      retrying: 0,
      deadLettered: 0,
      acknowledgementErrors: 0,
    };

    // Sequential delivery stays under Resend's default per-team request limit.
    for (const job of jobs) {
      const result = await deliverJob(admin, job, config);
      if (result === "sent") summary.sent += 1;
      if (result === "retry") summary.retrying += 1;
      if (result === "dead_letter") summary.deadLettered += 1;
      if (result === "acknowledgement_error") summary.acknowledgementErrors += 1;
    }

    structuredLog("info", "email_worker_completed", summary);
    return json({ data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transactional email worker failed.";
    structuredLog("error", "email_worker_failed", { error: message });

    const configurationError = message.startsWith("Missing ");
    return json(
      {
        error: configurationError
          ? "Transactional email provider is not configured."
          : "Transactional email worker failed.",
      },
      configurationError ? 503 : 500,
    );
  }
});
