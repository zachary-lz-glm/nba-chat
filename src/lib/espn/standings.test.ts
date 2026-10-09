import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getStandings } from './standings';

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('../../../tests/fixtures/standings-2025.json', import.meta.url)), 'utf8'));

describe('getStandings', () => {
  it('2024-25 赛季东西部各 15 队,骑士东部第一(64 胜,已知事实)', async () => {
    const confs = await getStandings(2025, async () => fixture);
    const east = confs.find((c) => c.conference.includes('Eastern'))!;
    expect(east.rows).toHaveLength(15);
    expect(east.rows[0].abbr).toBe('CLE');
    expect(east.rows[0].w).toBe('64');
  });
});
