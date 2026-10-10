import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { findCurrentGame, gameQuestion, quarterLabel, readBasketball, timelineLabel } from './basketball';

const game = { id: '401766128', homeAbbr: 'OKC', awayAbbr: 'IND', homeTeam: 'Oklahoma City Thunder', awayTeam: 'Indiana Pacers', homeScore: 103, awayScore: 91, tipoffBeijing: '2025-06-23 08:00', status: 'Final', seasonLabel: '2024-25 季后赛', note: null };
function output(name: string, data: unknown, input: unknown = {}): UIMessage['parts'][number] {
  return { type: 'dynamic-tool', toolName: name, toolCallId: name, state: 'output-available', input, output: data };
}
const message = (parts: UIMessage['parts']): UIMessage => ({ id: 'm', role: 'assistant', parts });

describe('basketball facts shown in the interface', () => {
  it('does not render invented prose, tool failures or malformed scores', () => {
    expect(readBasketball([{ type: 'text', text: '雷霆 103-91 步行者' }]).games).toEqual([]);
    expect(readBasketball([output('get_games_by_date', { error: 'unavailable' })]).games).toEqual([]);
    expect(readBasketball([output('get_games_by_date', { games: [{ ...game, homeScore: '103x' }] })]).games).toEqual([]);
  });
  it('uses the most recent structured result for a repeated game', () => {
    const data = readBasketball([output('get_games_by_date', { games: [game] }), output('get_games_by_date', { games: [{ ...game, homeScore: 105 }] })]);
    expect(data.games).toHaveLength(1);
    expect(data.games[0].homeScore).toBe(105);
  });
  it('keeps a multi-game schedule ambiguous until a single match is queried', () => {
    expect(findCurrentGame([message([output('get_games_by_date', { games: [game, { ...game, id: '2' }] })])])).toBeNull();
    expect(findCurrentGame([message([output('get_games_by_date', { games: [game] })])])?.id).toBe(game.id);
    expect(findCurrentGame([])).toBeNull();
  });
  it('resets context when a newer schedule has multiple games', () => {
    expect(findCurrentGame([message([output('get_games_by_date', { games: [game] })]), message([output('get_games_by_date', { games: [game, { ...game, id: '2' }] })])])).toBeNull();
  });
  it('links plays to their queried game and preserves score order', () => {
    const data = readBasketball([output('get_game_plays', { plays: [{ quarter: 'Q5', clock: '0:05', text: 'Made layup', score: '103-91' }] }, { game_id: game.id, last_seconds: 120 })]);
    expect(data.timeline?.gameId).toBe(game.id);
    expect(data.timeline?.plays[0].score).toBe('103-91');
    expect(quarterLabel('Q5')).toBe('加时 1');
    expect(quarterLabel('Q4')).toBe('第四节');
  });
  it('does not carry the previous match into a play query for a different match', () => {
    const before = message([output('get_games_by_date', { games: [game] })]);
    const after = message([output('get_game_plays', { plays: [] }, { game_id: 'another-match' })]);
    expect(findCurrentGame([before, after])).toBeNull();
  });
  it('restores a known match from an earlier multi-game schedule', () => {
    const before = message([output('get_games_by_date', { games: [game, { ...game, id: '2' }] })]);
    const after = message([output('get_game_plays', { plays: [] }, { game_id: game.id })]);
    expect(findCurrentGame([before, after])?.id).toBe(game.id);
  });
  it('uses tool chronology within a single answer to clear newer ambiguity', () => {
    expect(findCurrentGame([message([
      output('get_game_box', { game: { ...game, gameId: game.id }, box: [] }),
      output('get_games_by_date', { games: [game, { ...game, id: '2' }] }),
    ])])).toBeNull();
  });
  it('keeps exact timeline duration and selected period', () => {
    expect(timelineLabel(4, 90)).toBe('第四节 · 末段 90 秒');
    expect(timelineLabel(undefined, 120)).toBe('末段 2 分钟');
    expect(timelineLabel(5)).toBe('加时 1');
  });
  it('qualifies generated questions by actual teams and Beijing date', () => {
    const question = gameQuestion(game, 'plays');
    expect(question).toContain('2025-06-23');
    expect(question).toContain('雷霆');
    expect(question).toContain('步行者');
    expect(question).toContain('最后两分钟');
    expect(question).not.toContain(game.id);
  });
  it('preserves full double-digit month and day in the actual Chinese date format', () => {
    expect(gameQuestion({ ...game, tipoffBeijing: '2026年10月10日 08:00' }, 'box')).toContain('2026-10-10');
  });
  it('does not treat career averages as a single season', () => {
    const data = readBasketball([output('get_player_stats', { profile: { name: 'Player' }, career: { regular: { PTS: '31.9' } }, seasonLogSummary: null }, { player_id: 1 })]);
    expect(data.player).toBeUndefined();
  });
});
