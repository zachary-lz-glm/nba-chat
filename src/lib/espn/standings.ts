import { fetchJson } from './client';

export async function getStandings(seasonStartYear: number, fetchImpl?: <T>(u: string) => Promise<T>): Promise<Array<{ conference: string; rows: Array<{ rank: number; team: string; abbr: string; w: string; l: string; pct: string }> }>> {
  const f = fetchImpl ?? (<T>(u: string) => fetchJson<T>(u));
  const d = await f<any>(`https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${seasonStartYear}`);
  const stat = (entry: any, name: string) => entry.stats?.find((s: any) => s.name === name)?.displayValue ?? '';
  return (d.children ?? []).map((conf: any) => ({
    conference: conf.name ?? conf.abbreviation,
    rows: (conf.standings?.entries ?? [])
      .map((e: any) => ({
        rank: Number(stat(e, 'playoffSeed') || 99),
        team: e.team.displayName, abbr: e.team.abbreviation,
        w: stat(e, 'wins'), l: stat(e, 'losses'), pct: stat(e, 'winPercent'),
      }))
      .sort((a: any, b: any) => a.rank - b.rank),
  }));
}
