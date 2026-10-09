// 用法: node scripts/fetch-fixtures.mjs  (写 tests/fixtures/,网络异常时报错退出)
import { writeFile, mkdir } from 'node:fs/promises';

const H = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' };
const get = async (u) => { const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
const dir = new URL('../tests/fixtures/', import.meta.url).pathname;
await mkdir(dir, { recursive: true });

const save = (name, data) => writeFile(dir + name, JSON.stringify(data));

await save('scoreboard-20250622.json', await get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20250622'));

const s = await get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401766128');
await save('summary-401766128.json', { header: s.header, boxscore: s.boxscore, plays: s.plays }); // 裁掉无关大块

await save('standings-2025.json', await get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2025'));
await save('search-sga.json', await get('https://site.web.api.espn.com/apis/search/v2?query=shai%20gilgeous-alexander&limit=10'));
await save('athlete-4278073.json', await get('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/4278073'));
await save('stats-4278073-2025.json', await get('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/4278073/stats?season=2025'));
await save('gamelog-4278073-2025.json', await get('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/4278073/gamelog?season=2025'));
await save('news.json', await get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=10'));
console.log('fixtures saved');
