import { getGamesByBeijingDate } from '@/lib/espn/scoreboard';

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date') ?? '';
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || Number(date.slice(0, 4)) < 1946 || Number(date.slice(0, 4)) > 2100) {
    return Response.json({ error: '请选择有效的日期。' }, { status: 400 });
  }
  try {
    const games = await getGamesByBeijingDate(date);
    return Response.json({ date, games, fetchedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=30' } });
  } catch {
    return Response.json({ error: '暂时无法取得赛程，请稍后重试。' }, { status: 503 });
  }
}
