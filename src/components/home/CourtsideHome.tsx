'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { beijingYMD } from '@/lib/time';
import { gamePhase, gameQuestion, gameSchema, selectFeaturedGame, type GameCard as Game } from '@/lib/client/basketball';
import { Composer } from '../chat/Composer';
import { GameCard } from '../chat/GameCard';
import { Icon } from '../ui/Icon';
import { FeaturedGame } from './FeaturedGame';

const responseSchema = z.object({ date: z.string(), games: z.array(gameSchema), fetchedAt: z.iso.datetime() });
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
  const liveSchedule = schedule?.date === date && schedule.games.some((game) => gamePhase(game) === 'live');
  useEffect(() => {
    if (!liveSchedule) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setRefresh((value) => value + 1); }, 30_000);
    return () => clearInterval(timer);
  }, [liveSchedule]);
  const featured = !loading && !schedule?.error ? selectFeaturedGame(schedule?.games ?? []) : undefined;
  const phase = featured ? gamePhase(featured) : undefined;
  return <div className="courtside-home" id="main-content">
    <section className="courtside-hero" aria-labelledby="courtside-title">
      <div className="courtside-hero-art" aria-hidden="true" />
      <div className="courtside-daybar courtside-container">
        <div className="courtside-tabs" role="tablist" aria-label="赛程日期">{([['today', '今天'], ['yesterday', '昨天'], ['classic', '经典比赛']] as const).map(([value, label]) => <button type="button" key={value} id={`day-${value}`} role="tab" aria-selected={day === value} aria-controls="schedule-panel" tabIndex={day === value ? 0 : -1} onClick={() => setDay(value)} onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const days: Day[] = ['today', 'yesterday', 'classic'];
          const index = days.indexOf(value);
          const next = days[event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
          setDay(next); document.getElementById(`day-${next}`)?.focus();
        }}>{label}</button>)}</div>
        <span className="courtside-date">{day === 'classic' ? '历史比赛' : '赛程'} · {date.replaceAll('-', '.')}</span>
      </div>
      <div className="courtside-hero-stage courtside-container">
        <div className="courtside-hero-copy">
          <h2 id="courtside-title">每一场比赛，<br />都值得看懂。</h2>
          <p className="courtside-hero-description">赛前看点、赛后复盘、关键回合，您想知道的都可以问。</p>
          <Composer variant="hero" placeholder="您想了解哪场比赛，哪位球员？" onSend={onAsk} onStop={onStop} busy={busy} hasMessages={false} />
        </div>
        {featured && <FeaturedGame game={featured} variant="hero" onAsk={onAsk} busy={busy} />}
      </div>
    </section>
    <section className="courtside-schedule courtside-container" id="schedule-panel" role="tabpanel" aria-labelledby={`day-${day}`} aria-busy={loading}>
      <div className="courtside-section-heading"><h3>从一场比赛开始</h3><span className="courtside-heading-line" /><p>{day === 'classic' ? '重温经典比赛，发现更多值得探讨的细节。' : '选择一场比赛，从赛前聊到最后一攻。'}</p></div>
      {loading ? <div className="courtside-loading" role="status" aria-label="正在查询赛程">{[0, 1, 2].map((key) => <div className="courtside-skeleton" key={key}><span /><span /><span /></div>)}</div>
        : schedule?.error ? <div className="courtside-empty"><Icon name="clock" /><div><h4>赛程暂时未能加载</h4><p>{schedule.error}</p></div><button type="button" onClick={retry}>重新查询<Icon name="arrow" width="14" height="14" /></button></div>
          : featured ? <>
            <div className="courtside-match-launcher"><FeaturedGame game={featured} variant="strip" onAsk={onAsk} busy={busy} /><aside className="courtside-quick-actions" aria-label="比赛查询入口">
              <button type="button" disabled={busy} onClick={() => onAsk(gameQuestion(featured, phase === 'upcoming' ? 'form' : phase === 'unavailable' ? 'schedule' : 'box'))}><Icon name="chart" /><span>{phase === 'upcoming' ? '球队近况' : phase === 'unavailable' ? '赛程状态' : '球员数据'}</span><Icon name="chevron" /></button>
              <button type="button" disabled={busy} onClick={() => onAsk(gameQuestion(featured, phase === 'upcoming' ? 'preview' : phase === 'live' ? 'live' : phase === 'final' ? 'plays' : 'schedule'))}><Icon name={phase === 'upcoming' ? 'ball' : 'play'} /><span>{phase === 'upcoming' ? '赛前看点' : phase === 'live' ? '实时战况' : phase === 'final' ? '最后两分钟' : '开球时间'}</span><Icon name="chevron" /></button>
            </aside></div>
            {schedule && schedule.games.length > 1 && <div className="courtside-other-games"><p>更多对阵</p><div className="courtside-game-list">{schedule.games.filter((game) => game.id !== featured.id).map((game) => <GameCard key={game.id} game={game} compact onAsk={onAsk} busy={busy} />)}</div></div>}
          </> : <div className="courtside-empty"><span className="courtside-empty-mark"><Icon name="ball" width="28" height="28" /></span><div><h4>这个日期暂无比赛记录</h4><p>可以换个日期，或回看一场经典比赛。</p></div><button type="button" onClick={() => day === 'classic' ? onAsk('请查看北京时间2025年6月23日NBA总决赛抢七的赛果。') : setDay('classic')}>{day === 'classic' ? '直接询问' : '重温经典比赛'}<Icon name="arrow" width="14" height="14" /></button></div>}
      <footer className="courtside-home-foot"><button type="button" onClick={retry} disabled={loading} aria-label="刷新赛程"><Icon name="refresh" width="14" height="14" />{fetchedTime ? `${fetchedTime} 更新` : '刷新赛程'}</button><span>赛程与数据以查询结果为准</span></footer>
    </section>
  </div>;
}
