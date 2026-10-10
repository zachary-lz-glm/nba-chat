'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMemo, useRef, useState } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';
import { ChatActions } from '@/components/chat/ChatActions';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { Composer } from '@/components/chat/Composer';
import { GameContext } from '@/components/chat/GameContext';
import { CourtsideHome } from '@/components/home/CourtsideHome';
import { SessionDrawer } from '@/components/sessions/SessionDrawer';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { Icon } from '@/components/ui/Icon';
import { findCurrentGame } from '@/lib/client/basketball';
import { getClientConfig } from '@/lib/client/config';
import { useSessions } from '@/lib/client/sessions';

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
  const hasMessages = chat.messages.length > 0;
  const currentGame = useMemo(() => findCurrentGame(chat.messages), [chat.messages]);
  const messageContexts = useMemo(() => chat.messages.map((_, index) => findCurrentGame(chat.messages.slice(0, index + 1))), [chat.messages]);
  const send = (text: string) => {
    if (busy) return;
    startedAt.current = Date.now(); setTiming(undefined); chat.clearError();
    void chat.sendMessage({ text }); void scrollToBottom();
  };
  const retry = () => { startedAt.current = Date.now(); setTiming(undefined); chat.clearError(); void chat.regenerate(); void scrollToBottom(); };
  const lastMessage = chat.messages.at(-1);
  const { sessions, activeId, switchTo, startNew, remove } = useSessions(chat);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const newChat = async () => { await startNew(); setTiming(undefined); setDrawerOpen(false); chat.clearError(); };
  const selectChat = async (id: string) => { await switchTo(id); setTiming(undefined); setDrawerOpen(false); chat.clearError(); void scrollToBottom(); };

  return <main className="nba-app" data-view={hasMessages ? 'chat' : 'home'}>
    <a className="courtside-skip" href="#main-content">跳到主要内容</a>
    <header className="nba-header">
      <div className="nba-header-start">
        <button type="button" className="nba-icon-btn nba-session-toggle" onClick={() => hasMessages ? void newChat() : setDrawerOpen(true)} aria-label={hasMessages ? '返回首页' : '会话列表'}><Icon name={hasMessages ? 'back' : 'menu'} /></button>
        <h1 aria-label="NBA Chat"><span className="nba-brand-word">NBA <em>Chat</em></span></h1>
        <nav className="nba-nav" aria-label="主导航"><button type="button" className="nba-nav-item active" onClick={() => { if (hasMessages) void newChat(); }} aria-current="page">聊比赛</button><button type="button" className="nba-nav-item" onClick={() => setDrawerOpen(true)}>历史对话</button></nav>
      </div>
      <div className="nba-header-end"><span className="nba-timezone"><Icon name="clock" />北京时间<Icon name="chevron" width="12" height="12" /></span><button type="button" className="nba-header-new" onClick={() => { void newChat(); }} aria-label="新建会话"><Icon name="plus" width="16" height="16" /><span>新对话</span></button><button type="button" className="nba-icon-btn nba-profile" onClick={() => setSettingsOpen(true)} aria-label="设置" disabled={busy}><Icon name="user" /></button><button type="button" className="nba-icon-btn courtside-more" onClick={() => setActionsOpen(true)} aria-label="更多操作" aria-haspopup="dialog" aria-expanded={actionsOpen}><Icon name="more" /></button></div>
    </header>
    {!hasMessages ? <CourtsideHome onAsk={send} onStop={() => { void chat.stop(); }} busy={busy} /> : <>
      {currentGame && <GameContext game={currentGame} onClear={() => { void newChat(); }} />}
      <div className="nba-thread-area"><div ref={scrollRef} className="nba-thread" tabIndex={0} aria-label="对话内容" id="main-content"><div ref={contentRef} className="nba-thread-content">
        {chat.messages.map((message, index) => <ChatMessage key={message.id} message={message} elapsed={message.id === timing?.messageId ? timing.ms : undefined} streaming={message.id === lastMessage?.id && busy} context={messageContexts[index]} onAsk={send} busy={busy} showFollowUps={message.id === lastMessage?.id} />)}
        {busy && lastMessage?.role !== 'assistant' && <div className="nba-pending" role="status"><span className="nba-typing"><i /><i /><i /></span>正在准备回答</div>}
        {chat.error && <div className="nba-error" role="alert"><div><strong>这次回答未能完成</strong><p>{chat.error.message.includes('429') || chat.error.message.includes('频繁') ? '请求有些频繁，请稍后再试。' : '连接暂时不可用。您可以重试，或发送一个新问题。'}</p></div><button type="button" onClick={retry} disabled={busy}>重新尝试</button></div>}
      </div></div>{!isAtBottom && <button type="button" className="nba-scroll-latest" onClick={() => { void scrollToBottom({ animation: 'instant' }); }}><Icon name="down" width="16" height="16" />回到最新</button>}</div>
      <Composer key={activeId} onSend={send} onStop={() => { void chat.stop(); }} busy={busy} hasMessages={true} placeholder={currentGame ? '继续问这场比赛…' : undefined} />
    </>}
    {actionsOpen && <ChatActions busy={busy} onClose={() => setActionsOpen(false)} onNew={() => { setActionsOpen(false); void newChat(); }} onHistory={() => { setActionsOpen(false); setDrawerOpen(true); }} onSettings={() => { setActionsOpen(false); setSettingsOpen(true); }} />}
    {drawerOpen && <SessionDrawer sessions={sessions} activeId={activeId} onSelect={(id) => { void selectChat(id); }} onNew={() => { void newChat(); }} onDelete={remove} onClose={() => setDrawerOpen(false)} />}
    {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} onSave={(next) => { setConfig(next); setSettingsOpen(false); }} />}
  </main>;
}
