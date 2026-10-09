const hits = new Map<string, number[]>();

export function allowRequest(ip: string, nowMs = Date.now(), opts = { limit: 12, windowMs: 60_000 }): boolean {
  const arr = (hits.get(ip) ?? []).filter((t) => nowMs - t < opts.windowMs);
  if (arr.length >= opts.limit) { hits.set(ip, arr); return false; }
  arr.push(nowMs);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // 防内存膨胀(Serverless 实例级,尽力而为)
  return true;
}

export function __resetRlForTest() { hits.clear(); }
