import type { Instrumentation } from "next";

import { logServerError } from "@/lib/server-logger";

export function register() {
  // Reserved for a future OpenTelemetry exporter. Next.js invokes this once
  // for every server instance in both Node.js and Edge runtimes.
}

export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  logServerError("next_request_error", error, {
    route: context.routePath,
    routeType: context.routeType,
    router: context.routerKind,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
    runtime: process.env.NEXT_RUNTIME,
  });
};
