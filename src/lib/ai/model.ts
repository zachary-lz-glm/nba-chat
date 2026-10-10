import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

/**
 * 三档模型配置:
 * - site-default:站方默认线路(qwen-plus)
 * - site-model:站方线路自选模型(model 须匹配 /^qwen-[a-z0-9.-]+$/,否则忽略回落站方默认)
 * - byok:自定义 OpenAI 兼容服务(旧版无 mode 的 {baseURL, model, apiKey} 结构按 byok 处理)
 */
export type ClientModelConfig =
  | { mode: 'site-default' }
  | { mode: 'site-model'; model: string }
  | { mode: 'byok'; name?: string; baseURL: string; model: string; apiKey: string }
  | { name?: string; baseURL: string; model: string; apiKey: string };

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const SITE_MODEL_RE = /^qwen-[a-z0-9.-]+$/;

const dashscope = (model: string): LanguageModel => {
  if (!process.env.DASHSCOPE_API_KEY) throw new Error('站点未配置模型服务,请在设置中填写您自己的 API Key');
  const p = createOpenAICompatible({ name: 'dashscope', baseURL: DASHSCOPE_BASE, apiKey: process.env.DASHSCOPE_API_KEY });
  return p(model);
};

export function resolveModel(config?: ClientModelConfig): LanguageModel {
  const c = config as Record<string, string | undefined> | undefined;
  // BYOK:显式 mode='byok' 或旧版无 mode 结构,三字段齐全才生效,否则回落站方
  if (c?.apiKey && c.baseURL && c.model) {
    const p = createOpenAICompatible({ name: c.name || 'byok', baseURL: c.baseURL, apiKey: c.apiKey });
    return p(c.model);
  }
  // 站方线路自选模型:仅放行 qwen-* 白名单,不匹配回落站方默认
  if (c?.mode === 'site-model' && c.model && SITE_MODEL_RE.test(c.model)) {
    return dashscope(c.model);
  }
  // 站方默认 / site-model 不命中 / 无 config
  return dashscope(process.env.NBA_MODEL || 'qwen-plus');
}
