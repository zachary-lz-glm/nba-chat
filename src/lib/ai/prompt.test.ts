import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from './prompt';

describe('buildSystemPrompt', () => {
  const p = buildSystemPrompt(Date.UTC(2026, 9, 9, 7, 0)); // 北京 2026-10-09 15:00
  it('动态注入当前时间与赛季', () => {
    expect(p).toContain('2026年10月9日');
    expect(p).toContain('2026-27');
  });
  it('包含事实纪律与合规红线关键词', () => {
    for (const kw of ['严禁凭记忆', '暂无数据', '先自行查证', '博彩', '阴谋', '隐私', '不检索']) expect(p).toContain(kw);
  });
  it('包含身份与表达规范', () => {
    for (const kw of ['NBA', '您', '中立', '加粗']) expect(p).toContain(kw);
  });
});
