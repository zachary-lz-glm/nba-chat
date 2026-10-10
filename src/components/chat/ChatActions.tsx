'use client';
import { useModal } from '@/lib/client/useModal';
import { Icon } from '../ui/Icon';

export function ChatActions({ onNew, onHistory, onSettings, onClose, busy }: {
  onNew: () => void; onHistory: () => void; onSettings: () => void; onClose: () => void; busy: boolean;
}) {
  const ref = useModal<HTMLDivElement>(onClose);
  return <div className="courtside-actions-overlay" onClick={onClose}>
    <div ref={ref} className="courtside-actions-dialog" role="dialog" aria-modal="true" aria-label="对话操作" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onNew}><Icon name="plus" />新建会话</button>
      <button type="button" onClick={onHistory}><Icon name="clock" />历史对话</button>
      <button type="button" onClick={onSettings} disabled={busy}><Icon name="settings" />设置</button>
    </div>
  </div>;
}
