import { describe, expect, it, beforeEach } from 'vitest';
import { allowRequest, __resetRlForTest } from './rl';

describe('rl', () => {
  beforeEach(() => __resetRlForTest());
  it('12 次/分钟内放行,第 13 次拒绝,窗口滑动后恢复', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 12; i++) expect(allowRequest('1.2.3.4', t0 + i * 100)).toBe(true);
    expect(allowRequest('1.2.3.4', t0 + 1_000)).toBe(false);
    expect(allowRequest('1.2.3.4', t0 + 61_000)).toBe(true);
    expect(allowRequest('5.6.7.8', t0 + 1_000)).toBe(true); // 其他 IP 不受影响
  });
});
