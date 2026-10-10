import { gameAction, gameDate, gamePhase, gameQuestion, statusLabel, teamName, type GameCard } from '@/lib/client/basketball';
import { TeamBadge } from '../chat/GameCard';
import { Icon } from '../ui/Icon';

export function gameHeading(game: GameCard) {
  const finals = /NBA Finals.*Game\s*(\d+)/i.exec(game.note ?? '');
  return finals ? `${gameDate(game).slice(0, 4)} NBA FINALS · GAME ${finals[1]}` : game.seasonLabel ?? 'NBA 比赛记录';
}

export function MatchLine({ game }: { game: GameCard }) {
  const phase = gamePhase(game);
  const scheduled = phase === 'upcoming' || phase === 'unavailable';
  return <div className="courtside-scoreline" aria-label={scheduled ? `${teamName(game.homeAbbr)}对${teamName(game.awayAbbr)}，${statusLabel(game.status)}` : `${teamName(game.homeAbbr)}主队 ${game.homeScore ?? '暂无比分'}，${teamName(game.awayAbbr)}客队 ${game.awayScore ?? '暂无比分'}`}>
    <TeamBadge abbr={game.homeAbbr} />
    <span className="courtside-scoreline-name">{teamName(game.homeAbbr, game.homeTeam)}<small>{game.homeAbbr}</small></span>
    <strong>{scheduled ? '—' : game.homeScore ?? '—'}</strong><span className="courtside-scoreline-divider">:</span><strong>{scheduled ? '—' : game.awayScore ?? '—'}</strong>
    <span className="courtside-scoreline-name">{teamName(game.awayAbbr, game.awayTeam)}<small>{game.awayAbbr}</small></span>
    <TeamBadge abbr={game.awayAbbr} />
  </div>;
}

export function FeaturedGame({ game, variant, busy, onAsk }: { game: GameCard; variant: 'hero' | 'strip'; busy: boolean; onAsk: (text: string) => void }) {
  const action = gameAction(game);
  const decisive = gamePhase(game) === 'final' && game.homeScore !== null && game.awayScore !== null && game.homeScore !== game.awayScore;
  return <article className={`courtside-featured ${variant}`} aria-label="推荐比赛">
    {variant === 'strip' && <div className="courtside-featured-photo" aria-hidden="true"><span /></div>}
    <div className="courtside-featured-body">
      <p className="courtside-featured-title">{gameHeading(game)}</p>
      <MatchLine game={game} />
      <p className="courtside-featured-date">{gameDate(game).replaceAll('-', '.')} · {statusLabel(game.status)}</p>
      <button type="button" className="courtside-primary" disabled={busy || !gameDate(game)} onClick={() => onAsk(gameQuestion(game, action.intent))}>
        {variant === 'hero' && decisive ? '为什么赢？' : action.label}<Icon name="arrow" />
      </button>
    </div>
  </article>;
}
