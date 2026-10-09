const TZ_BJ = 'Asia/Shanghai';
const TZ_ET = 'America/New_York';

export function ymdIn(tz: string, ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

export const beijingYMD = (ms: number) => ymdIn(TZ_BJ, ms);
export const etYMD = (ms: number) => ymdIn(TZ_ET, ms);

/** 北京某日 00:00 与 24:00 各自落在的美东日期去重(恒为 D-1 与 D 两天,夏冬令时均成立) */
export function etDatesForBeijingDay(beijingDate: string): string[] {
  const [y, m, d] = beijingDate.split('-').map(Number);
  const startUtc = Date.UTC(y, m - 1, d) - 8 * 3600_000;   // 北京 00:00 = UTC 前一日 16:00
  const endUtc = startUtc + 24 * 3600_000 - 1;
  return [...new Set([etYMD(startUtc), etYMD(endUtc)])].map((s) => s.replaceAll('-', ''));
}

export const isBeijingDay = (utcMs: number, beijingDate: string) => beijingYMD(utcMs) === beijingDate;

export function fmtBeijing(ms: number): string {
  const dt = new Intl.DateTimeFormat('zh-CN', { timeZone: TZ_BJ, year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  return dt.format(new Date(ms)).replace(',', ''); // Intl 输出形如 "2025年6月23日 08:00"
}

export function currentSeason(nowMs: number): { label: string; phase: 'regular' | 'playoffs' | 'offseason' } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ_BJ, year: 'numeric', month: 'numeric' }).formatToParts(new Date(nowMs));
  const y = Number(parts.find((p) => p.type === 'year')!.value);
  const m = Number(parts.find((p) => p.type === 'month')!.value); // 北京时区月份,与赛季口径一致
  const short = (n: number) => String(n % 100).padStart(2, '0');
  if (m >= 10) return { label: `${y}-${short(y + 1)}`, phase: 'regular' };
  if (m >= 7) return { label: `${y - 1}-${short(y)}`, phase: 'offseason' };
  if (m >= 4) return { label: `${y - 1}-${short(y)}`, phase: 'playoffs' };
  return { label: `${y - 1}-${short(y)}`, phase: 'regular' };
}
