'use client';
import type { ChatStatus, UIMessage } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';

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

type ChatHandle = {
  messages: UIMessage[];
  status: ChatStatus;
  setMessages: (m: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  stop: () => Promise<void> | void;
};

export function useSessions(chat: ChatHandle) {
  const { messages, status, setMessages, stop } = chat;
  // 预渲染期不取 Date.now/Math.random(同 Task 10 固定 chat id 的原因);首客户端渲染再生成
  const [activeId, setActiveId] = useState<string>(() => (typeof window === 'undefined' ? '' : newSessionId()));
  const [sessions, setSessions] = useState<Session[]>(() => (typeof window === 'undefined' ? [] : listSessions()));
  const opSeq = useRef(0); // 停流是异步的:防止停流期间并发切换/新建/删除交错写错会话

  const save = useCallback((id: string, msgs: UIMessage[]) => {
    if (!msgs.length) return; // 空会话不入库
    saveSession({ id, title: sessionTitle(msgs), messages: msgs, updatedAt: Date.now() });
    setSessions(listSessions());
  }, []);

  // messages 变化且非空时 debounce 500ms 自动保存。
  // 定时器闭包捕获「调度时」的 activeId/messages,且 deps 变化即取消:
  // 迟到的落盘只可能写进调度时的旧会话,不会污染切换后的新会话
  useEffect(() => {
    if (!messages.length) return;
    const t = setTimeout(() => save(activeId, messages), 500);
    return () => clearTimeout(t);
  }, [messages, activeId, save]);

  /** 生成中先停流并等其完全落定(stop 是异步的,await 后才不会再有流尾写入);被更新的操作抢占时返回 false */
  const settleStream = useCallback(async () => {
    if (status === 'ready') return true;
    const seq = ++opSeq.current;
    try { await stop(); } catch { /* 中止竞态,忽略 */ }
    return seq === opSeq.current;
  }, [status, stop]);

  /** 旧会话同步落盘。经函数式 setMessages 读取最新消息:停流后闭包 messages 可能缺中止前的尾部 */
  const flush = useCallback((id: string) => {
    let current: UIMessage[] = [];
    setMessages((prev) => { current = prev; return prev; }); // SDK 同步调用并传入实时消息
    save(id, current);
  }, [save, setMessages]);

  const switchTo = useCallback(async (id: string) => {
    if (id === activeId) return;
    if (!(await settleStream())) return;
    flush(activeId); // 旧会话立即落盘(含已生成的部分),不等 debounce
    const next = listSessions().find((s) => s.id === id);
    setMessages(next ? next.messages : []);
    setActiveId(id);
  }, [activeId, flush, setMessages, settleStream]);

  const startNew = useCallback(async () => {
    if (!(await settleStream())) return;
    flush(activeId);
    setMessages([]);
    setActiveId(newSessionId());
  }, [activeId, flush, setMessages, settleStream]);

  const remove = useCallback(async (id: string) => {
    if (id === activeId && !(await settleStream())) return; // 删当前会话需先停流;删其他会话不动消息
    deleteSession(id);
    setSessions(listSessions());
    if (id === activeId) { // 删除的是当前会话则换新会话
      setActiveId(newSessionId());
      setMessages([]);
    }
  }, [activeId, setMessages, settleStream]);

  return { sessions, activeId, switchTo, startNew, remove };
}
