import { gameDate, statusLabel, type GameCard } from '@/lib/client/basketball';
import { Icon } from '../ui/Icon';
import { MatchLine, gameHeading } from '../home/FeaturedGame';

export function GameContext({ game, onClear }: { game: GameCard; onClear: () => void }) {
  return <aside className="courtside-context" aria-label="当前比赛">
    <span className="courtside-context-label">{gameHeading(game)}</span>
    <MatchLine game={game} />
    <span className="courtside-context-detail">{gameDate(game).replaceAll('-', '.')} · {statusLabel(game.status)}</span>
    <button type="button" className="courtside-context-clear" onClick={onClear} aria-label="开始新的篮球对话"><Icon name="plus" width="16" height="16" /><span>聊点别的</span></button>
  </aside>;
}
