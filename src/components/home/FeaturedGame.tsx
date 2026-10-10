import { gameDate, gameQuestion, statusLabel, teamName, type GameCard } from '@/lib/client/basketball';
import { TeamBadge } from '../chat/GameCard';
import { Icon } from '../ui/Icon';

export function gameHeading(game: GameCard) {
  const finals = /NBA Finals.*Game\s*(\d+)/i.exec(game.note ?? '');
  return finals ? `${gameDate(game).slice(0, 4)} NBA FINALS · GAME ${finals[1]}` : game.seasonLabel ?? 'NBA 比赛记录';
}

export function MatchLine({ game }: { game: GameCard }) {
  const scheduled = game.status === 'Scheduled';
  return <div className="courtside-scoreline" aria-label={`${teamName(game.homeAbbr)}主队 ${game.homeScore ?? '暂无比分'}，${teamName(game.awayAbbr)}客队 ${game.awayScore ?? '暂无比分'}`}>
    <TeamBadge abbr={game.homeAbbr} />
    <span className="courtside-scoreline-name">{teamName(game.homeAbbr, game.homeTeam)}<small>{game.homeAbbr}</small></span>
    <strong>{scheduled ? '—' : game.homeScore ?? '—'}</strong><span className="courtside-scoreline-divider">:</span><strong>{scheduled ? '—' : game.awayScore ?? '—'}</strong>
    <span className="courtside-scoreline-name">{teamName(game.awayAbbr, game.awayTeam)}<small>{game.awayAbbr}</small></span>
    <TeamBadge abbr={game.awayAbbr} />
  </div>;
}

export function FeaturedGame({ game, variant, busy, onAsk }: { game: GameCard; variant: 'hero' | 'strip'; busy: boolean; onAsk: (text: string) => void }) {
  return <article className={`courtside-featured ${variant}`} aria-label="推荐比赛">
    {variant === 'strip' && <div className="courtside-featured-photo" aria-hidden="true"><span /></div>}
    <div className="courtside-featured-body">
      <p className="courtside-featured-title">{gameHeading(game)}</p>
      <MatchLine game={game} />
      <p className="courtside-featured-date">{gameDate(game).replaceAll('-', '.')} · {statusLabel(game.status)}</p>
      <button type="button" className="courtside-primary" disabled={busy} onClick={() => onAsk(gameQuestion(game, game.status === 'Scheduled' ? 'preview' : 'recap'))}>
        {game.status === 'Scheduled' ? '赛前有哪些看点？' : variant === 'hero' ? '为什么赢？' : '复盘这场比赛'}<Icon name="arrow" />
      </button>
    </div>
  </article>;
}
