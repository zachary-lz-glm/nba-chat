import { gameDate, gameQuestion, readBasketball, type GameCard } from '@/lib/client/basketball';
import type { UIMessage } from 'ai';
import { Icon } from '../ui/Icon';

export function FollowUps({ parts, game, onAsk, busy }: { parts: UIMessage['parts']; game: GameCard | null; onAsk: (text: string) => void; busy: boolean }) {
  if (busy) return null;
  const data = readBasketball(parts);
  const candidate = game;
  const match = data.timeline && candidate?.id !== data.timeline.gameId ? null : candidate;
  const questions: { label: string; question: string }[] = [];
  if (data.player) {
    const season = data.player.season;
    const scope = season ? `${season - 1}-${String(season).slice(-2)}赛季` : '';
    questions.push({ label: '查看逐场表现', question: `请查看${data.player.profile.name}${scope}的逐场数据，区分常规赛与季后赛。` });
  } else if (match && gameDate(match)) {
    if (!data.timeline && match.status !== 'Scheduled') questions.push({ label: '最后两分钟', question: gameQuestion(match, 'plays') });
    if (!data.box?.length) questions.push({ label: '查看球员数据', question: gameQuestion(match, 'box') });
    if (data.timeline || data.box?.length) questions.push({ label: '看懂这场比赛', question: gameQuestion(match, 'recap') });
    if (match.status === 'Scheduled') questions.push({ label: '赛前看点', question: gameQuestion(match, 'preview') });
  }
  if (!questions.length) return null;
  return <div className="courtside-followups"><p className="courtside-followups-label">继续看懂比赛</p><div className="courtside-followups-list">{questions.map(({ label, question }) => <button type="button" key={label} onClick={() => onAsk(question)}>{label}<Icon name="arrow" width="14" height="14" /></button>)}</div></div>;
}
