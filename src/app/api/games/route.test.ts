import { beforeEach, describe, expect, it, vi } from 'vitest';
const getGames = vi.hoisted(() => vi.fn());
vi.mock('@/lib/espn/scoreboard', () => ({ getGamesByBeijingDate: getGames }));
import { GET } from './route';

describe('homepage schedule endpoint', () => {
  beforeEach(() => { getGames.mockReset(); });
  it.each(['2025-02-30', '2025-13-01', 'yesterday', '2025-6-23', '2025-00-01'])('rejects invalid date %s without fetching', async (date) => {
    expect((await GET(new Request(`http://localhost/api/games?date=${date}`))).status).toBe(400);
    expect(getGames).not.toHaveBeenCalled();
  });
  it('distinguishes an empty day from a failed lookup', async () => {
    getGames.mockResolvedValue([]);
    const empty = await GET(new Request('http://localhost/api/games?date=2025-06-23'));
    expect(empty.status).toBe(200);
    expect((await empty.json()).games).toEqual([]);
    getGames.mockRejectedValue(new Error('internal supplier detail'));
    const failed = await GET(new Request('http://localhost/api/games?date=2025-06-24'));
    expect(failed.status).toBe(503);
    expect(JSON.stringify(await failed.json())).not.toContain('supplier');
  });
});
