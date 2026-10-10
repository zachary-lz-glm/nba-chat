'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMemo, useRef, useState } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { Composer } from '@/components/chat/Composer';
import { SessionDrawer } from '@/components/sessions/SessionDrawer';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { Icon } from '@/components/ui/Icon';
import { getClientConfig } from '@/lib/client/config';
import { useSessions } from '@/lib/client/sessions';

const SUGGESTIONS = [
  { category: '今日赛程', label: '今天有哪些比赛值得关注？', question: '今天有什么 NBA 比赛？', number: '01' },
  { category: '球员档案', label: '约基奇，本赛季表现如何？', question: '查一下约基奇本赛季场均数据', number: '02' },
  { category: '比赛复盘', label: '回看 2025 年总决赛抢七', question: '复盘北京时间2025年6月23日NBA总决赛抢七', number: '03' },
  { category: '球队观察', label: '凯尔特人，上赛季走到哪？', question: '凯尔特人上赛季季后赛走到哪了？', number: '04' },
];

function startClock(ref: { current: number }) { ref.current = Date.now(); }

export default function Home() {
  const [config, setConfig] = useState(() => getClientConfig());
  const startedAt = useRef(0);
  const [timing, setTiming] = useState<{ messageId: string; ms: number }>();
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({ initial: 'instant', resize: 'instant' });
  const chat = useChat({
    id: 'nba-chat',
    transport: useMemo(() => new DefaultChatTransport({ api: '/api/chat', body: { config } }), [config]),
    onFinish: ({ message, isAbort, isError }) => {
      if (startedAt.current && !isAbort && !isError) setTiming({ messageId: message.id, ms: Date.now() - startedAt.current });
    },
  });
  const busy = chat.status === 'submitted' || chat.status === 'streaming';
  const send = (text: string) => {
    if (busy) return;
    startClock(startedAt); setTiming(undefined); chat.clearError();
    void chat.sendMessage({ text }); void scrollToBottom();
  };
  const retry = () => { startClock(startedAt); setTiming(undefined); chat.clearError(); void chat.regenerate(); void scrollToBottom(); };
  const lastMessage = chat.messages.at(-1);
  const { sessions, activeId, switchTo, startNew, remove } = useSessions(chat);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const newChat = async () => { await startNew(); setTiming(undefined); setDrawerOpen(false); chat.clearError(); };
  const selectChat = async (id: string) => { await switchTo(id); setTiming(undefined); setDrawerOpen(false); chat.clearError(); void scrollToBottom(); };

  return (
    <main className="nba-app">
      <header className="nba-header">
        <div className="nba-header-start">
          <button type="button" className="nba-icon-btn" onClick={() => setDrawerOpen(true)} aria-label="会话列表"><Icon name="menu" /></button>
          <h1 aria-label="NBA Chat"><span className="nba-brand-mark"><Icon name="ball" /></span><span>NBA <em>Chat</em></span></h1>
          <span className="nba-brand-note">THE GAME, EXPLAINED.</span>
        </div>
        <div className="nba-header-end">
          <span className="nba-timezone"><span />北京时间</span>
          <button type="button" className="nba-icon-btn" onClick={() => { void newChat(); }} aria-label="新建会话"><Icon name="plus" /></button>
          <button type="button" className="nba-icon-btn" onClick={() => setSettingsOpen(true)} aria-label="设置" disabled={busy}><Icon name="settings" /></button>
        </div>
      </header>
      <div className="nba-thread-area">
        <div ref={scrollRef} className="nba-thread" tabIndex={0} aria-label="对话内容">
          <div ref={contentRef} className="nba-thread-content">
            {chat.messages.length === 0 && (
              <section className="nba-empty" aria-label="开始一段篮球对话">
                <div className="nba-hero">
                  <div className="nba-hero-copy">
                    <p className="nba-eyebrow"><span /> YOUR COURTSIDE COMPANION</p>
                    <h2>今晚的比赛，<br /><span>从这里看懂。</span></h2>
                    <p className="nba-empty-tag">从赛前对阵，到最后一攻。<br />赛程、球员数据与比赛复盘，随时聊。</p>
                  </div>
                  <div className="nba-court-art" aria-hidden="true">
                    <svg viewBox="0 0 240 280" fill="none"><path d="M25 22h190v232H25zM25 254h190M83 22v85h74V22M97 22v62h46V22M109 46h22M120 46v8M25 30v57c0 99 190 99 190 0V30M83 107a37 37 0 0 0 74 0M83 107a37 37 0 0 1 74 0M82 254a38 38 0 0 1 76 0" /><circle cx="120" cy="61" r="7" /><circle className="nba-court-point" cx="168" cy="176" r="4" /><path className="nba-court-play" d="m168 176-30-29 17-37M145 115l10-5 2 11" /></svg>
                    <span>EVERY POSSESSION MATTERS.</span>
                  </div>
                </div>
                <div className="nba-suggest-heading"><span>从一个问题开始</span><span>EXPLORE THE GAME</span></div>
                <div className="nba-suggest">{SUGGESTIONS.map((s) => (
                  <button key={s.number} type="button" onClick={() => send(s.question)}><span className="nba-suggest-top"><span>{s.category}</span><span>{s.number}</span></span><span className="nba-suggest-label">{s.label}<Icon name="arrow" /></span></button>
                ))}</div>
              </section>
            )}
            {chat.messages.map((message) => (
              <ChatMessage key={message.id} message={message} elapsed={message.id === timing?.messageId ? timing.ms : undefined} streaming={message.id === lastMessage?.id && busy} />
            ))}
            {busy && lastMessage?.role !== 'assistant' && <div className="nba-pending" role="status"><span className="nba-typing"><i /><i /><i /></span>正在准备回答</div>}
            {chat.error && <div className="nba-error" role="alert"><div><strong>这次回答未能完成</strong><p>{chat.error.message.includes('429') || chat.error.message.includes('频繁') ? '请求有些频繁，请稍后再试。' : '连接暂时不可用。你可以重试，或发送一个新问题。'}</p></div><button type="button" onClick={retry} disabled={busy}>重新尝试</button></div>}
          </div>
        </div>
        {!isAtBottom && chat.messages.length > 0 && <button type="button" className="nba-scroll-latest" onClick={() => { void scrollToBottom({ animation: 'instant' }); }}><Icon name="down" width="16" height="16" />回到最新</button>}
      </div>
      <Composer onSend={send} onStop={() => { void chat.stop(); }} busy={busy} hasMessages={chat.messages.length > 0} />
      {drawerOpen && <SessionDrawer sessions={sessions} activeId={activeId} onSelect={(id) => { void selectChat(id); }} onNew={() => { void newChat(); }} onDelete={remove} onClose={() => setDrawerOpen(false)} />}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} onSave={(next) => { setConfig(next); setSettingsOpen(false); }} />}
    </main>
  );
}
