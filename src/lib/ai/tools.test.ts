import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { nbaTools } from './tools';

const load = (n: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../tests/fixtures/${n}`, import.meta.url)), 'utf8'));

describe('nbaTools', () => {
  it('10 个工具全部定义且带中文 description', () => {
    expect(Object.keys(nbaTools)).toHaveLength(10);
    for (const t of Object.values(nbaTools)) expect(t.description!.length).toBeGreaterThan(10);
  });
  it('get_games_by_date 用 fixture 跑通(注入 fetch)', async () => {
    const r = await nbaTools.get_games_by_date.execute!({ date: '2025-06-23' }, {
      fetchImpl: async () => load('scoreboard-20250622.json'),
      toolCallId: 'x', messages: [],
    } as any);
    expect(JSON.stringify(r)).toContain('OKC');
  });
  it('工具执行异常时返回结构化错误而非 throw', async () => {
    const r = await nbaTools.get_standings.execute!({ season: 2025 }, {
      fetchImpl: async () => { throw new Error('boom'); }, toolCallId: 'x', messages: [],
    } as any);
    expect((r as any).error).toBeTruthy();
  });
  it('get_champions 用 fixture 跑通(注入 fetch)', async () => {
    const r = await nbaTools.get_champions.execute!({}, {
      fetchImpl: async () => load('wiki-champions.json'), toolCallId: 'x', messages: [],
    } as any);
    expect(JSON.stringify(r)).toContain('OKC');
    expect(JSON.stringify(r)).toContain('2025');
  });
});
