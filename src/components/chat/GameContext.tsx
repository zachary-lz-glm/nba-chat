import { gameDate, statusLabel, teamName, type GameCard } from '@/lib/client/basketball';
import { Icon } from '../ui/Icon';

export function GameContext({ game, onClear }: { game: GameCard; onClear: () => void }) {
  return <aside className="courtside-context" aria-label="当前比赛">
    <span className="courtside-context-label">正在聊这场</span>
    <span className="courtside-context-score">{teamName(game.awayAbbr, game.awayTeam)} <strong>{game.status === 'Scheduled' ? 'VS' : `${game.awayScore ?? '—'} : ${game.homeScore ?? '—'}`}</strong> {teamName(game.homeAbbr, game.homeTeam)}</span>
    <span className="courtside-context-detail">{gameDate(game)} · {statusLabel(game.status)} · 北京时间</span>
    <button type="button" className="courtside-context-clear" onClick={onClear} aria-label="开始新的篮球对话"><Icon name="plus" width="16" height="16" /><span>聊点别的</span></button>
  </aside>;
}
