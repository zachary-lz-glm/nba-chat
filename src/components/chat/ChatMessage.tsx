'use client';
import type { UIMessage } from 'ai';
import { useState } from 'react';
import { getLookups } from '@/lib/client/tool-status';
import { Markdown } from './Markdown';
import { ToolStrip } from './ToolStrip';
import { DataCards } from './DataCards';
import { Icon } from '../ui/Icon';
import type { GameCard } from '@/lib/client/basketball';
import { FollowUps } from './FollowUps';

export function ChatMessage({ message, elapsed, streaming, context, onAsk, busy = false, showFollowUps = false }: { message: UIMessage; elapsed?: number; streaming?: boolean; context?: GameCard | null; onAsk?: (text: string) => void; busy?: boolean; showFollowUps?: boolean }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const copy = async () => {
    const text = message.parts.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
    try { await navigator.clipboard.writeText(text); setCopyState('copied'); }
    catch { setCopyState('error'); }
    setTimeout(() => setCopyState('idle'), 2000);
  };
  if (message.role === 'user') return <article className="nba-msg-user" aria-label="你的问题">{message.parts.map((part, i) => part.type === 'text' ? <p key={i}>{part.text}</p> : null)}</article>;
  const lookups = getLookups(message.parts, !!streaming);
  const hasText = message.parts.some((part) => part.type === 'text' && part.text.length > 0);
  return <article className="nba-msg-assist" aria-label="NBA Chat 的回答" aria-busy={streaming}>
    <div className="nba-assist-label"><span className="nba-assist-mark"><Icon name="ball" width="15" height="15" /></span>NBA Chat<span>比赛解读</span></div>
    <ToolStrip lookups={lookups} /><DataCards parts={message.parts} context={context} onAsk={onAsk} busy={busy} />
    <div className={`nba-msg-bot${streaming && hasText ? ' streaming' : ''}`}>
      {message.parts.map((part, i) => part.type === 'text' ? <Markdown key={i} content={part.text} /> : null)}
      {!hasText && !lookups.length && streaming && <span className="nba-typing" role="status" aria-label="正在整理回答"><i /><i /><i /></span>}
      {!hasText && !streaming && !lookups.length && <p className="nba-interrupted">回答已停止。你可以继续追问。</p>}
    </div>
    {hasText && showFollowUps && onAsk && <FollowUps parts={message.parts} game={context ?? null} onAsk={onAsk} busy={busy} />}
    {hasText && <div className="nba-msg-meta"><button type="button" className={`nba-copy ${copyState}`} onClick={copy}><Icon name={copyState === 'copied' ? 'check' : 'copy'} width="14" height="14" />{copyState === 'copied' ? '已复制' : copyState === 'error' ? '复制失败，请重试' : '复制回答'}</button>{elapsed != null && <span>{(elapsed / 1000).toFixed(1)} 秒</span>}</div>}
  </article>;
}
