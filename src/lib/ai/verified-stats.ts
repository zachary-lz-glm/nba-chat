import { z } from 'zod';
import type { UIMessageChunk } from 'ai';

const stats = z.object({ box: z.array(z.object({
  abbr: z.string().min(1),
  players: z.array(z.object({ name: z.string().min(1), pts: z.number().finite().nonnegative(), reb: z.number().finite().nonnegative(), ast: z.number().finite().nonnegative() })).min(1),
})).min(1) });

export function isStatsOnlyQuestion(text: string) {
  return /比赛|本场|这场|单场|两队/.test(text)
    && /技术统计|球员数据|主要球员|球员.*(?:得分|篮板|助攻)/.test(text)
    && !/复盘|为什么|分析|关键|比较|原因|影响|伤病|冠军/.test(text);
}
export function verifiedStatsText(output: unknown): string | undefined {
  if (output && typeof output === 'object' && 'error' in output) return;
  const parsed = stats.safeParse(output);
  if (!parsed.success) return;
  const clean = (text: string) => text.replace(/[|\r\n]/g, ' ');
  return '以下为本场查询到的主要球员技术统计（每队最多 9 人），以本次查询结果为准。\n\n' + parsed.data.box.map((team) =>
    `### ${clean(team.abbr)}\n\n| 球员 | 得分 | 篮板 | 助攻 |\n| --- | ---: | ---: | ---: |\n` + team.players.map((player) => `| ${clean(player.name)} | ${player.pts} | ${player.reb} | ${player.ast} |`).join('\n')).join('\n\n');
}

/** Keep tool progress streaming; render narrow statistics answers directly from validated evidence. */
export function createVerifiedStatsStream() {
  const names = new Map<string, string>();
  let answer: string | undefined;
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if (chunk.type === 'tool-input-available') names.set(chunk.toolCallId, chunk.toolName);
      if (chunk.type === 'tool-output-available' && names.get(chunk.toolCallId) === 'get_game_box') answer = verifiedStatsText(chunk.output);
      if (chunk.type === 'text-start' || chunk.type === 'text-delta' || chunk.type === 'text-end') return;
      if (chunk.type === 'finish') {
        const id = 'verified-statistics';
        controller.enqueue({ type: 'text-start', id });
        controller.enqueue({ type: 'text-delta', id, delta: answer ?? '暂未取得本场完整技术统计，请稍后重试。' });
        controller.enqueue({ type: 'text-end', id });
      }
      controller.enqueue(chunk);
    },
  });
}
