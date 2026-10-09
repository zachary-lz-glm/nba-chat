'use client';
import { useState } from 'react';
import { getClientConfig, setClientConfig } from '@/lib/client/config';

type Preset = 'bailian' | 'custom';

const BAILIAN_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState<Preset>(() =>
    getClientConfig()?.baseURL === BAILIAN_BASE ? 'bailian' : 'custom');
  const [form, setForm] = useState(() => {
    const s = getClientConfig();
    return { name: s?.name ?? '', baseURL: s?.baseURL ?? '', model: s?.model ?? '', apiKey: s?.apiKey ?? '' };
  });
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const canSave = [form.baseURL, form.model, form.apiKey].every((v) => v.trim());

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'bailian') setForm((f) => ({ ...f, name: 'bailian', baseURL: BAILIAN_BASE, model: 'qwen-plus' }));
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...form, name: form.name.trim() || undefined } }),
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
    if (!canSave) return;
    setClientConfig({ ...form, name: form.name.trim() || undefined });
    location.reload(); // 重建 transport 使新 config 生效
  };

  const reset = () => {
    setClientConfig(null);
    location.reload();
  };

  return (
    <div className="nba-dialog-overlay" onClick={onClose}>
      <div className="nba-dialog" role="dialog" aria-label="模型设置" onClick={(e) => e.stopPropagation()}>
        <h2>模型设置(BYOK)</h2>
        <label>
          预设
          <select value={preset} onChange={(e) => applyPreset(e.target.value as Preset)}>
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
        <div className="nba-dialog-actions">
          <button type="button" className="nba-btn" onClick={test} disabled={testing || !canSave}>{testing ? '测试中…' : '测试连接'}</button>
          <button type="button" className="nba-btn primary" onClick={save} disabled={!canSave}>保存并生效</button>
          <button type="button" className="nba-btn ghost" onClick={reset}>恢复站方模型</button>
        </div>
        {result && <p className={`nba-test-result${result.ok ? ' ok' : ' fail'}`}>{result.text}</p>}
        <button type="button" className="nba-dialog-close" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
