import { fetchJson } from './client';

type FetchImpl = <T>(url: string) => Promise<T>;
const url = (id: string) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${id}`;

async function loadSummary(eventId: string, fetchImpl?: FetchImpl): Promise<any> {
  const f = fetchImpl ?? (<T>(u: string) => fetchJson<T>(u));
  return f<any>(url(eventId));
}

export type BoxSummary = {
  gameId: string;
  teams: Array<{
    abbr: string;
    totals: Record<string, string>;
    // min/pts/reb/ast/pm 为数字(ESPN 原始为字符串,此处强转);fg/tp/ft 保留 "5-13" 形式
    players: Array<{ name: string; starter: boolean; min: number; pts: number; reb: number; ast: number; fg: string; tp: string; ft: string; pm: number }>;
  }>;
};

const num = (v: any): number => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n; // DNP 行可能是 '' 或 '--'
};

/** box score:每队按出场时间取前 9 人,列裁剪为 MIN/PTS/REB/AST/FG/3PT/FT/+/- */
export async function getBoxScore(eventId: string, fetchImpl?: FetchImpl): Promise<BoxSummary> {
  const s = await loadSummary(eventId, fetchImpl);
  const teams = (s.boxscore?.players ?? []).map((t: any) => {
    const st = t.statistics[0]; // names 与 stats 位置对齐
    const idx = (n: string) => st.names.indexOf(n);
    const players = st.athletes
      .filter((a: any) => !a.didNotPlay && !a.dnp)
      .map((a: any) => ({
        name: a.athlete.displayName, starter: !!a.starter,
        min: num(a.stats[idx('MIN')]), pts: num(a.stats[idx('PTS')]),
        reb: num(a.stats[idx('REB')]), ast: num(a.stats[idx('AST')]),
        fg: a.stats[idx('FG')] ?? '', tp: a.stats[idx('3PT')] ?? '',
        ft: a.stats[idx('FT')] ?? '', pm: num(a.stats[idx('+/-')]),
      }))
      .sort((a: any, b: any) => Number(b.starter) - Number(a.starter) || b.min - a.min)
      .slice(0, 9);
    const totals: Record<string, string> = {};
    st.names.forEach((n: string, i: number) => (totals[n] = st.totals?.[i] ?? ''));
    return { abbr: t.team.abbreviation, totals, players };
  });
  return { gameId: eventId, teams };
}

export type PlaySummary = { quarter: string; clock: string; text: string; score: string };

function clockToSeconds(display: string): number {
  if (!display) return 0;
  // ISO-8601 风格:"PT5.0S" → 5;"PT1M10.0S" → 70
  const pt = /PT(?:(\d+)M)?(?:([\d.]+)S)?/.exec(display);
  if (pt) return Number(pt[1] ?? 0) * 60 + Number(pt[2] ?? 0);
  // NBA summary 接口实为普通格式:"12:00" → 720
  const mmss = /^(\d+):(\d+(?:\.\d+)?)$/.exec(display);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  // 纯秒:"19.1" → 19.1
  const sec = parseFloat(display);
  return Number.isNaN(sec) ? 0 : sec;
}

/** 逐回合:过滤 + 压缩。lastSeconds 取"第四节或加时最后 N 秒";scoringOnly 仅得分回合;period 按节号(1-4,5+ 为加时) */
export async function getPlays(
  eventId: string,
  opts: { lastSeconds?: number; scoringOnly?: boolean; period?: number },
  fetchImpl?: FetchImpl,
): Promise<PlaySummary[]> {
  const s = await loadSummary(eventId, fetchImpl);
  let plays: any[] = s.plays ?? [];
  if (opts.period) plays = plays.filter((p) => p.period?.number === opts.period);
  if (opts.lastSeconds != null) {
    const isClutch = (p: any) => (p.period?.number ?? 0) >= 4 && clockToSeconds(p.clock?.displayValue) <= opts.lastSeconds!;
    plays = plays.filter(isClutch);
  }
  if (opts.scoringOnly) plays = plays.filter((p) => p.scoringPlay);
  return plays.map((p) => ({
    quarter: `Q${p.period?.number ?? '?'}`,
    clock: (p.clock?.displayValue ?? '').replace(/^PT/, '').replace(/^0M/, ''),
    text: p.text ?? p.shortDescription ?? '',
    score: `${p.homeScore ?? 0}-${p.awayScore ?? 0}`,
  }));
}

/** 单场元信息(比分/状态/赛事标签),与 box 同源,供工具一次调用合并返回 */
export async function getGameMeta(eventId: string, fetchImpl?: FetchImpl) {
  const s = await loadSummary(eventId, fetchImpl);
  const c = s.header?.competitions?.[0];
  const home = c?.competitors?.find((x: any) => x.homeAway === 'home');
  const away = c?.competitors?.find((x: any) => x.homeAway === 'away');
  return {
    gameId: eventId,
    homeAbbr: home?.team?.abbreviation ?? '', awayAbbr: away?.team?.abbreviation ?? '',
    homeScore: home?.score ?? null, awayScore: away?.score ?? null,
    status: c?.status?.type?.description ?? '',
    note: c?.notes?.[0]?.note ?? null,
  };
}
