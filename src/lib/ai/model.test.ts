import { describe, expect, it, vi } from 'vitest';

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: (opts: any) => (m: string) => ({ __provider: opts.name, __baseURL: opts.baseURL, __model: m }),
}));

import { resolveModel } from './model';

describe('resolveModel', () => {
  it('无 config → 百炼默认 qwen-plus + 站方 key', () => {
    process.env.DASHSCOPE_API_KEY = 'sk-test';
    const m: any = resolveModel(undefined);
    expect(m.__provider).toBe('dashscope');
    expect(m.__baseURL).toContain('dashscope.aliyuncs.com');
    expect(m.__model).toBe('qwen-plus');
  });
  it('BYOK config 完整时覆盖为用户服务', () => {
    const m: any = resolveModel({ baseURL: 'https://api.x.com/v1', model: 'gpt-x', apiKey: 'k' });
    expect(m.__baseURL).toBe('https://api.x.com/v1');
    expect(m.__model).toBe('gpt-x');
  });
  it('config 缺 apiKey → 忽略,回落站方', () => {
    const m: any = resolveModel({ baseURL: 'https://api.x.com/v1', model: 'gpt-x', apiKey: '' });
    expect(m.__provider).toBe('dashscope');
  });
});
