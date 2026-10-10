'use client';
import { useState } from 'react';
import { getClientConfig, setClientConfig } from '@/lib/client/config';
import type { ClientModelConfig } from '@/lib/ai/model';
import { useModal } from '@/lib/client/useModal';
import { Icon } from '../ui/Icon';

type Mode = 'site-default' | 'site-model' | 'byok';
type ByokPreset = 'bailian' | 'custom';

const BAILIAN_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const SITE_MODELS = ['qwen-flash', 'qwen-plus', 'qwen-max'];

const MODES: Array<{ value: Mode; label: string; hint: string }> = [
  { value: 'site-default', label: '站方默认', hint: '无需配置，直接开始对话' },
  { value: 'site-model', label: '选择回答模型', hint: 'qwen-flash / qwen-plus / qwen-max' },
  { value: 'byok', label: '使用自己的服务', hint: '自备 Base URL / 模型 / API Key' },
];

export function SettingsDialog({ onClose, onSave }: { onClose: () => void; onSave: (config: ClientModelConfig | null) => void }) {
  const modalRef = useModal<HTMLDivElement>(onClose);
  const saved = getClientConfig();
  // 旧版 BYOK 结构无 mode(config.ts 读时已归一为 byok,此处双保险)
  const savedMode: Mode = !saved ? 'site-default' : 'mode' in saved ? saved.mode : 'byok';
  const savedSiteModel = saved && 'mode' in saved && saved.mode === 'site-model' ? saved.model : undefined;
  const savedByok = saved && 'baseURL' in saved && 'apiKey' in saved
    ? (saved as { name?: string; baseURL: string; model: string; apiKey: string })
    : undefined;
  const [mode, setMode] = useState<Mode>(savedMode);
  const [siteModel, setSiteModel] = useState<string>(
    savedSiteModel && SITE_MODELS.includes(savedSiteModel) ? savedSiteModel : 'qwen-plus');
  const [preset, setPreset] = useState<ByokPreset>(
    savedByok?.baseURL === BAILIAN_BASE ? 'bailian' : 'custom');
  const [form, setForm] = useState(() => ({
    name: savedByok?.name ?? '',
    baseURL: savedByok?.baseURL ?? '',
    model: savedMode === 'byok' ? savedByok?.model ?? '' : '',
    apiKey: savedByok?.apiKey ?? '',
  }));
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const byokComplete = [form.baseURL, form.model, form.apiKey].every((v) => v.trim());
  const currentConfig = (): ClientModelConfig | null => {
    if (mode === 'site-default') return { mode: 'site-default' };
    if (mode === 'site-model') return { mode: 'site-model', model: siteModel };
    return byokComplete ? { mode: 'byok', ...form, name: form.name.trim() || undefined } : null;
  };

  const applyPreset = (p: ByokPreset) => {
    setPreset(p); setResult(null);
    if (p === 'bailian') setForm((f) => ({ ...f, name: 'bailian', baseURL: BAILIAN_BASE, model: 'qwen-plus' }));
  };

  const test = async () => {
    const config = currentConfig();
    if (!config) return;
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = (await res.json()) as { ok: boolean; model?: string; sample?: string; error?: string };
      setResult(data.ok
        ? { ok: true, text: `连接成功:${data.model ?? 'custom'}${data.sample ? ` · 回复「${data.sample}」` : ''}` }
        : { ok: false, text: `连接失败:${data.error ?? '未知错误'}` });
    } catch (e) {
      setResult({ ok: false, text: `请求失败:${e instanceof Error ? e.message : '网络错误'}` });
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    const config = currentConfig();
    if (!config) return;
    setClientConfig(config);
    onSave(config);
  };

  const reset = () => {
    setClientConfig(null);
    onSave(null);
  };

  return (
    <div className="nba-dialog-overlay" onClick={onClose}>
      <div ref={modalRef} className="nba-dialog" role="dialog" aria-modal="true" aria-labelledby="nba-settings-title" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <p className="nba-eyebrow">PREFERENCES</p><h2 id="nba-settings-title">让回答更适合你</h2><p className="nba-dialog-intro">选择模型服务，新设置将用于后续提问。</p>
        <fieldset className="nba-mode-fieldset">
          <legend>模型档位</legend>
          {MODES.map((m) => (
            <label key={m.value} className={`nba-mode-option${mode === m.value ? ' selected' : ''}`}>
              <input
                type="radio"
                name="nba-mode"
                checked={mode === m.value}
                onChange={() => { setMode(m.value); setResult(null); }}
              />
              <span>
                <span className="nba-mode-label">{m.label}</span>
                <span className="nba-mode-desc">{m.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {mode === 'site-model' && (
          <label>
            站方模型
            <select value={siteModel} onChange={(e) => setSiteModel(e.target.value)}>
              {SITE_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        )}
        {mode === 'byok' && (
          <>
            <label>
              预设
              <select value={preset} onChange={(e) => applyPreset(e.target.value as ByokPreset)}>
                <option value="bailian">阿里云百炼(qwen)</option>
                <option value="custom">自定义 OpenAI 兼容</option>
              </select>
            </label>
            <label>
              Base URL
              <input value={form.baseURL} onChange={(e) => setForm({ ...form, baseURL: e.target.value })} placeholder="https://..." />
            </label>
            <label>
              模型
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="qwen-plus" />
            </label>
            <label>
              API Key
              <input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." />
            </label>
          </>
        )}
        <div className="nba-dialog-actions">
          <button type="button" className="nba-btn" onClick={test} disabled={testing || !currentConfig()}>{testing ? '测试中…' : '测试连接'}</button>
          <button type="button" className="nba-btn-primary" onClick={save} disabled={!currentConfig()}>保存并生效</button>
          <button type="button" className="nba-btn nba-btn-ghost" onClick={reset}>恢复站方默认</button>
        </div>
        {result && <p role="status" className={`nba-test-result${result.ok ? ' ok' : ' fail'}`}>{result.text}</p>}
        <button type="button" className="nba-dialog-close nba-icon-btn" onClick={onClose} aria-label="关闭设置"><Icon name="close" /></button>
      </div>
    </div>
  );
}
