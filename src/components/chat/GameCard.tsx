import { Fragment, type CSSProperties } from 'react';
import { gameDate, gameQuestion, statusLabel, teamColor, teamName, type GameCard as Game } from '@/lib/client/basketball';
import { Icon } from '../ui/Icon';

export function TeamBadge({ abbr }: { abbr: string }) {
  return <span className="courtside-team-badge" style={{ '--team-color': teamColor(abbr) } as CSSProperties}>{abbr}</span>;
}

export function GameCard({ game, compact = false, busy = false, onAsk }: {
  game: Game; compact?: boolean; busy?: boolean; onAsk?: (text: string) => void;
}) {
  const scheduled = game.status === 'Scheduled';
  const time = game.tipoffBeijing.match(/\d{2}:\d{2}/)?.[0];
  const ask = () => onAsk?.(gameQuestion(game, scheduled ? 'preview' : 'recap'));
  const teams = [
    { abbr: game.awayAbbr, name: game.awayTeam, score: game.awayScore },
    { abbr: game.homeAbbr, name: game.homeTeam, score: game.homeScore },
  ];
  if (compact) return <button type="button" className="courtside-game-card" onClick={ask} disabled={busy} aria-label={`${teamName(game.awayAbbr)}对${teamName(game.homeAbbr)}，${scheduled ? '查看赛前看点' : '查看比赛'}`}>
    <span className="courtside-game-top"><span>{game.seasonLabel ?? 'NBA'}</span><span className={game.status === 'In Progress' ? 'courtside-live' : ''}>{statusLabel(game.status)}</span></span>
    <span className="courtside-game-teams">{teams.map((team) => <span className="courtside-team-row" key={team.abbr}><TeamBadge abbr={team.abbr} /><span className="courtside-team-name">{teamName(team.abbr, team.name)}</span><span className="courtside-score">{scheduled ? '—' : team.score ?? '—'}</span></span>)}</span>
    <span className="courtside-game-bottom"><span>{time ? `${time} 北京时间` : '时间待确认'}</span><span className="courtside-game-action">{scheduled ? '赛前看点' : '聊这场'}<Icon name="arrow" width="14" height="14" /></span></span>
  </button>;
  return <section className="nba-data-panel" aria-label="比赛数据">
    <div className="courtside-card-header"><span className="courtside-card-kicker">{game.seasonLabel ?? '比赛速览'}</span><span className={game.status === 'In Progress' ? 'courtside-live' : ''}>{statusLabel(game.status)}</span></div>
    <div className="courtside-match-score">{teams.map((team, i) => <Fragment key={team.abbr}>{i === 1 && <span className="courtside-match-divider">:</span>}<div className="courtside-match-side"><TeamBadge abbr={team.abbr} /><span>{teamName(team.abbr, team.name)}<small>{i === 0 ? '客队' : '主队'}</small></span><strong>{scheduled ? '—' : team.score ?? '—'}</strong></div></Fragment>)}</div>
    <div className="courtside-card-foot"><span>{game.tipoffBeijing ? `${game.tipoffBeijing} · 北京时间` : '开球时间暂无数据'}</span><span>比分与状态以本次查询为准</span></div>
    {onAsk && gameDate(game) && <div className="courtside-card-actions"><button type="button" disabled={busy} onClick={ask}>{scheduled ? '赛前看点' : '比赛复盘'}<Icon name="arrow" width="14" height="14" /></button>{!scheduled && <button type="button" disabled={busy} onClick={() => onAsk(gameQuestion(game, 'plays'))}>最后两分钟<Icon name="arrow" width="14" height="14" /></button>}</div>}
  </section>;
}
