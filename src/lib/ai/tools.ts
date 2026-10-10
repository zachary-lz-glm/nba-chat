import { tool } from 'ai';
import { z } from 'zod';
import { getGamesByBeijingDate } from '../espn/scoreboard';
import { getBoxScore, getPlays, getGameMeta } from '../espn/summary';
import { getStandings } from '../espn/standings';
import { searchPlayer, getAthleteProfile, getAthleteCareer, getAthleteGamelog } from '../espn/players';
import { getNews } from '../espn/news';
import { getWikiSummary, getNbaChampions } from '../espn/wiki';

type Ctx = { fetchImpl?: <T>(u: string) => Promise<T> } & Record<string, unknown>;
// 工具 execute 直接调用客户端函数,末参传 ctx?.fetchImpl(生产为 undefined 走真实 fetch;单测注入 fixture)
// ai v7 execute 第二参为 SDK RunContext,不含 fetchImpl —— 注入仅用于单测,故此处收窄为 Ctx
const fetchOf = (ctx: unknown) => (ctx as Ctx | undefined)?.fetchImpl;

const fail = { error: '数据源暂不可用:请向用户说明暂无该数据,不要编造' };

/** 逐场数据按组(常规赛/季后赛)汇总场均,供模型直接引用,避免其自行心算 */
const summarizeGamelog = (rows: Array<{ group: string; pts: string; reb: string; ast: string }>) => {
  const by = new Map<string, { pts: number[]; reb: number[]; ast: number[] }>();
  for (const r of rows) {
    const g = by.get(r.group) ?? { pts: [], reb: [], ast: [] };
    for (const [k, v] of [['pts', g.pts], ['reb', g.reb], ['ast', g.ast]] as const) {
      const n = parseFloat(r[k]);
      if (!Number.isNaN(n)) v.push(n);
    }
    by.set(r.group, g);
  }
  const avg = (a: number[]) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null);
  return [...by.entries()].map(([group, g]) => ({ group, gp: g.pts.length, avgPTS: avg(g.pts), avgREB: avg(g.reb), avgAST: avg(g.ast) }));
};

