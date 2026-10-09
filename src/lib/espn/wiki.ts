import { fetchJson } from './client';

/** 中文维基摘要;不存在或出错返回 null(调用方按「暂无数据」处理) */
export async function getWikiSummary(title: string): Promise<{ title: string; extract: string } | null> {
  try {
    const d = await fetchJson<any>(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!d?.extract) return null;
    return { title: d.titles?.normalized ?? title, extract: d.extract };
  } catch {
    return null;
  }
}
