import { describe, expect, it } from 'vitest';
import { needsLookup } from './lookup-policy';

describe('factual query evidence gate', () => {
  it('requires a lookup for schedules, stats and results', () => {
    for (const question of ['今天有什么 NBA 比赛？', '查约基奇本赛季场均数据', '2025 年总冠军是谁', '湖人和勇士比分是多少']) expect(needsLookup(question)).toBe(true);
  });
  it('allows general conversation and basketball concepts without forcing a lookup', () => {
    for (const question of ['你好', '挡拆怎么打', '你能帮我做什么']) expect(needsLookup(question)).toBe(false);
  });
  it('does not force searches on refused topics', () => {
    expect(needsLookup('这场比赛的赌球盘口')).toBe(false);
    expect(needsLookup('冠军球员的隐私绯闻')).toBe(false);
  });
});
