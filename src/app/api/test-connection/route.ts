import { generateText } from 'ai';
import { resolveModel, type ClientModelConfig } from '@/lib/ai/model';

export async function POST(req: Request) {
  try {
    const { config } = (await req.json()) as { config?: ClientModelConfig };
    const model = resolveModel(config);
    const { text } = await generateText({ model, prompt: '回复"ok"两个字母即可,不要任何其他内容。' });
    return Response.json({ ok: true, model: `${(model as any).modelId ?? 'custom'}`, sample: text.slice(0, 20) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : '连接失败' }, { status: 200 });
  }
}
