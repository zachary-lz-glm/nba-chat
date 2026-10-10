// emoji 剥离:回答文案禁 emoji(表达规范),在 SSE 流出站方向做最小侵入改写。
// ai v7 toUIMessageStreamResponse 无 transform 选项,故在响应体上包一层 SSE 解析流(route.ts)。

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;

/** 剥离 emoji(含变体选择符 U+FE0F),其余文本原样保留 */
export function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, '');
}

const isHighSurrogate = (ch: string) => {
  const c = ch.charCodeAt(0);
  return c >= 0xd800 && c <= 0xdbff;
};

/**
 * 清洗单个 text-delta:先并上一块遗留的尾部高位代理对(emoji 常被流式输出切成两半),
 * 再剥 emoji;若清洗结果仍以未配对高位代理对结尾,则扣下带入下一块,避免半截代理对出站成乱码。
 * 流结束时仍悬空的代理对在 flush 丢弃(孤立代理对本就是非法 UTF-16)。
 */
function cleanDelta(delta: string, carry: { cur: string }): string {
  const merged = carry.cur + delta;
  carry.cur = '';
  const cleaned = stripEmoji(merged);
  if (cleaned.length && isHighSurrogate(cleaned.charAt(cleaned.length - 1))) {
    carry.cur = cleaned.slice(-1);
    return cleaned.slice(0, -1);
  }
  return cleaned;
}

/**
 * SSE 改写流:逐行解析 `data: <json>`,仅改写 {type:'text-delta'} 的 delta 字段,
 * 其余 chunk(含 `data: [DONE]`、keep-alive 注释行、空行)原样透传,帧格式逐字节保持。
 */
export function createEmojiStripSseStream(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const carry = { cur: '' };
  let buf = '';

  const processLine = (line: string): string => {
    if (!line.startsWith('data:')) return line; // 空行/注释行,保持 SSE 帧
    const payload = line.slice(5);
    const body = payload.startsWith(' ') ? payload.slice(1) : payload;
    if (body === '[DONE]') return line;
    let part: unknown;
    try { part = JSON.parse(body); } catch { return line; }
    if (part instanceof Object && (part as { type?: unknown }).type === 'text-delta') {
      const p = part as { delta?: unknown };
      if (typeof p.delta === 'string') {
        const cleaned = cleanDelta(p.delta, carry);
        if (cleaned !== p.delta) {
          p.delta = cleaned;
          return `data: ${JSON.stringify(p)}`;
        }
      }
    }
    return line;
  };

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buf += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        controller.enqueue(encoder.encode(`${processLine(line)}\n`));
      }
    },
    flush(controller) {
      buf += decoder.decode();
      if (buf) controller.enqueue(encoder.encode(`${processLine(buf)}\n`));
      // carry 悬空代理对就此丢弃:无下一块可配对,出站只会是乱码
    },
  });
}
