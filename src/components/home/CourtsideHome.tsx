'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { beijingYMD } from '@/lib/time';
import { gameSchema, type GameCard as Game } from '@/lib/client/basketball';
import { Composer } from '../chat/Composer';
import { GameCard } from '../chat/GameCard';
import { Icon } from '../ui/Icon';

const responseSchema = z.object({ date: z.string(), games: z.array(gameSchema), fetchedAt: z.string() });
type Schedule = { date: string; games: Game[]; fetchedAt: string; error?: string };
type Day = 'today' | 'yesterday' | 'classic';
const subscribeDate = (notify: () => void) => {
  const timer = setInterval(notify, 60_000);
  document.addEventListener('visibilitychange', notify);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', notify); };
};
const clientDate = () => beijingYMD(Date.now());
const serverDate = () => '';

export function CourtsideHome({ onAsk, onStop, busy }: { onAsk: (text: string) => void; onStop: () => void; busy: boolean }) {
  const today = useSyncExternalStore(subscribeDate, clientDate, serverDate);
  const [day, setDay] = useState<Day>('today');
  const [schedule, setSchedule] = useState<Schedule>();
  const [refresh, setRefresh] = useState(0);
  const yesterday = today ? beijingYMD(Date.parse(`${today}T00:00:00+08:00`) - 86400_000) : '';
  const date = day === 'classic' ? '2025-06-23' : day === 'yesterday' ? yesterday : today;
  const loading = schedule?.date !== date;
  useEffect(() => {
    if (!date) return;
    const ctrl = new AbortController();
    fetch(`/api/games?date=${encodeURIComponent(date)}`, { signal: ctrl.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('赛程暂时不可用');
        const result = responseSchema.parse(await response.json());
        if (result.date !== date) throw new Error('赛程日期不一致');
        return result;
      })
      .then((result) => { if (!ctrl.signal.aborted) setSchedule(result); })
      .catch(() => { if (!ctrl.signal.aborted) setSchedule({ date, games: [], fetchedAt: '', error: '暂时无法取得赛程。您仍可以直接提问，或稍后重试。' }); });
    return () => ctrl.abort();
  }, [date, refresh]);
  const retry = () => { setSchedule(undefined); setRefresh((value) => value + 1); };
  const fetchedTime = schedule?.fetchedAt ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(schedule.fetchedAt)) : '';
  return <div className="courtside-home" id="main-content"><div className="courtside-container">
    <div className="courtside-daybar"><div className="courtside-tabs" role="tablist" aria-label="赛程日期">{([['today', '今天'], ['yesterday', '昨天'], ['classic', '经典比赛']] as const).map(([value, label]) => <button type="button" key={value} id={`day-${value}`} role="tab" aria-selected={day === value} aria-controls="schedule-panel" onClick={() => setDay(value)}>{label}</button>)}</div><span className="courtside-date">{day === 'classic' ? '历史比赛 · ' : ''}{date.replaceAll('-', '.')}<span>北京时间</span></span></div>
    <section className="courtside-hero" aria-labelledby="courtside-title"><div className="courtside-hero-art" aria-hidden="true" /><div className="courtside-hero-copy"><p className="courtside-eyebrow"><span />YOUR COURTSIDE COMPANION</p><h2 id="courtside-title">每一场比赛，<br />都值得<span>看懂。</span></h2><p className="courtside-hero-description">从赛前对阵，到最后一攻。<br />赛程、球员数据与比赛复盘，随时问。</p><Composer variant="hero" placeholder="问比赛，问球员…" onSend={onAsk} onStop={onStop} busy={busy} hasMessages={false} /></div><span className="courtside-hero-caption">THE GAME, EXPLAINED.<span>离赛场更近一点。</span></span></section>
    <section className="courtside-schedule" id="schedule-panel" role="tabpanel" aria-labelledby={`day-${day}`} aria-busy={loading}>
      <div className="courtside-section-heading"><div><h3>{day === 'classic' ? '重温经典决战' : day === 'yesterday' ? '回看昨日赛场' : '从一场比赛开始'}</h3><p>{day === 'classic' ? '2025 总决赛 · 历史赛事记录' : '选择对阵，聊聊这场比赛。'}</p></div><button type="button" onClick={retry} disabled={loading} aria-label="刷新赛程"><Icon name="refresh" width="16" height="16" /><span>{fetchedTime ? `${fetchedTime} 更新` : '刷新赛程'}</span></button></div>
      {loading ? <div className="courtside-loading" role="status" aria-label="正在查询赛程">{[0, 1, 2].map((key) => <div className="courtside-skeleton" key={key}><span /><span /><span /></div>)}</div>
        : schedule?.error ? <div className="courtside-empty"><Icon name="clock" /><div><h4>赛程暂时未能加载</h4><p>{schedule.error}</p></div><button type="button" onClick={retry}>重新查询<Icon name="arrow" width="14" height="14" /></button></div>
          : schedule?.games.length ? <div className="courtside-game-list">{schedule.games.map((game) => <GameCard key={game.id} game={game} compact onAsk={onAsk} busy={busy} />)}</div>
            : <div className="courtside-empty"><span className="courtside-empty-mark"><Icon name="ball" width="28" height="28" /></span><div><h4>这个日期暂无比赛记录</h4><p>可以换个日期，或回看一场经典比赛。</p></div><button type="button" onClick={() => day === 'classic' ? onAsk('请查看北京时间2025年6月23日NBA总决赛抢七的赛果。') : setDay('classic')}>{day === 'classic' ? '直接询问' : '重温经典比赛'}<Icon name="arrow" width="14" height="14" /></button></div>}
    </section>
    <section className="courtside-explore" aria-label="探索篮球">{[
      { number: '01', category: '球员档案', title: '数据背后的表现', description: '看看约基奇本赛季的场均数据', question: '请查看约基奇本赛季的场均数据，区分常规赛和季后赛。' },
      { number: '02', category: '关键回合', title: '回到最后两分钟', description: '逐回合看懂 2025 总决赛抢七', question: '请查看北京时间2025年6月23日雷霆对步行者总决赛抢七，第四节最后两分钟的逐回合记录。' },
      { number: '03', category: '球队观察', title: '把视野拉回全联盟', description: '看看本赛季东西部球队排名', question: '请查看本赛季NBA东西部常规赛排名，注明赛季和数据口径。' },
    ].map((item) => <button type="button" className="courtside-explore-item" key={item.number} onClick={() => onAsk(item.question)} disabled={busy}><span>{item.number}</span><div><small>{item.category}</small><strong>{item.title}</strong><p>{item.description}</p></div><Icon name="arrow" width="18" height="18" /></button>)}</section>
    <footer className="courtside-home-foot"><span>每个问题，都从真实的比赛出发。</span><span>COURTSIDE INTELLIGENCE</span></footer>
  </div></div>;
}
