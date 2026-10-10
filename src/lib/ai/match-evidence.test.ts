import { describe, expect, it } from 'vitest';
import { nextMatchEvidenceTool } from './match-evidence';
const schedule = { toolName: 'get_games_by_date', output: { games: [{ id: '401766128' }] } };
describe('single-game evidence before an answer', () => {
  it('requires a box score rather than answering player numbers from only a scoreboard', () => {
    expect(nextMatchEvidenceTool('请查这场比赛两队主要球员得分、篮板、助攻', [schedule])).toBe('get_game_box');
  });
  it('requires both statistics and play records for a recap', () => {
    expect(nextMatchEvidenceTool('请复盘这场比赛', [schedule])).toBe('get_game_box');
    expect(nextMatchEvidenceTool('请复盘这场比赛', [schedule, { toolName: 'get_game_box', output: {} }])).toBe('get_game_plays');
    expect(nextMatchEvidenceTool('请复盘这场比赛', [schedule, { toolName: 'get_game_box', output: {} }, { toolName: 'get_game_plays', output: {} }])).toBeUndefined();
  });
  it('requires the play tool for an explicit late-game query', () => {
    expect(nextMatchEvidenceTool('查看这场比赛最后两分钟逐回合', [schedule])).toBe('get_game_plays');
  });
  it('does not loop after failed statistics lookup or invent a game when none was found', () => {
    expect(nextMatchEvidenceTool('本场球员数据', [schedule, { toolName: 'get_game_box', output: { error: 'unavailable' } }])).toBeUndefined();
    expect(nextMatchEvidenceTool('本场球员数据', [{ toolName: 'get_games_by_date', output: { games: [] } }])).toBeUndefined();
  });
  it('does not force these tools for player season averages, basic scores or refused topics', () => {
    for (const text of ['约基奇本赛季场均数据', '比赛比分多少', '这场比赛的赌球盘口']) expect(nextMatchEvidenceTool(text, [schedule])).toBeUndefined();
  });
});