export const nbaTools = {
  get_games_by_date: tool({
    description: '按北京时间日期查询当天 NBA 赛程与赛果(比分/状态/季后赛系列赛大比分/赛季阶段标签 seasonLabel 如「2026-27 季前赛」/赛事 note 如「NBA Finals - Game 7」)。日期一律用北京时间,格式 YYYY-MM-DD。',
    inputSchema: z.object({ date: z.string().describe('北京日期 YYYY-MM-DD,如 2025-06-23') }),
    execute: async ({ date }, ctx) => {
      try { return { games: await getGamesByBeijingDate(date, fetchOf(ctx)) }; } catch { return fail; }
    },
  }),
  get_game_box: tool({
    description: '按比赛 ID 查单场详情:两队比分/状态/赛事标签 + 两队球员技术统计(MIN/PTS/REB/AST/FG/3PT/FT/±,每队前 9 人)。比赛 ID 来自 get_games_by_date。',
    inputSchema: z.object({ game_id: z.string().describe('ESPN 比赛 ID,如 401766128') }),
    execute: async ({ game_id }, ctx) => {
      try {
        const [meta, box] = await Promise.all([
          getGameMeta(game_id, fetchOf(ctx)),
          getBoxScore(game_id, fetchOf(ctx)),
        ]);
        return { game: meta, box: box.teams };
      } catch { return fail; }
    },
  }),
  get_game_plays: tool({
    description: '查单场逐回合明细,用于「最后一攻/绝杀/某回合是谁」类问题。建议先 scoringOnly+lastSeconds 过滤,数据过多再缩小范围。',
    inputSchema: z.object({
      game_id: z.string(),
      last_seconds: z.number().optional().describe('只取第四节及加时最后 N 秒,如 120'),
      scoring_only: z.boolean().optional().describe('只取得分回合'),
      period: z.number().optional().describe('按节过滤:1-4,加时从 5 起'),
    }),
    execute: async (a, ctx) => {
      try { return { plays: await getPlays(a.game_id, { lastSeconds: a.last_seconds, scoringOnly: a.scoring_only, period: a.period }, fetchOf(ctx)) }; } catch { return fail; }
    },
  }),
  get_series_or_games_lookup: tool({
    description: '查某系列赛全部场次/某队近期赛程:给出北京日期范围(≤35 天,整个季后赛系列赛约 18 天可一次查全)与可选球队缩写,返回逐日赛果(含季后赛 series 字段、赛季阶段标签)。系列赛逐场比分表必须用本工具覆盖全部场次后再作答。',
    inputSchema: z.object({
      date_from: z.string().describe('北京日期起 YYYY-MM-DD'),
      date_to: z.string().describe('北京日期止 YYYY-MM-DD'),
      team_abbr: z.string().optional().describe('球队缩写如 OKC,不填则返回全部'),
    }),
    execute: async (a, ctx) => {
      try {
        const days: string[] = [];
        for (let d = new Date(`${a.date_from}T00:00:00Z`); d <= new Date(`${a.date_to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
          days.push(d.toISOString().slice(0, 10));
          if (days.length > 35) return { error: '范围过长,请拆分查询' };
        }
        const perDay = await Promise.all(days.map((day) => getGamesByBeijingDate(day, fetchOf(ctx))));
        const games = perDay.flat().filter((g: any) => !a.team_abbr || g.homeAbbr === a.team_abbr || g.awayAbbr === a.team_abbr);
        return { games };
      } catch { return fail; }
    },
  }),
  get_standings: tool({
    description: '查常规赛排名(东部/西部)。season 为该赛季结束年:2024-25 赛季传 2025、2025-26 传 2026、2026-27 传 2027。',
    inputSchema: z.object({ season: z.number().describe('赛季起始年,如 2025') }),
    execute: async ({ season }, ctx) => {
      try { return { conferences: await getStandings(season, fetchOf(ctx)) }; } catch { return fail; }
    },
  }),
  search_player: tool({
    description: '按球员英文姓名搜索(如 Luka Doncic、Shai Gilgeous-Alexander),返回 ESPN 球员 ID 与现役球队。用户用中文姓名提问时,必须先译成对应英文全名再调用(东契奇→Luka Doncic,亚历山大→Shai Gilgeous-Alexander,约基奇→Nikola Jokic,西亚卡姆→Pascal Siakam,哈利伯顿→Tyrese Haliburton,字母哥→Giannis Antetokounmpo);不要把中文直接传入。查球员数据前先调本工具拿 ID。',
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }, ctx) => {
      try { return { players: await searchPlayer(name, fetchOf(ctx)) }; } catch { return fail; }
    },
  }),
  get_player_stats: tool({
    description: '按球员 ID 查档案 + 生涯场均(跨赛季聚合,不是任何单赛季数据!) + 可选某赛季逐场与分组建场均(seasonLogSummary)。问「某赛季场均」必须看 seasonLogSummary(按 常规赛/季后赛 分组),严禁把 career 当赛季数据。season 为该赛季结束年:2024-25 赛季传 2025、2025-26 传 2026、2026-27 传 2027;不传 season 则只返回档案与生涯。',
    inputSchema: z.object({ player_id: z.number(), season: z.number().optional() }),
    execute: async (a, ctx) => {
      try {
        const [profile, career, seasonLog] = await Promise.all([
          getAthleteProfile(a.player_id, fetchOf(ctx)),
          getAthleteCareer(a.player_id, fetchOf(ctx)),
          a.season ? getAthleteGamelog(a.player_id, a.season, fetchOf(ctx)) : Promise.resolve(null),
        ]);
        return {
          profile, career,
          careerNote: 'career 为生涯跨赛季聚合场均,非单赛季数据',
          seasonLog,
          seasonLogSummary: seasonLog ? summarizeGamelog(seasonLog) : null,
        };
      } catch { return fail; }
    },
  }),
  get_player_gamelog: tool({
    description: '按球员 ID 查某赛季逐场数据(分组标注常规赛/季后赛,Postseason 组包含总决赛场次;6 月对阵同一对手的 4-7 场即总决赛)+ summary 分组建场均(GP/avgPTS/avgREB/avgAST)。用于连胜连败、场均推导、某场具体表现、判断球员打过哪些轮次(按日期+对手逐行核对,勿凭印象)。season 为该赛季结束年:2024-25 赛季传 2025、2025-26 传 2026、2026-27 传 2027。',
    inputSchema: z.object({ player_id: z.number(), season: z.number().optional() }),
    execute: async (a, ctx) => {
      try {
        const season = a.season ?? 2026;
        const games = await getAthleteGamelog(a.player_id, season, fetchOf(ctx));
        return { games, summary: summarizeGamelog(games) };
      } catch { return fail; }
    },
  }),
  get_champions: tool({
    description: '查 NBA 历年总冠军(近 30 年,年份→冠军队,含总决赛大比分与亚军)。凡问夺冠/卫冕/队史冠军/最近一次冠军类问题必须先调本工具,严禁凭记忆回答。',
    inputSchema: z.object({}),
    execute: async (_a, ctx) => {
      try { return await getNbaChampions(fetchOf(ctx)); } catch { return fail; }
    },
  }),
  get_news_or_wiki: tool({
    description: '查 ESPN NBA 最新新闻(不传参数)或中文维基百科摘要(传 topic,如「圣安东尼奥马刺」「NBA总决赛」),用于历史背景/队史/规则沿革。',
    inputSchema: z.object({ topic: z.string().optional().describe('维基条目名;不传则返回新闻') }),
    execute: async ({ topic }) => {
      try {
        if (topic) {
          const w = await getWikiSummary(topic);
          return w ?? { error: '维基未收录该条目,请如实说明暂无背景资料' };
        }
        return { news: await getNews(8) };
      } catch { return fail; }
    },
  }),
} as const;
