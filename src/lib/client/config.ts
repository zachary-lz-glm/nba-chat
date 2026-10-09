import type { ClientModelConfig } from '@/lib/ai/model';

const KEY = 'nba-chat-config';
export function getClientConfig(): ClientModelConfig | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
export function setClientConfig(c: ClientModelConfig | null) {
  if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY);
}
