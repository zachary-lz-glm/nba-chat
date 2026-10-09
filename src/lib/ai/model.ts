import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

export type ClientModelConfig = { name?: string; baseURL: string; model: string; apiKey: string };

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export function resolveModel(config?: ClientModelConfig): LanguageModel {
  if (config?.apiKey && config.baseURL && config.model) {
    const p = createOpenAICompatible({ name: config.name || 'byok', baseURL: config.baseURL, apiKey: config.apiKey });
    return p(config.model);
  }
  if (!process.env.DASHSCOPE_API_KEY) throw new Error('站点未配置模型服务,请在设置中填写您自己的 API Key');
  const p = createOpenAICompatible({ name: 'dashscope', baseURL: DASHSCOPE_BASE, apiKey: process.env.DASHSCOPE_API_KEY });
  return p(process.env.NBA_MODEL || 'qwen-plus');
}
