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

const SUGGESTIONS = [
  '今天有什么 NBA 比赛?',
  '查一下约基奇本赛季场均数据',
  '北京时间2025年6月23日NBA赛果',
  '凯尔特人上赛季季后赛走到哪了?',
];

// 记录提问起点(仅事件处理器内调用;抽到模块作用域避免渲染期时钟直呼)
function startClock(ref: { current: number }) { ref.current = Date.now(); }

export default function Home() {
  const [config] = useState(() => getClientConfig());
  const startedAt = useRef<number>(0);
  const [elapsed, setElapsed] = useState<number>();
  const chat = useChat({
    id: 'nba-chat', // 固定 chat id:避免构造时 Math.random 触发 Next 预渲染 unstable value 报错
    transport: useMemo(() => new DefaultChatTransport({
      api: '/api/chat',
      body: { config },
    }), [config]),
    onFinish: () => { if (startedAt.current) setElapsed(Date.now() - startedAt.current); },
  });
  // 提问即记录起点并清空上次耗时
  const send = (t: string) => { startClock(startedAt); setElapsed(undefined); chat.sendMessage({ text: t }); };
  const retry = () => { startClock(startedAt); setElapsed(undefined); chat.regenerate(); };
  // 耗时只挂在最新一条 assistant 消息上,不刷历史气泡
  const lastAssistantId = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) if (chat.messages[i].role === 'assistant') return chat.messages[i].id;
    return undefined;
  }, [chat.messages]);

  const { sessions, activeId, switchTo, startNew, remove } = useSessions(chat);
  // 切换会话后,上一会话最新气泡的耗时不再适用,重置
  useEffect(() => { setElapsed(undefined); }, [activeId]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="nba-app">
      <header className="nba-header">
        <button type="button" className="nba-icon-btn" onClick={() => setDrawerOpen(true)} aria-label="会话列表">
          <span className="nba-burger" aria-hidden="true"><i /><i /><i /></span>
        </button>
        <h1 aria-label="NBA Chat"><span className="nba-logo-nba">NBA</span><span>Chat</span></h1>
        <button type="button" className="nba-icon-btn nba-settings-entry" onClick={() => setSettingsOpen(true)}>设置</button>
      </header>
      <div className="nba-thread">
        {chat.messages.length === 0 && (
          <div className="nba-empty">
            <h2 className="nba-empty-title">您好,我是 NBA Chat</h2>
            <p className="nba-empty-tag">赛程赛果、球员数据、历史与战术,问到就查。</p>
            <div className="nba-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {chat.messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            elapsed={m.id === lastAssistantId ? elapsed : undefined}
            streaming={m.id === lastAssistantId && chat.status === 'streaming'}
          />
        ))}
        {chat.error && (
          <div className="nba-error" role="alert">
            出错了:{chat.error.message}
            <button onClick={retry}>重试</button>
          </div>
        )}
      </div>
      <Composer onSend={send} onStop={() => chat.stop()} streaming={chat.status !== 'ready'} />
      {drawerOpen && (
        <SessionDrawer
          sessions={sessions}
          activeId={activeId}
          onSelect={(id) => { switchTo(id); setDrawerOpen(false); }}
          onNew={() => { startNew(); setDrawerOpen(false); }}
          onDelete={remove}
          onClose={() => setDrawerOpen(false)}
        />
      )}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </main>
  );
}
