'use client';
import type { UIMessage } from 'ai';
import { useCallback, useEffect, useState } from 'react';

export type Session = { id: string; title: string; messages: UIMessage[]; updatedAt: number };
const KEY = 'nba-chat-sessions';

export const newSessionId = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function listSessions(): Session[] {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as Session[]).sort((a, b) => b.updatedAt - a.updatedAt); }
  catch { return []; }
}
export function saveSession(s: Session) {
  const all = listSessions().filter((x) => x.id !== s.id);
  all.unshift(s);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
}
export function deleteSession(id: string) {
  localStorage.setItem(KEY, JSON.stringify(listSessions().filter((x) => x.id !== id)));
}

// ---- useSessions:当前会话 id + 切换时保存/载入 messages ----

/** 标题取首条用户消息文本前 12 字 */
const sessionTitle = (messages: UIMessage[]): string => {
  const first = messages.find((m) => m.role === 'user');
  const text = first?.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join(' ').trim();
  return text ? text.slice(0, 12) : '新会话';
};

export function useSessions(messages: UIMessage[], setMessages: (m: UIMessage[]) => void) {
  // 预渲染期不取 Date.now/Math.random(同 Task 10 固定 chat id 的原因);首客户端渲染再生成
  const [activeId, setActiveId] = useState<string>(() => (typeof window === 'undefined' ? '' : newSessionId()));
  const [sessions, setSessions] = useState<Session[]>(() => (typeof window === 'undefined' ? [] : listSessions()));

  const save = useCallback((id: string, msgs: UIMessage[]) => {
    if (!msgs.length) return; // 空会话不入库
    saveSession({ id, title: sessionTitle(msgs), messages: msgs, updatedAt: Date.now() });
    setSessions(listSessions());
  }, []);

  // messages 变化且非空时 debounce 500ms 自动保存
  useEffect(() => {
    if (!messages.length) return;
    const t = setTimeout(() => save(activeId, messages), 500);
    return () => clearTimeout(t);
  }, [messages, activeId, save]);

  const switchTo = useCallback((id: string) => {
    if (id === activeId) return;
    save(activeId, messages); // 旧会话立即落盘,不等 debounce
    const next = listSessions().find((s) => s.id === id);
    setMessages(next ? next.messages : []);
    setActiveId(id);
  }, [activeId, messages, save, setMessages]);

  const startNew = useCallback(() => {
    save(activeId, messages);
    setMessages([]);
    setActiveId(newSessionId());
  }, [activeId, messages, save, setMessages]);

  const remove = useCallback((id: string) => {
    deleteSession(id);
    setSessions(listSessions());
    if (id === activeId) { // 删除的是当前会话则换新会话
      setActiveId(newSessionId());
      setMessages([]);
    }
  }, [activeId, setMessages]);

  return { sessions, activeId, switchTo, startNew, remove };
}
