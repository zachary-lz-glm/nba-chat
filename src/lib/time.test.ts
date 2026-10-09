import { describe, expect, it } from 'vitest';
import {
  beijingYMD, etYMD, etDatesForBeijingDay, isBeijingDay,
  fmtBeijing, currentSeason,
} from './time';

describe('time', () => {
  // 2025总决赛G7: UTC 2025-06-23T00:00Z = 北京 06-23 08:00 = 美东 06-22 20:00
  const g7 = Date.UTC(2025, 5, 23, 0, 0);

  it('北京/美东日历日换算', () => {
    expect(beijingYMD(g7)).toBe('2025-06-23');
    expect(etYMD(g7)).toBe('2025-06-22');
  });

  it('北京日期覆盖的美东日期 = [前一天, 当天]', () => {
    expect(etDatesForBeijingDay('2025-06-23')).toEqual(['20250622', '20250623']);
    expect(etDatesForBeijingDay('2026-10-09')).toEqual(['20261008', '20261009']);
  });

  it('UTC 时间戳按北京日精确过滤', () => {
    expect(isBeijingDay(g7, '2025-06-23')).toBe(true);
    expect(isBeijingDay(g7, '2025-06-22')).toBe(false); // 美东同日但北京已次日
  });

  it('北京时间格式化', () => {
    expect(fmtBeijing(g7)).toBe('2025年6月23日 08:00');
  });

  it('赛季标签:10月开新赛季跨年', () => {
    expect(currentSeason(Date.UTC(2026, 9, 9)).label).toBe('2026-27');
    expect(currentSeason(Date.UTC(2026, 0, 15)).label).toBe('2025-26');
    expect(currentSeason(Date.UTC(2025, 7, 1)).label).toBe('2024-25'); // 休赛期指刚结束赛季
  });

  it('赛季阶段', () => {
    expect(currentSeason(Date.UTC(2026, 9, 9)).phase).toBe('regular');   // 10月新赛季
    expect(currentSeason(Date.UTC(2026, 4, 20)).phase).toBe('playoffs');  // 5月
    expect(currentSeason(Date.UTC(2026, 7, 1)).phase).toBe('offseason');  // 8月
  });
});
