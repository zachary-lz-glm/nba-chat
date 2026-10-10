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

// 维基(繁体/异体)队名 → 简体规范名(含缩写);未收录的名字原样输出
const TEAM_NAME_MAP: Record<string, string> = {
  侯斯頓火箭: '休斯顿火箭(HOU)', 休士頓火箭: '休斯顿火箭(HOU)',
  芝加哥公牛: '芝加哥公牛(CHI)',
  聖安東尼奧馬刺: '圣安东尼奥马刺(SAS)',
  洛杉磯湖人: '洛杉矶湖人(LAL)',
  底特律活塞: '底特律活塞(DET)',
  邁阿密熱火: '迈阿密热火(MIA)', 迈阿密热火: '迈阿密热火(MIA)',
  波士頓塞爾特人: '波士顿凯尔特人(BOS)', 波士頓賽爾提克: '波士顿凯尔特人(BOS)',
  達拉斯小牛: '达拉斯独行侠(DAL)', 達拉斯獨行俠: '达拉斯独行侠(DAL)',
  金州勇士: '金州勇士(GSW)',
  克里夫蘭騎士: '克利夫兰骑士(CLE)', 克里夫兰骑士: '克利夫兰骑士(CLE)', 克利夫兰骑士: '克利夫兰骑士(CLE)',
  多倫多暴龍: '多伦多猛龙(TOR)', 多伦多猛龙: '多伦多猛龙(TOR)',
  密爾瓦基公鹿: '密尔沃基雄鹿(MIL)',
  丹佛金塊: '丹佛掘金(DEN)',
  奧克拉荷馬雷霆: '俄克拉何马城雷霆(OKC)', 俄克拉何马城雷霆: '俄克拉何马城雷霆(OKC)', 俄克拉荷马城雷霆: '俄克拉何马城雷霆(OKC)',
  奧蘭多魔術: '奥兰多魔术(ORL)',
  西雅圖超音速: '西雅图超音速(SEA)',
  猶他爵士: '犹他爵士(UTA)',
  紐約尼克: '纽约尼克斯(NYK)',
  印第安納遛馬: '印第安纳步行者(IND)', 印第安那溜馬: '印第安纳步行者(IND)', 印第安纳步行者: '印第安纳步行者(IND)',
  費城76人: '费城76人(PHI)',
  新澤西籃網: '新泽西篮网(BKN)',
  鳳凰城太陽: '菲尼克斯太阳(PHX)',
};

export type ChampionRow = { year: number; champion: string; finalsScore: string; runnerUp: string };

/**
 * 历年 NBA 总冠军(近 30 年):抓中文维基「NBA總冠軍列表」页 wikitext 表格解析。
 * year 为赛季结束年(2025 即 2024-25 赛季),按年份降序。
 */
export async function getNbaChampions(fetchImpl?: <T>(u: string) => Promise<T>): Promise<{ champions: ChampionRow[]; note: string }> {
  const url = `https://zh.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent('NBA總冠軍列表')}&prop=wikitext&format=json&redirects=1`;
  const d = await (fetchImpl ?? fetchJson)<any>(url);
  const wikitext: string = d?.parse?.wikitext?.['*'] ?? '';
  const norm = (n: string) => TEAM_NAME_MAP[n.trim()] ?? n.trim();
  // 行首:|[[1998-99 NBA賽季|1998-99]]||[[聖安東尼奧馬刺]]（1）|| … ;行尾:… ||4-1||[[紐約尼克]]
  const rowRe = /^\|\[\[(\d{4})-\d{2}[^\]|]*\|\d{4}-\d{2}\]\]\|\|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;
  const tailRe = /(\d+-\d+)\s*\|\|\s*\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]\s*$/;
  const rows: ChampionRow[] = [];
  for (const line of wikitext.split('\n')) {
    const m = rowRe.exec(line);
    if (!m) continue;
    const t = tailRe.exec(line);
    rows.push({
      year: Number(m[1]) + 1,
      champion: norm(m[3] ?? m[2]),
      finalsScore: t?.[1] ?? '',
      runnerUp: t ? norm(t[2]) : '',
    });
  }
  return { champions: rows.slice(-30).reverse(), note: 'year=赛季结束年(2025 即 2024-25 赛季),按年份降序;finalsScore 为总决赛大比分' };
}
