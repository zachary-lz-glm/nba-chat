import { z } from 'zod';
import { needsLookup } from './lookup-policy';

type Result = { toolName: string; output: unknown };
type EvidenceTool = 'get_game_box' | 'get_game_plays';
const games = z.object({ games: z.array(z.object({ id: z.string().min(1) })).min(1) });
const box = z.object({ game: z.object({ gameId: z.string().min(1) }) });

/** A scoreboard is insufficient evidence for a requested single-game box score or play log. */
export function nextMatchEvidenceTool(text: string, results: Result[]): EvidenceTool | undefined {
  if (!needsLookup(text) || !/比赛|本场|这场|单场|两队|复盘/.test(text)) return;
  const knownGame = results.some((result) =>
    ['get_games_by_date', 'get_series_or_games_lookup'].includes(result.toolName) && games.safeParse(result.output).success
    || result.toolName === 'get_game_box' && box.safeParse(result.output).success);
  if (!knownGame) return;
  const required: EvidenceTool[] = [];
  if (/复盘|关键转折|为什么.*赢|技术统计|球员数据|主要球员|球员.*(?:得分|篮板|助攻)/.test(text)) required.push('get_game_box');
  if (/复盘|关键转折|为什么.*赢|逐回合|关键回合|最后两分钟|最后一攻/.test(text)) required.push('get_game_plays');
  // An attempted failed lookup also counts: let the model explain missing data instead of retrying forever.
  return required.find((name) => !results.some((result) => result.toolName === name));
}
