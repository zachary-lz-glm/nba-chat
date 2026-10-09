import { tool } from 'ai';
import { z } from 'zod';
import { getGamesByBeijingDate } from '../espn/scoreboard';
import { getBoxScore, getPlays, getGameMeta } from '../espn/summary';
import { getStandings } from '../espn/standings';
import { searchPlayer, getAthleteProfile, getAthleteCareer, getAthleteGamelog } from '../espn/players';
import { getNews } from '../espn/news';
import { getWikiSummary } from '../espn/wiki';

type Ctx = { fetchImpl?: <T>(u: string) => Promise<T> } & Record<string, unknown>;
// 工具 execute 直接调用客户端函数,末参传 ctx?.fetchImpl(生产为 undefined 走真实 fetch;单测注入 fixture)
// ai v7 execute 第二参为 SDK RunContext,不含 fetchImpl —— 注入仅用于单测,故此处收窄为 Ctx
const fetchOf = (ctx: unknown) => (ctx as Ctx | undefined)?.fetchImpl;

const fail = { error: '数据源暂不可用:请向用户说明暂无该数据,不要编造' };

export const nbaTools = {
  get_games_by_date: tool({
    description: '按北京时间日期查询当天 NBA 赛程与赛果(比分/状态/季后赛系列赛大比分)。日期一律用北京时间,格式 YYYY-MM-DD。',
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
    description: '查某系列赛当前大比分/某队近期赛程:给出北京日期范围(≤14 天)与可选球队缩写,返回逐日赛果(含季后赛 series 字段)。',
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
          if (days.length > 14) return { error: '范围过长,请拆分查询' };
        }
        const perDay = await Promise.all(days.map((day) => getGamesByBeijingDate(day, fetchOf(ctx))));
        const games = perDay.flat().filter((g: any) => !a.team_abbr || g.homeAbbr === a.team_abbr || g.awayAbbr === a.team_abbr);
        return { games };
      } catch { return fail; }
    },
  }),
  get_standings: tool({
    description: '查常规赛排名(东部/西部)。season 为起始年,如 2025-26 赛季传 2025。',
    inputSchema: z.object({ season: z.number().describe('赛季起始年,如 2025') }),
    execute: async ({ season }, ctx) => {
      try { return { conferences: await getStandings(season, fetchOf(ctx)) }; } catch { return fail; }
    },
  }),
  search_player: tool({
    description: '按名字(中/英)搜索球员,返回 ESPN 球员 ID 与现役球队。查球员数据前先调本工具拿 ID。',
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }, ctx) => {
      try { return { players: await searchPlayer(name, fetchOf(ctx)) }; } catch { return fail; }
    },
  }),
  get_player_stats: tool({
    description: '按球员 ID 查档案 + 生涯场均(常规赛/季后赛) + 可选某赛季逐场数据(含分组:常规赛/季后赛)。season 传起始年(如 2025 指 2025-26 赛季);不传 season 则只返回档案与生涯。',
    inputSchema: z.object({ player_id: z.number(), season: z.number().optional() }),
    execute: async (a, ctx) => {
      try {
        const [profile, career, seasonLog] = await Promise.all([
          getAthleteProfile(a.player_id, fetchOf(ctx)),
          getAthleteCareer(a.player_id, fetchOf(ctx)),
          a.season ? getAthleteGamelog(a.player_id, a.season, fetchOf(ctx)) : Promise.resolve(null),
        ]);
        return { profile, career, seasonLog };
      } catch { return fail; }
    },
  }),
  get_player_gamelog: tool({
    description: '按球员 ID 查某赛季逐场数据(分组标注常规赛/季后赛;日期/对手/胜负/MIN/PTS/REB/AST),用于连胜连败、场均推导、某场具体表现。season 传起始年(如 2025 指 2025-26 赛季)。',
    inputSchema: z.object({ player_id: z.number(), season: z.number().optional() }),
    execute: async (a, ctx) => {
      try {
        const season = a.season ?? 2026;
        return { games: await getAthleteGamelog(a.player_id, season, fetchOf(ctx)) };
      } catch { return fail; }
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
