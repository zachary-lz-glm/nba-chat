import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getGamesByBeijingDate } from './scoreboard';

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('../../../tests/fixtures/scoreboard-20250622.json', import.meta.url)), 'utf8'));

describe('getGamesByBeijingDate', () => {
  it('北京日期 2025-06-23 应查到 G7(美东 06-22),并正确映射字段', async () => {
    const games = await getGamesByBeijingDate('2025-06-23', async () => fixture);
    const g7 = games.find((g) => g.id === '401766128');
    expect(g7).toBeDefined();
    expect(g7!.homeAbbr).toBe('OKC'); expect(g7!.awayAbbr).toBe('IND');
    expect(g7!.homeScore).toBe(103);  expect(g7!.awayScore).toBe(91);
    expect(g7!.winner).toBe('home');
    expect(g7!.seriesText).toContain('4-3');
    expect(g7!.tipoffBeijing).toContain('6月23日');
  });
  it('北京窗口过滤:查 06-22(美东)不应返回 G7', async () => {
    // fixture 只含美东 06-22 的比赛;北京 06-22 = 美东 06-21/06-22 白天,G7 开球在北京 06-23 → 应为空
    const games = await getGamesByBeijingDate('2025-06-22', async () => fixture);
    expect(games.find((g) => g.id === '401766128')).toBeUndefined();
  });
});
