import { gameDate, gameQuestion, readBasketball, teamName, type GameCard } from '@/lib/client/basketball';
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
  const fixture = match ? `北京时间${gameDate(match)} ${teamName(match.awayAbbr)}对${teamName(match.homeAbbr)}比赛` : '';
  return <div className="courtside-followups">
    {match && !data.player && !data.timeline && match.status !== 'Scheduled' && <section className="courtside-phases" aria-label="按阶段查看比赛记录"><h3>看懂关键回合</h3><p>您可以逐段查看比赛记录，再继续追问。</p><ol>{[
      ['上半场', '第一节和第二节'], ['第三节', '第三节'], ['末节', '第四节及加时'],
    ].map(([label, range], index) => <li key={label}><span>{index + 1}</span><button type="button" onClick={() => onAsk(`请查看${fixture}${range}的逐回合记录，按时间顺序说明比分变化，区分赛事记录与分析。`)}><strong>{label}</strong><small>查看比赛记录</small><Icon name="chevron" width="15" height="15" /></button></li>)}</ol></section>}
    <p className="courtside-followups-label">继续看懂比赛</p><div className="courtside-followups-list">{questions.map(({ label, question }) => <button type="button" key={label} onClick={() => onAsk(question)}><Icon name={label === '最后两分钟' ? 'clock' : label === '查看球员数据' ? 'chart' : 'ball'} />{label}<Icon name="chevron" width="14" height="14" /></button>)}</div></div>;
}
