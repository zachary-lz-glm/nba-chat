import { generateText } from 'ai';
import { resolveModel, type ClientModelConfig } from '@/lib/ai/model';
import { allowRequest } from '@/lib/rl';

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (!allowRequest(ip)) {
    return Response.json({ error: '请求过于频繁,请稍后再试。' }, { status: 429 });
  }
  try {
    const { config } = (await req.json()) as { config?: ClientModelConfig };
    const model = resolveModel(config);
    const { text } = await generateText({ model, prompt: '回复"ok"两个字母即可,不要任何其他内容。' });
    return Response.json({ ok: true, model: `${(model as any).modelId ?? 'custom'}`, sample: text.slice(0, 20) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : '连接失败' }, { status: 200 });
  }
}
