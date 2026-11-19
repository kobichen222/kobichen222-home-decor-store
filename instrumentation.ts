import type { Instrumentation } from "next";

// Server errors (pages, route handlers, server actions, proxy) go to the
// store's own error log and alert. Expected control-flow "errors" that
// Next.js throws on purpose (redirect / notFound) never reach this hook.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const e = err as { message?: string; digest?: string; stack?: string };
  const { reportServerError } = await import("@/lib/monitoring");
  await reportServerError({
    message: (e?.message ?? String(err)).slice(0, 1000),
    digest: e?.digest,
    stack: e?.stack?.split("\n").slice(0, 8).join("\n"),
    path: request.path.slice(0, 300),
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
