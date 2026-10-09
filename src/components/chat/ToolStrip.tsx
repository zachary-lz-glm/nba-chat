'use client';
const NAMES: Record<string, string> = {
  get_games_by_date: '查询赛程赛果',
  get_game_box: '核对技术统计',
  get_game_plays: '核对逐回合',
  get_series_or_games_lookup: '核对系列赛',
  get_standings: '查询排名',
  search_player: '搜索球员',
  get_player_stats: '查询球员数据',
  get_player_gamelog: '查询逐场数据',
  get_news_or_wiki: '检索新闻/背景',
};
export function ToolStrip({ toolNames, running }: { toolNames: string[]; running: boolean }) {
  if (!toolNames.length) return null;
  return (
    <div className={`nba-tools${running ? ' running' : ' done'}`}>
      {running && <span className="nba-dot" aria-hidden="true" />}
      {toolNames.map((n, i) => (
        <span key={i} className="nba-tool-chip">
          {running
            ? <>{NAMES[n] ?? '查证数据'}<span aria-hidden="true">…</span></>
            : <><span aria-hidden="true">✓ </span>已{NAMES[n] ?? '查证数据'}</>}
        </span>
      ))}
    </div>
  );
}
