import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import type { UIMessage } from 'ai';
import { nbaTools } from '@/lib/ai/tools';
import { buildSystemPrompt } from '@/lib/ai/prompt';
import { resolveModel, type ClientModelConfig } from '@/lib/ai/model';
import { allowRequest } from '@/lib/rl';

export const maxDuration = 60;

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (!allowRequest(ip)) {
    return Response.json({ error: '请求过于频繁,请稍后再试。' }, { status: 429 });
  }
  let body: { messages: UIMessage[]; config?: ClientModelConfig };
  try { body = await req.json(); } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 });
  }
  let model;
  try { model = resolveModel(body.config); } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '模型配置错误' }, { status: 503 });
  }
  try {
    const result = streamText({
      model,
      system: buildSystemPrompt(Date.now()),
      messages: await convertToModelMessages(body.messages),
      tools: nbaTools,
      stopWhen: stepCountIs(16),
      onFinish: ({ usage }) => {
        console.log(JSON.stringify({ t: Date.now(), byok: !!body.config?.apiKey, usage }));
      },
    });
    return result.toUIMessageStreamResponse({
      onError: (e) => (e instanceof Error ? e.message : '服务异常'),
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '服务异常' }, { status: 500 });
  }
}
