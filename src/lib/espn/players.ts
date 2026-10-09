import { fetchJson } from './client';
const BASE = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';

const uidAthleteId = (uid: string) => Number((uid.split('~').pop() ?? '').split(':').pop()); // s:40~l:46~a:4278073 → 4278073

export async function searchPlayer(query: string, fetchImpl?: <T>(u: string) => Promise<T>) {
  const f = fetchImpl ?? (<T>(u: string) => fetchJson<T>(u));
  const d = await f<any>(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(query)}&limit=10`);
  const out: Array<{ id: number; name: string; team: string }> = [];
  for (const grp of d.results ?? []) {
    if (grp.type !== 'player') continue;
    for (const item of grp.contents ?? []) {
      if (item.uid?.startsWith('s:40~l:46~a:')) {
        out.push({ id: uidAthleteId(item.uid), name: item.displayName, team: item.subtitle ?? '' });
      }
    }
  }
  return out.slice(0, 5);
}

export async function getAthleteProfile(id: number, fetchImpl?: <T>(u: string) => Promise<T>) {
  const f = fetchImpl ?? (<T>(u: string) => fetchJson<T>(u));
  const d = await f<any>(`${BASE}/athletes/${id}`);
  const a = d.athlete ?? {};
  return {
    name: a.displayName ?? '',
    height: a.displayHeight ?? '', weight: a.displayWeight ?? '',
    position: a.position?.abbreviation ?? (d.position?.abbreviation ?? ''),
    team: a.team?.displayName ?? d.team?.displayName ?? '',
  };
}

/** stats 端点忽略 season 参数,恒为生涯聚合;seasontype=2 常规 / =3 季后 */
export async function getAthleteCareer(id: number, fetchImpl?: <T>(u: string) => Promise<T>) {
  const f = fetchImpl ?? (<T>(u: string) => fetchJson<T>(u));
  const one = async (seasontype: 2 | 3) => {
    const d = await f<any>(`${BASE}/athletes/${id}/stats?seasontype=${seasontype}`);
    const avg = d.categories?.find((c: any) => c.name === 'averages');
    const o: Record<string, string> = {};
    (avg?.labels ?? []).forEach((n: string, i: number) => (o[n] = avg?.totals?.[i] ?? ''));
    return o;
  };
  return { regular: await one(2), postseason: await one(3) };
}

export async function getAthleteGamelog(id: number, season: number, fetchImpl?: <T>(u: string) => Promise<T>) {
  const f = fetchImpl ?? (<T>(u: string) => fetchJson<T>(u));
  const d = await f<any>(`${BASE}/athletes/${id}/gamelog?season=${season}`);
  const labels: string[] = d.labels ?? []; // MIN,FG,FG%,3PT,3P%,FT,FT%,REB,AST,BLK,STL,PF,TO,PTS
  const idx = (n: string) => labels.indexOf(n);
  const meta = d.events ?? {}; // gameId -> { gameDate, atVs, opponent, gameResult, homeTeamScore, awayTeamScore }
  const rows: Array<{ group: string; date: string; opp: string; atVs: string; result: string; score: string; min: string; pts: string; reb: string; ast: string }> = [];
  for (const st of d.seasonTypes ?? []) {
    for (const cat of st.categories ?? []) {
      for (const ev of cat.events ?? []) {
        const m = meta[ev.eventId] ?? {};
        const s = ev.stats ?? [];
        rows.push({
          group: st.displayName ?? cat.displayName ?? '',
          date: m.gameDate ?? '',
          opp: m.opponent?.abbreviation ?? '',
          atVs: m.atVs === 'at' ? '客@' : '主vs',
          result: m.gameResult ?? '',
          score: `${m.homeTeamScore ?? ''}-${m.awayTeamScore ?? ''}`,
          min: s[idx('MIN')] ?? '', pts: s[idx('PTS')] ?? '',
          reb: s[idx('REB')] ?? '', ast: s[idx('AST')] ?? '',
        });
      }
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
