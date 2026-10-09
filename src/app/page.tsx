'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { Composer } from '@/components/chat/Composer';
import { SessionDrawer } from '@/components/sessions/SessionDrawer';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { getClientConfig } from '@/lib/client/config';
import { useSessions } from '@/lib/client/sessions';

export default function Home() {
  const [config] = useState(() => getClientConfig());
  const chat = useChat({
    id: 'nba-chat', // 固定 chat id:避免构造时 Math.random 触发 Next 预渲染 unstable value 报错
    transport: useMemo(() => new DefaultChatTransport({
      api: '/api/chat',
      body: { config },
    }), [config]),
  });
  const startedAt = useRef<number>(0);
  const [elapsed, setElapsed] = useState<number>();
  useEffect(() => {
    if (chat.status === 'submitted') { startedAt.current = Date.now(); setElapsed(undefined); }
    if (chat.status === 'ready' && startedAt.current) setElapsed(Date.now() - startedAt.current);
  }, [chat.status]);

  const { sessions, activeId, switchTo, startNew, remove } = useSessions(chat.messages, chat.setMessages);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="nba-app">
      <header className="nba-header">
        <button type="button" className="nba-icon-btn" onClick={() => setDrawerOpen(true)} aria-label="会话列表">☰</button>
        <h1>NBA Chat</h1>
        <span className="nba-sub">官方风格智能问答 · 数据实时查证</span>
        <button type="button" className="nba-icon-btn nba-settings-entry" onClick={() => setSettingsOpen(true)} aria-label="设置">⚙ 设置</button>
      </header>
      <div className="nba-thread">
        {chat.messages.length === 0 && (
          <div className="nba-empty">
            <p>您好,我是 NBA Chat。</p>
            <p>赛程赛果、球员数据、历史纪录、关键球复盘……都可以问我。</p>
          </div>
        )}
        {chat.messages.map((m) => <ChatMessage key={m.id} message={m} elapsed={m.role === 'assistant' ? elapsed : undefined} />)}
        {chat.error && (
          <div className="nba-error">
            出错了:{chat.error.message}
            <button onClick={() => chat.regenerate()}>重试</button>
          </div>
        )}
      </div>
      <Composer onSend={(t) => chat.sendMessage({ text: t })} onStop={() => chat.stop()} streaming={chat.status !== 'ready'} />
      {drawerOpen && (
        <SessionDrawer
          sessions={sessions}
          activeId={activeId}
          onSelect={switchTo}
          onNew={startNew}
          onDelete={remove}
          onClose={() => setDrawerOpen(false)}
        />
      )}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </main>
  );
}
