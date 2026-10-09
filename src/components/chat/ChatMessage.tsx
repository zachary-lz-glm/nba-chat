'use client';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { useState } from 'react';
import { Markdown } from './Markdown';
import { ToolStrip } from './ToolStrip';

export function ChatMessage({ message, elapsed, streaming }: { message: UIMessage; elapsed?: number; streaming?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = message.parts.filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
      .map((p) => p.text).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* 剪贴板不可用时静默 */ }
  };

  if (message.role === 'user') {
    return <div className="nba-msg-user">{message.parts.map((p, i) => p.type === 'text' ? <p key={i}>{p.text}</p> : null)}</div>;
  }
  // ai v7:静态工具 part 的 type 为 `tool-${NAME}`(无 toolName 字段),dynamic 为 'dynamic-tool'。
  // 统一用包导出的 isToolUIPart / getToolName 处理;"仍在流式输入"对应 state === 'input-streaming'。
  const toolNames = message.parts.filter(isToolUIPart).map(getToolName);
  const running = message.parts.some((p) => isToolUIPart(p) && p.state === 'input-streaming');
  const hasText = message.parts.some((p) => p.type === 'text' && p.text.length > 0);
  return (
    <div className="nba-msg-assist">
      <div className={`nba-msg-bot${streaming && hasText ? ' streaming' : ''}`}>
        <ToolStrip toolNames={[...new Set(toolNames)]} running={running} />
        {message.parts.map((p, i) => {
          if (p.type === 'text') return <Markdown key={i} content={p.text} />;
          return null; // 工具类 part 不在正文渲染(状态条已呈现)
        })}
        {/* 等待首 token:输入中三点 */}
        {!hasText && !toolNames.length && (
          <span className="nba-typing" role="status" aria-label="正在思考"><i /><i /><i /></span>
        )}
      </div>
      {(hasText || elapsed != null) && (
        <div className="nba-msg-meta">
          <button type="button" className={`nba-copy${copied ? ' copied' : ''}`} onClick={copy} aria-label="复制回答">
            {copied ? '已复制' : '复制'}
          </button>
          {elapsed != null && <span className="nba-elapsed">{(elapsed / 1000).toFixed(1)}s</span>}
        </div>
      )}
    </div>
  );
}
