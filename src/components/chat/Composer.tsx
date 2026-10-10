'use client';
import { useRef, useState } from 'react';

export function Composer({ onSend, onStop, streaming }: {
  onSend: (text: string) => void; onStop: () => void; streaming: boolean;
}) {
  const [text, setText] = useState('');
  const [ime, setIme] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const send = () => { const t = text.trim(); if (!t || streaming) return; onSend(t); setText(''); };
  return (
    <div className="nba-composer">
      <div className="nba-composer-shell">
        <textarea
          ref={ref}
          rows={2}
          value={text}
          placeholder="问我任何 NBA 数据"
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => setIme(true)}
          onCompositionEnd={() => setIme(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !ime) { e.preventDefault(); send(); } }}
        />
        {streaming
          ? <button className="nba-stop" onClick={onStop} aria-label="停止生成"><span className="nba-stop-icon" aria-hidden="true" />停止</button>
          : <button className="nba-send" onClick={send} disabled={!text.trim()} aria-label="发送">发送</button>}
      </div>
    </div>
  );
}
