import { describe, expect, it } from 'vitest';
import { createEmojiStripSseStream, stripEmoji } from './emoji';

const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

async function runStream(text: string, splitAt: number[]): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  // 按 splitAt 切字节,模拟网络分片:同时考验 UTF-8 多字节与 SSE 行的跨界
  const cuts = [0, ...splitAt.filter((i) => i > 0 && i < bytes.length), bytes.length];
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 1; i < cuts.length; i++) c.enqueue(bytes.slice(cuts[i - 1], cuts[i]));
      c.close();
    },
  });
  const out = await stream.pipeThrough(createEmojiStripSseStream());
  return new TextDecoder().decode(
    await new Response(out).arrayBuffer(),
  );
}

const deltasOf = (out: string): string[] =>
  [...out.matchAll(/^data: (.+)$/gm)]
    .map((m) => m[1])
    .filter((l) => l !== '[DONE]')
    .map((l) => JSON.parse(l))
    .filter((p) => p.type === 'text-delta')
    .map((p) => p.delta);

describe('stripEmoji', () => {
  it('剥离 emoji 与变体选择符,保留 CJK/ascii/普通符号', () => {
    expect(stripEmoji('好球🏀!三分✌️进了⭐。')).toBe('好球!三分进了。');
    expect(stripEmoji('plain text 123,中文标点。')).toBe('plain text 123,中文标点。');
  });
});

describe('createEmojiStripSseStream', () => {
  it('跨块拆开的代理对:emoji 恰好剥一次,无残留代理对/乱码', async () => {
    const head = '\uD83D'; // 😀 的高位半,悬在上一块末尾
    const tail = '\uDE00';
    const input =
      sse({ type: 'text-start', id: 't' }) +
      sse({ type: 'text-delta', id: 't', delta: `好球${head}` }) +
      sse({ type: 'text-delta', id: 't', delta: `${tail}漂亮` }) +
      sse({ type: 'text-end', id: 't' }) +
      'data: [DONE]\n\n';
    const out = await runStream(input, [30, 55, 80, 130]);
    expect(deltasOf(out).join('')).toBe('好球漂亮');
    // 帧保持:仍是一行一个 data:,且 [DONE] 原样在尾部
    expect(out.endsWith('data: [DONE]\n\n')).toBe(true);
    expect(out.match(/^data: /gm)?.length).toBe(5);
  });

  it('单块内完整 emoji 与 FE0F 变体一并剥除', async () => {
    const input = sse({ type: 'text-delta', id: 't', delta: '投篮🏀✌️!' }) + 'data: [DONE]\n\n';
    const out = await runStream(input, [40]);
    expect(deltasOf(out).join('')).toBe('投篮!');
  });

  it('纯 CJK/ascii 与非 text-delta chunk 逐字节透传', async () => {
    const untouched = sse({ type: 'text-delta', id: 't', delta: '约基奇 27+13+11,ascii ok。' });
    const meta = sse({ type: 'finish', finishReason: 'stop' });
    const input = untouched + meta + 'data: [DONE]\n\n';
    const out = await runStream(input, [25, 60, 90]);
    expect(out).toBe(input);
  });

  it('流结束时仍悬空的孤立高位代理对被丢弃', async () => {
    const input = sse({ type: 'text-delta', id: 't', delta: '结束\uD83D' }) + 'data: [DONE]\n\n';
    const out = await runStream(input, [50]);
    const joined = deltasOf(out).join('');
    expect(joined).toBe('结束');
    expect(joined).not.toMatch(/[\uD800-\uDFFF]/);
  });
});
