import type { ClientModelConfig } from '@/lib/ai/model';

const KEY = 'nba-chat-config';
export function getClientConfig(): ClientModelConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    // 旧版 BYOK 结构(无 mode)归一为 mode:'byok'
    if (c && typeof c === 'object' && !c.mode && c.baseURL && c.model && c.apiKey) c.mode = 'byok';
    return c;
  } catch { return null; }
}
export function setClientConfig(c: ClientModelConfig | null) {
  if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY);
}
