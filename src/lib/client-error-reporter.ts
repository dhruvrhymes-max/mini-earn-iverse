// Centralized client-side error reporting.
// Captures unhandled errors and promise rejections, attaches tenant context,
// and forwards them to the server log via a beacon. Safe no-op on the server.

let currentTenantSlug: string | null = null;
let currentTenantId: string | null = null;
let installed = false;
let lastReportKey = "";
let lastReportAt = 0;

export function setTenantContext(slug: string | null, id: string | null = null) {
  currentTenantSlug = slug;
  currentTenantId = id;
}

export function reportClientError(error: unknown, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const err = error instanceof Error ? error : new Error(String(error));
  const reportKey = `${err.message}:${extra?.kind ?? extra?.boundary ?? "manual"}`;
  const now = Date.now();
  if (reportKey === lastReportKey && now - lastReportAt < 5_000) return;
  lastReportKey = reportKey;
  lastReportAt = now;
  const payload = {
    message: err.message,
    stack: err.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    tenantSlug: currentTenantSlug,
    tenantId: currentTenantId,
    at: new Date().toISOString(),
    ...extra,
  };
  // Always log to console so dev tools / Lovable log capture see it.
  console.error("[client-error]", payload);
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/public/client-error", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/public/client-error", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // swallow — reporting must never throw
  }
}

export function installClientErrorReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => reportClientError(e.error ?? e.message, { kind: "error" }));
  window.addEventListener("unhandledrejection", (e) => reportClientError(e.reason, { kind: "unhandledrejection" }));
}
