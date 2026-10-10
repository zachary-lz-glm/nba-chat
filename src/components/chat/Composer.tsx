'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';

export function Composer({ onSend, onStop, busy, hasMessages, variant, placeholder }: {
  onSend: (text: string) => void; onStop: () => void; busy: boolean; hasMessages: boolean; variant?: 'hero'; placeholder?: string;
}) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);
  const send = () => {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value); setText(''); ref.current?.focus();
  };
  return (
    <div className={`nba-composer${variant ? ` ${variant}` : ''}`}>
      <form className="nba-composer-shell" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea ref={ref} rows={1} value={text} aria-label="输入 NBA 问题" placeholder={placeholder ?? (hasMessages ? '继续追问，或聊聊下一场比赛…' : '您想了解哪场比赛，哪位球员？')}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !composing.current && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); send(); } }} />
        {busy
          ? <button type="button" className="nba-stop" onClick={onStop} aria-label="停止生成"><Icon name="stop" /></button>
          : <button type="submit" className="nba-send" disabled={!text.trim()} aria-label="发送问题"><Icon name="send" /></button>}
      </form>
      <div className="nba-composer-foot"><span>赛事有记录，分析有依据。</span><span className="nba-shortcut"><kbd>Enter</kbd> 发送 · <kbd>Shift Enter</kbd> 换行</span></div>
    </div>
  );
}
