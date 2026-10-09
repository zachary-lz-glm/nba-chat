import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { searchPlayer, getAthleteCareer, getAthleteGamelog } from './players';

const load = (n: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../tests/fixtures/${n}`, import.meta.url)), 'utf8'));

describe('players', () => {
  it('searchPlayer 从 uid 解析数字 id', async () => {
    const r = await searchPlayer('shai', async () => load('search-sga.json'));
    expect(r[0]).toEqual({ id: 4278073, name: 'Shai Gilgeous-Alexander', team: expect.stringContaining('Thunder') });
  });
  it('生涯数据:stats 端点返回生涯聚合,SGA 生涯常规赛场均 25.3 分(fixture 实测值)', async () => {
    const c = await getAthleteCareer(4278073, async () => load('stats-4278073-2025.json'));
    expect(c.regular['PTS']).toBe('25.3');
  });
  it('逐场:2025 赛季最后一场是总决赛 G7(北京 6月23日),Postseason 组、对手 IND、SGA 29 分(fixture 实测值)', async () => {
    const gl = await getAthleteGamelog(4278073, 2025, async () => load('gamelog-4278073-2025.json'));
    const last = gl[gl.length - 1];
    expect(last.group).toContain('Postseason');
    expect(last.opp).toBe('IND');
    expect(last.pts).toBe('29');
  });
});
