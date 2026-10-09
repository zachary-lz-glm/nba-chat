import { fetchJson } from './client';

export async function getNews(limit = 10, fetchImpl?: <T>(u: string) => Promise<T>) {
  const f = fetchImpl ?? (<T>(u: string) => fetchJson<T>(u));
  const d = await f<any>(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=${limit}`);
  return (d.articles ?? []).map((a: any) => ({
    headline: a.headline ?? '',
    published: a.published ?? '',
    description: a.description ?? '',
  }));
}
