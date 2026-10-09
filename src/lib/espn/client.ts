export class EspnError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

export async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new EspnError(`ESPN ${res.status}`, res.status);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof EspnError) throw e;
    throw new EspnError(e instanceof Error ? e.message : 'ESPN 请求失败');
  } finally { clearTimeout(t); }
}
