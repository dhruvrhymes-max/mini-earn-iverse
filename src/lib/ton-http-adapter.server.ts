/** Worker-safe axios adapter for @ton/ton's TonClient. */
export async function tonFetchAdapter(config: any) {
  const controller = new AbortController();
  const timeoutMs = Number(config.timeout || 20_000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers();
    const sourceHeaders = config.headers?.toJSON?.() ?? config.headers ?? {};
    for (const [name, value] of Object.entries(sourceHeaders)) {
      if (value !== undefined && value !== null) headers.set(name, String(value));
    }
    if (!headers.has("content-type")) headers.set("content-type", "application/json");

    const response = await fetch(String(config.url), {
      method: String(config.method || "POST").toUpperCase(),
      headers,
      body: config.data == null
        ? undefined
        : typeof config.data === "string"
          ? config.data
          : JSON.stringify(config.data),
      signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Keep non-JSON error bodies so TonClient can report them.
    }

    if (!response.ok) {
      const detail = typeof data === "object" && data !== null
        ? JSON.stringify(data)
        : String(data || response.statusText);
      throw new Error(`TON RPC HTTP ${response.status}: ${detail}`);
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config,
      request: null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`TON RPC request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}