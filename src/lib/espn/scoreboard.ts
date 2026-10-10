import { fetchJson } from './client';
import { etDatesForBeijingDay, fmtBeijing, isBeijingDay } from '../time';

export type GameSummary = {
  id: string; tipoffUtc: string; tipoffBeijing: string;
  homeAbbr: string; awayAbbr: string; homeTeam: string; awayTeam: string;
  homeScore: number | null; awayScore: number | null;
  status: string; winner: 'home' | 'away' | null;
  seriesText: string | null; note: string | null;
  seasonLabel: string | null; // 如 "2024-25 季后赛" / "2026-27 季前赛"
};

const SEASON_PHASES: Record<number, string> = { 1: '季前赛', 2: '常规赛', 3: '季后赛' };
const seasonLabelOf = (season: { year: number; type: number } | undefined) =>
  season ? `${season.year - 1}-${String(season.year).slice(2)}${SEASON_PHASES[season.type] ? ` ${SEASON_PHASES[season.type]}` : ''}` : null;

type FetchImpl = <T>(url: string) => Promise<T>;

/** 按北京日历日查询 NBA 赛程赛果:查覆盖的美东日期(1-2 天)→ 按 UTC 时间戳回滤北京窗口 */
export async function getGamesByBeijingDate(beijingDate: string, fetchImpl?: FetchImpl): Promise<GameSummary[]> {
  const f = fetchImpl ?? (<T>(u: string) => fetchJson<T>(u));
  const dates = etDatesForBeijingDay(beijingDate);
  const results = await Promise.all(
    dates.map((d) => f<any>(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d}`)),
  );
  const seen = new Set<string>();
  const games: GameSummary[] = [];
  for (const sb of results) {
    for (const ev of (sb?.events ?? []) as any[]) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      const utcMs = Date.parse(ev.date);
      if (!isBeijingDay(utcMs, beijingDate)) continue;
      const comp = ev.competitions[0];
      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors.find((c: any) => c.homeAway === 'away');
      const note = comp.notes?.[0]?.headline ?? null; // 如 "NBA Finals - Game 7"
      games.push({
        id: ev.id,
        tipoffUtc: ev.date,
        tipoffBeijing: fmtBeijing(utcMs),
        homeAbbr: home.team.abbreviation, awayAbbr: away.team.abbreviation,
        homeTeam: home.team.displayName, awayTeam: away.team.displayName,
        homeScore: home.score ? Number(home.score) : null,
        awayScore: away.score ? Number(away.score) : null,
        status: comp.status?.type?.description ?? ev.status?.type?.description ?? '',
        winner: home.winner ? 'home' : away.winner ? 'away' : null,
        seriesText: comp.series?.summary ?? null,
        note,
        seasonLabel: seasonLabelOf(ev.season),
      });
    }
  }
  return games.sort((a, b) => a.tipoffUtc.localeCompare(b.tipoffUtc));
}
