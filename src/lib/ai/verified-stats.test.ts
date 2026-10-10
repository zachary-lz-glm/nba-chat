import { describe, expect, it } from 'vitest';
import type { UIMessageChunk } from 'ai';
import { createVerifiedStatsStream, isStatsOnlyQuestion, verifiedStatsText } from './verified-stats';
const output = { box: [{ abbr: 'OKC', players: [{ name: 'Shai Gilgeous-Alexander', pts: 29, reb: 5, ast: 12 }] }] };
describe('verified single-game statistics answers', () => {
  it('only formats finite queried statistics and rejects failures or empty data', () => {
    expect(verifiedStatsText(output)).toContain('| Shai Gilgeous-Alexander | 29 | 5 | 12 |');
    expect(verifiedStatsText({ error: 'unavailable', ...output })).toBeUndefined();
    expect(verifiedStatsText({ box: [] })).toBeUndefined();
    expect(verifiedStatsText({ box: [{ abbr: 'OKC', players: [{ name: 'Player', pts: NaN, reb: 0, ast: 0 }] }] })).toBeUndefined();
  });
  it('keeps analysis and season questions on the model path', () => {
    expect(isStatsOnlyQuestion('这场比赛两队主要球员得分、篮板、助攻')).toBe(true);
    for (const text of ['请复盘这场比赛球员数据', '分析球员数据如何影响比赛', '约基奇赛季场均得分']) expect(isStatsOnlyQuestion(text)).toBe(false);
  });
  it('streams actual evidence but replaces unrequested model claims with a verified table', async () => {
    const chunks: UIMessageChunk[] = [
      { type: 'tool-input-available', toolCallId: 'box', toolName: 'get_game_box', input: { game_id: '1' } },
      { type: 'tool-output-available', toolCallId: 'box', output },
      { type: 'text-start', id: 'model' }, { type: 'text-delta', id: 'model', delta: '未经查询的伤病和统计' }, { type: 'text-end', id: 'model' }, { type: 'finish' },
    ];
    const stream = new ReadableStream<UIMessageChunk>({ start(controller) { chunks.forEach((chunk) => controller.enqueue(chunk)); controller.close(); } }).pipeThrough(createVerifiedStatsStream());
    const received: UIMessageChunk[] = [];
    const reader = stream.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received.push(value);
    }
    expect(received.some((chunk) => chunk.type === 'tool-output-available')).toBe(true);
    expect(received.filter((chunk) => chunk.type === 'text-delta').map((chunk) => chunk.delta).join('')).toContain('29 | 5 | 12');
    expect(JSON.stringify(received)).not.toContain('未经查询');
    expect(received.at(-1)?.type).toBe('finish');
  });
});
