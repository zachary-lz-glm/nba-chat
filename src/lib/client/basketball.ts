import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { z } from 'zod';

const score = z.preprocess((value) => typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : value, z.number().finite().nonnegative().nullable());
export const gameSchema = z.object({
  id: z.string().min(1), homeAbbr: z.string().min(1), awayAbbr: z.string().min(1),
  homeTeam: z.string().default(''), awayTeam: z.string().default(''),
  homeScore: score, awayScore: score, tipoffBeijing: z.string().default(''),
  status: z.string(), seasonLabel: z.string().nullable().default(null), note: z.string().nullable().default(null),
});
export type GameCard = z.infer<typeof gameSchema>;

const TEAMS: Record<string, [string, string]> = {
  ATL: ['老鹰', '#E03A3E'], BOS: ['凯尔特人', '#008C58'], BKN: ['篮网', '#9DA6B3'], CHA: ['黄蜂', '#159EB8'],
  CHI: ['公牛', '#CE364A'], CLE: ['骑士', '#C79846'], DAL: ['独行侠', '#318ED5'], DEN: ['掘金', '#E9B83F'],
  DET: ['活塞', '#E34557'], GSW: ['勇士', '#E7BC41'], HOU: ['火箭', '#D44855'], IND: ['步行者', '#E8B943'],
  LAC: ['快船', '#DD4B5A'], LAL: ['湖人', '#D9AD41'], MEM: ['灰熊', '#7394CA'], MIA: ['热火', '#DE4B55'],
  MIL: ['雄鹿', '#549678'], MIN: ['森林狼', '#74A798'], NO: ['鹈鹕', '#B39869'], NOP: ['鹈鹕', '#B39869'],
  NY: ['尼克斯', '#E77D38'], NYK: ['尼克斯', '#E77D38'], OKC: ['雷霆', '#EE8B46'], ORL: ['魔术', '#529BD0'],
  PHI: ['76人', '#5495D1'], PHX: ['太阳', '#D77E46'], POR: ['开拓者', '#D34A56'], SAC: ['国王', '#9B83CD'],
  SA: ['马刺', '#AAB3C0'], SAS: ['马刺', '#AAB3C0'], TOR: ['猛龙', '#DA495C'], UTA: ['爵士', '#9B8AD3'],
  WSH: ['奇才', '#DE5669'], WAS: ['奇才', '#DE5669'],
};
export const teamName = (abbr: string, fallback = '') => TEAMS[abbr]?.[0] ?? (fallback || abbr);
export const teamColor = (abbr: string) => TEAMS[abbr]?.[1] ?? '#AAB8CA';
export const statusLabel = (status: string) => ({ Final: '已结束', Scheduled: '未开始', 'In Progress': '进行中', Postponed: '已延期', Canceled: '已取消', Cancelled: '已取消', 'Final/OT': '加时结束' }[status] ?? status);
export function quarterLabel(quarter: string) {
  const n = Number(quarter.replace(/^Q/, ''));
  return n > 4 ? `加时 ${n - 4}` : ['第一节', '第二节', '第三节', '第四节'][n - 1] ?? '比赛记录';
}
export function gameQuestion(game: GameCard, intent: 'preview' | 'recap' | 'plays' | 'box') {
  const fixture = `北京时间${gameDate(game)} ${teamName(game.awayAbbr, game.awayTeam)}对${teamName(game.homeAbbr, game.homeTeam)}的比赛`;
  return ({ preview: `${fixture}有哪些赛前看点？请区分已知事实和分析。`, recap: `请复盘${fixture}，先给结论，再用这场的技术统计与逐回合记录说明。`, plays: `请查看${fixture}第四节及加时最后两分钟的逐回合记录，注明双方比分顺序。`, box: `请查看${fixture}两队主要球员的得分、篮板、助攻。` })[intent];
}
export function gameDate(game: GameCard) {
  const parts = /^(\d{4})[-年](\d{1,2})[-月](\d{1,2})/.exec(game.tipoffBeijing);
  return parts ? `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}` : '';
}

