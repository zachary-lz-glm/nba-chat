'use client';
import type { Lookup } from '@/lib/client/tool-status';
import { Icon } from '../ui/Icon';
const NAMES: Record<string, string> = {
  get_games_by_date: '赛程与赛果', get_game_box: '技术统计', get_game_plays: '逐回合记录',
  get_series_or_games_lookup: '系列赛记录', get_standings: '球队排名', search_player: '球员档案',
  get_player_stats: '球员数据', get_player_gamelog: '逐场数据', get_champions: '历年冠军', get_news_or_wiki: '新闻与背景',
};
export function ToolStrip({ lookups }: { lookups: Lookup[] }) {
  if (!lookups.length) return null;
  const running = lookups.some((lookup) => lookup.state === 'running');
  const stopped = lookups.some((lookup) => lookup.state === 'stopped');
  const failed = lookups.some((lookup) => lookup.state === 'error');
  return <details className="nba-tools">
    <summary><span className={`nba-lookup-icon${running ? ' running' : ''}`}><Icon name={running ? 'clock' : failed ? 'close' : 'check'} width="14" height="14" /></span><span>{running ? '正在查询篮球数据' : failed ? '部分数据暂未取得' : stopped ? '查询已停止' : '已完成数据查询'}</span><span className="nba-tools-count">{lookups.length} 项<span aria-hidden="true">⌄</span></span></summary>
    <ul>{lookups.map((lookup, i) => <li key={`${lookup.name}-${i}`}><span>{NAMES[lookup.name] ?? '篮球资料'}</span><span className={`nba-lookup-${lookup.state}`}>{lookup.state === 'running' ? '查询中' : lookup.state === 'error' ? '暂不可用' : lookup.state === 'empty' ? '暂无比赛' : lookup.state === 'stopped' ? '已停止' : '已取得'}</span></li>)}</ul>
  </details>;
}
