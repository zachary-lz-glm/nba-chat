import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { z } from 'zod';

const gameSchema = z.object({
  id: z.string(), homeAbbr: z.string(), awayAbbr: z.string(), homeTeam: z.string(), awayTeam: z.string(),
  homeScore: z.number().nullable(), awayScore: z.number().nullable(), tipoffBeijing: z.string(), status: z.string(), seasonLabel: z.string().nullable(),
});
const gamesSchema = z.object({ games: z.array(gameSchema) });
const statsSchema = z.object({
  seasonLogSummary: z.array(z.object({ group: z.string(), gp: z.number(), avgPTS: z.number().nullable(), avgREB: z.number().nullable(), avgAST: z.number().nullable() })),
});

/** Render only structured, successfully returned data; never parse model prose. */
export function DataCards({ parts }: { parts: UIMessage['parts'] }) {
  const tools = parts.filter(isToolUIPart).filter((part) => part.state === 'output-available');
  const schedule = tools.find((part) => getToolName(part) === 'get_games_by_date');
  const games = schedule?.state === 'output-available' ? gamesSchema.safeParse(schedule.output) : undefined;
  const player = tools.find((part) => getToolName(part) === 'get_player_stats');
  const stats = player?.state === 'output-available' ? statsSchema.safeParse(player.output) : undefined;
  return <>
    {games?.success && <section className="nba-data-panel" aria-label="查询到的赛程"><div className="nba-data-heading"><span>赛程速览</span><span>北京时间</span></div>
      {games.data.games.length === 0 ? <p className="nba-data-empty">查询日期暂无比赛记录。</p> : <div className="nba-game-grid">{games.data.games.slice(0, 6).map((game) => <article className="nba-game" key={game.id}>
        <div className="nba-game-meta"><span>{game.seasonLabel ?? 'NBA'}</span><span>{game.status === 'Final' ? '已结束' : game.status === 'Scheduled' ? '未开始' : game.status === 'In Progress' ? '进行中' : game.status}</span></div>
        <div className="nba-game-team"><abbr title={game.awayTeam}>{game.awayAbbr}</abbr><span>{game.awayScore ?? '—'}</span></div>
        <div className="nba-game-team"><abbr title={game.homeTeam}>{game.homeAbbr}</abbr><span>{game.homeScore ?? '—'}</span></div>
        <div className="nba-game-time">{game.tipoffBeijing}</div>
      </article>)}</div>}
      {games.data.games.length > 6 && <p className="nba-data-empty">共 {games.data.games.length} 场比赛，其余见下方回答。</p>}
      <p className="nba-data-source">赛事数据 · ESPN · 比分与状态以本次查询为准</p>
    </section>}
    {stats?.success && stats.data.seasonLogSummary.length > 0 && <section className="nba-data-panel" aria-label="查询到的球员场均数据">
      {stats.data.seasonLogSummary.map((group) => <div key={group.group}><div className="nba-data-heading"><span>球员场均 · {group.group}</span><span>{group.gp} 场</span></div><div className="nba-stat-grid">{[['得分 / PTS', group.avgPTS], ['篮板 / REB', group.avgREB], ['助攻 / AST', group.avgAST]].map(([label, value]) => <div key={label}><strong>{value == null ? '—' : value}</strong><span>{label}</span></div>)}</div></div>)}
      <p className="nba-data-source">球员数据 · ESPN · 根据查询到的逐场记录汇总</p>
    </section>}
  </>;
}