const groupSchema = z.object({ group: z.string(), gp: z.number(), avgPTS: score, avgREB: score, avgAST: score });
const playerSchema = z.object({ profile: z.object({ name: z.string(), team: z.string().optional(), position: z.string().optional() }), seasonLogSummary: z.array(groupSchema) });
const playSchema = z.object({ quarter: z.string(), clock: z.string(), text: z.string(), score: z.string() });
const boxTeamSchema = z.object({ abbr: z.string(), players: z.array(z.object({ name: z.string(), pts: z.number().finite(), reb: z.number().finite(), ast: z.number().finite(), min: z.number().finite() })) });
type BoxTeam = z.infer<typeof boxTeamSchema>;
type Player = z.infer<typeof playerSchema> & { season?: number };
type Timeline = { gameId: string; plays: z.infer<typeof playSchema>[]; lastSeconds?: number; scoringOnly?: boolean; period?: number };

/** Only completed, validated tool results become display facts. Never scrape generated prose. */
export function readBasketball(parts: UIMessage['parts']) {
  const games = new Map<string, GameCard>();
  let match: GameCard | undefined;
  let box: BoxTeam[] | undefined;
  let player: Player | undefined;
  let timeline: Timeline | undefined;
  for (const part of parts) {
    if (!isToolUIPart(part) || part.state !== 'output-available') continue;
    const output = part.output;
    if (!output || typeof output !== 'object' || 'error' in output) continue;
    const name = getToolName(part);
    if (name === 'get_games_by_date' || name === 'get_series_or_games_lookup') {
      const result = z.object({ games: z.array(gameSchema) }).safeParse(output);
      if (result.success) for (const game of result.data.games) games.set(game.id, game);
    }
    if (name === 'get_game_box' && 'game' in output && output.game && typeof output.game === 'object') {
      const raw = output.game as Record<string, unknown>;
      const parsed = gameSchema.safeParse({ ...raw, id: raw.gameId });
      if (parsed.success) {
        match = parsed.data;
        games.set(match.id, match);
        const result = z.object({ box: z.array(boxTeamSchema) }).safeParse(output);
        box = result.success ? result.data.box : undefined;
      }
    }
    if (name === 'get_player_stats') {
      const parsed = playerSchema.safeParse(output);
      const input = z.object({ season: z.number().optional() }).safeParse(part.input);
      if (parsed.success && parsed.data.seasonLogSummary.length) player = { ...parsed.data, season: input.success ? input.data.season : undefined };
    }
    if (name === 'get_game_plays') {
      const parsed = z.object({ plays: z.array(playSchema) }).safeParse(output);
      const input = z.object({ game_id: z.string(), last_seconds: z.number().optional(), scoring_only: z.boolean().optional(), period: z.number().optional() }).safeParse(part.input);
      if (parsed.success && input.success) timeline = { gameId: input.data.game_id, plays: parsed.data.plays, lastSeconds: input.data.last_seconds, scoringOnly: input.data.scoring_only, period: input.data.period };
    }
  }
  // A later play query for another match must not inherit this match's teams or scoreboard.
  if (timeline && match && timeline.gameId !== match.id) box = undefined;
  return { games: [...games.values()], match, box, player, timeline };
}

export function findCurrentGame(messages: UIMessage[]): GameCard | null {
  let current: GameCard | null = null;
  const known = new Map<string, GameCard>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part) || part.state !== 'output-available') continue;
      const result = readBasketball([part]);
      for (const game of result.games) known.set(game.id, game);
      const name = getToolName(part);
      if (['get_games_by_date', 'get_series_or_games_lookup'].includes(name) && z.object({ games: z.array(gameSchema) }).safeParse(part.output).success) {
        current = result.games.length === 1 ? result.games[0] : null;
      }
      if (result.match) current = result.match;
      if (result.timeline) current = known.get(result.timeline.gameId) ?? null;
    }
  }
  return current;
}

export function timelineLabel(period?: number, lastSeconds?: number) {
  const range = lastSeconds === undefined ? '' : `末段 ${lastSeconds % 60 === 0 ? `${lastSeconds / 60} 分钟` : `${lastSeconds} 秒`}`;
  return [period ? quarterLabel(`Q${period}`) : '', range].filter(Boolean).join(' · ') || '比赛回合记录';
}
