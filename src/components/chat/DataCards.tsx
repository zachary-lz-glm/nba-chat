'use client';
import { useState } from 'react';
import type { UIMessage } from 'ai';
import { gameDate, quarterLabel, readBasketball, teamName, timelineLabel, type GameCard as Game } from '@/lib/client/basketball';
import { GameCard } from './GameCard';
import { Icon } from '../ui/Icon';

export function DataCards({ parts, context, busy = false, onAsk }: { parts: UIMessage['parts']; context?: Game | null; busy?: boolean; onAsk?: (text: string) => void }) {
  const data = readBasketball(parts);
  const [expanded, setExpanded] = useState(false);
  const timeline = data.timeline;
  const match = timeline ? data.games.find((game) => game.id === timeline.gameId) ?? (context?.id === timeline.gameId ? context : undefined) : data.match;
  const plays = timeline?.plays ?? [];
  const visible = expanded ? plays : plays.slice(0, 6);
  const timelineTitle = timelineLabel(timeline?.period, timeline?.lastSeconds);
  const single = data.match ?? (data.games.length === 1 ? data.games[0] : undefined);
  return <>
    {single ? <GameCard game={single} /> : data.games.length > 0 && <section className="nba-data-panel" aria-label="查询到的赛程"><div className="nba-data-heading"><span>赛程速览 · {data.games.length} 场</span><span>北京时间</span></div><div className="courtside-game-list">{data.games.slice(0, 12).map((game) => <GameCard key={game.id} game={game} compact onAsk={onAsk} busy={busy} />)}</div>{data.games.length > 12 && <p className="nba-data-empty">其余场次见下方回答。</p>}</section>}
    {data.player && <section className="nba-data-panel" aria-label="球员场均数据"><div className="courtside-card-header"><div><p className="courtside-card-kicker">球员档案</p><h3 className="courtside-player-name">{data.player.profile.name}</h3></div><span className="courtside-player-meta">{data.player.season ? `${data.player.season - 1}-${String(data.player.season).slice(-2)} 赛季` : '查询赛季'}</span></div>{data.player.seasonLogSummary.map((group) => <div key={group.group}><div className="nba-data-heading"><span>场均 · {group.group === 'Regular Season' ? '常规赛' : group.group === 'Postseason' ? '季后赛' : group.group}</span><span>{group.gp} 场</span></div><div className="nba-stat-grid">{[['得分 / PTS', group.avgPTS], ['篮板 / REB', group.avgREB], ['助攻 / AST', group.avgAST]].map(([label, value]) => <div key={label}><strong>{value == null ? '—' : value}</strong><span>{label}</span></div>)}</div></div>)}<p className="nba-data-source">根据本次查询到的逐场记录汇总。</p></section>}
    {!!data.box?.length && <details className="nba-data-panel courtside-box"><summary className="nba-data-heading"><span>两队主要球员数据</span><span>查看统计 ⌄</span></summary>{data.box.map((team) => <div className="courtside-box-scroll" key={team.abbr}><table><caption>{teamName(team.abbr)} · 本次查询到的出场球员</caption><thead><tr><th>球员</th><th>分钟</th><th>得分</th><th>篮板</th><th>助攻</th></tr></thead><tbody>{team.players.map((player) => <tr key={player.name}><td>{player.name}</td><td>{player.min}</td><td>{player.pts}</td><td>{player.reb}</td><td>{player.ast}</td></tr>)}</tbody></table></div>)}</details>}
    {timeline && <section className="nba-data-panel courtside-timeline" aria-label="关键回合时间线"><div className="courtside-timeline-heading"><div><p className="courtside-card-kicker">PLAY BY PLAY</p><h3>{timelineTitle}</h3></div><span>{plays.length} 条记录{timeline.scoringOnly ? ' · 仅得分回合' : ''}</span></div><p className="nba-data-source">{match ? `比分顺序：${teamName(match.homeAbbr)}（主队）— ${teamName(match.awayAbbr)}（客队）` : '比分顺序：主队 — 客队'} · 事件保留赛事记录原文</p>{plays.length === 0 ? <p className="nba-data-empty">本次查询范围暂无逐回合记录，可换一个时间段。</p> : <ol className="courtside-play-list">{visible.map((play, index) => <li className="courtside-play" key={`${play.quarter}-${play.clock}-${index}`}><div className="courtside-play-time"><span>{quarterLabel(play.quarter)}</span><strong>{play.clock}</strong></div><div className="courtside-play-copy"><p>{play.text}</p><span>此回合后 {play.score.replace('-', ' : ')}</span></div>{onAsk && match && gameDate(match) && <button type="button" className="courtside-play-ask" disabled={busy} aria-label={`追问${quarterLabel(play.quarter)}剩余${play.clock}的回合`} onClick={() => onAsk(`请解释北京时间${gameDate(match)} ${teamName(match.awayAbbr)}对${teamName(match.homeAbbr)}比赛中，${quarterLabel(play.quarter)}剩余${play.clock}时的回合「${play.text}」，根据这场逐回合记录核对参与球员与当时比分。`)}><Icon name="arrow" width="16" height="16" /></button>}</li>)}</ol>}{plays.length > 6 && <button type="button" className="courtside-timeline-more" onClick={() => setExpanded(!expanded)}>{expanded ? '收起记录' : `展开全部 ${plays.length} 条记录`}<Icon name="down" width="14" height="14" /></button>}</section>}
  </>;
}
