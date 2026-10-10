'use client';
import { useState } from 'react';
import { useModal } from '@/lib/client/useModal';
import { Icon } from '../ui/Icon';
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
  const modalRef = useModal<HTMLElement>(onClose);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <>
      <div className="nba-overlay" onClick={onClose} aria-hidden="true" />
      <aside ref={modalRef} className="nba-drawer" role="dialog" aria-modal="true" aria-labelledby="nba-sessions-title" tabIndex={-1}>
        <div className="nba-drawer-head">
          <span id="nba-sessions-title" className="nba-drawer-title">我的篮球对话</span>

          <button type="button" className="nba-icon-btn" onClick={onClose} aria-label="关闭会话列表"><Icon name="close" /></button>
        </div>
        <button type="button" className="nba-new-session" onClick={onNew}><Icon name="plus" width="17" height="17" />开启新对话</button><div className="nba-drawer-list">
          {sessions.length === 0 && <p className="nba-drawer-empty">暂无历史会话</p>}
          {sessions.map((s) => (
            <div key={s.id} className={`nba-session-item${s.id === activeId ? ' active' : ''}`}>
              <button type="button" className="nba-session-main" onClick={() => onSelect(s.id)} aria-current={s.id === activeId ? "true" : undefined}>
                <span className="nba-session-title">{s.title}</span>
                <span className="nba-session-time">{relTime(s.updatedAt)}</span>
              </button>
              {confirmId === s.id ? (
                <span className="nba-delete-actions"><button type="button" className="nba-session-del confirm" onClick={() => { onDelete(s.id); setConfirmId(null); }}>确认删除</button><button type="button" className="nba-session-del" onClick={() => setConfirmId(null)}>取消</button></span>
              ) : (
                <button type="button" className="nba-session-del" onClick={() => setConfirmId(s.id)} aria-label={`删除 ${s.title}`}>删除</button>
              )}
            </div>
          ))}
        </div>
        <p className="nba-drawer-foot">历史对话保存在当前浏览器。</p>
      </aside>
    </>
  );
}
