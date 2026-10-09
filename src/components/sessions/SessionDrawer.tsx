'use client';
import { useState } from 'react';
import type { Session } from '@/lib/client/sessions';

const relTime = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return new Date(ts).toLocaleDateString('zh-CN');
};

export function SessionDrawer({ sessions, activeId, onSelect, onNew, onDelete, onClose }: {
  sessions: Session[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <>
      <div className="nba-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="nba-drawer" aria-label="会话列表">
        <div className="nba-drawer-head">
          <span className="nba-drawer-title">会话</span>
          <button type="button" onClick={onNew}>新建会话</button>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="nba-drawer-list">
          {sessions.length === 0 && <p className="nba-drawer-empty">暂无历史会话</p>}
          {sessions.map((s) => (
            <div key={s.id} className={`nba-session-item${s.id === activeId ? ' active' : ''}`}>
              <button type="button" className="nba-session-main" onClick={() => { onSelect(s.id); onClose(); }}>
                <span className="nba-session-title">{s.title}</span>
                <span className="nba-session-time">{relTime(s.updatedAt)}</span>
              </button>
              {confirmId === s.id ? (
                <button type="button" className="nba-session-del confirm" onClick={() => { onDelete(s.id); setConfirmId(null); }}>确认删除</button>
              ) : (
                <button type="button" className="nba-session-del" onClick={() => setConfirmId(s.id)} aria-label={`删除 ${s.title}`}>删除</button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
