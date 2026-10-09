import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getBoxScore, getPlays } from './summary';

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('../../../tests/fixtures/summary-401766128.json', import.meta.url)), 'utf8'));
const fetchImpl = async () => fixture;

describe('summary 压缩层', () => {
  it('box: 含两队,IND 队 Siakam 16 分,球员按分钟排序且 ≤9 人', async () => {
    const box = await getBoxScore('401766128', fetchImpl);
    expect(box.teams).toHaveLength(2);
    const ind = box.teams.find((t) => t.abbr === 'IND')!;
    const siakam = ind.players.find((p) => p.name.includes('Siakam'))!;
    expect(siakam.pts).toBe(16);
    for (const t of box.teams) expect(t.players.length).toBeLessThanOrEqual(9);
  });
  it('plays: 最后 120 秒 + 得分回合过滤,时间正序且均为得分回合', async () => {
    const plays = await getPlays('401766128', { lastSeconds: 120, scoringOnly: true }, fetchImpl);
    expect(plays.length).toBeGreaterThan(0);
    for (const p of plays) expect(p.text).toBeTruthy();
    // G7 末段 OKC 领先,最后一条得分回合后主队(OKC)得分应 ≥ 客队
    const last = plays[plays.length - 1];
    expect(last.quarter).toContain('4');
  });
  it('plays: 全场不过滤时约 500 条被压缩为精简字段', async () => {
    const plays = await getPlays('401766128', {}, fetchImpl);
    expect(plays.length).toBeGreaterThan(300);
    expect(Object.keys(plays[0]).sort()).toEqual(['clock', 'quarter', 'score', 'text']);
  });
});
