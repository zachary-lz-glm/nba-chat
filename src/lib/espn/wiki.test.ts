import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getNbaChampions } from './wiki';

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('../../../tests/fixtures/wiki-champions.json', import.meta.url)), 'utf8'));

describe('getNbaChampions', () => {
  it('解析维基表格:2025→雷霆(OKC)、1999→马刺(SAS),含总决赛比分与亚军', async () => {
    const { champions, note } = await getNbaChampions(async () => fixture);
    expect(champions.length).toBeGreaterThan(25);
    expect(note).toContain('赛季结束年');
    const latest = champions[0];
    expect(latest.year).toBe(2025);
    expect(latest.champion).toContain('OKC');
    expect(latest.champion).toContain('雷霆');
    expect(latest.finalsScore).toBe('4-3');
    expect(latest.runnerUp).toContain('IND');
    const y1999 = champions.find((r) => r.year === 1999);
    expect(y1999?.champion).toContain('SAS');
    expect(y1999?.champion).toContain('马刺');
    expect(y1999?.finalsScore).toBe('4-1');
  });
  it('繁体/异体队名统一为简体规范名(含缩写)', async () => {
    const { champions } = await getNbaChampions(async () => fixture);
    const y2011 = champions.find((r) => r.year === 2011);
    expect(y2011?.champion).toBe('达拉斯独行侠(DAL)');
    const y2019 = champions.find((r) => r.year === 2019);
    expect(y2019?.champion).toBe('多伦多猛龙(TOR)');
  });
  it('按年份降序', async () => {
    const { champions } = await getNbaChampions(async () => fixture);
    const years = champions.map((r) => r.year);
    expect([...years].sort((a, b) => b - a)).toEqual(years);
  });
});
