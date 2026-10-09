'use client';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { Markdown } from './Markdown';
import { ToolStrip } from './ToolStrip';

export function ChatMessage({ message, elapsed }: { message: UIMessage; elapsed?: number }) {
  if (message.role === 'user') {
    return <div className="nba-msg-user">{message.parts.map((p, i) => p.type === 'text' ? <p key={i}>{p.text}</p> : null)}</div>;
  }
  // ai v7:静态工具 part 的 type 为 `tool-${NAME}`(无 toolName 字段),dynamic 为 'dynamic-tool'。
  // 统一用包导出的 isToolUIPart / getToolName 处理;"仍在流式输入"对应 state === 'input-streaming'。
  const toolNames = message.parts.filter(isToolUIPart).map(getToolName);
  const running = message.parts.some((p) => isToolUIPart(p) && p.state === 'input-streaming');
  return (
    <div className="nba-msg-bot">
      <ToolStrip toolNames={[...new Set(toolNames)]} running={running} />
      {message.parts.map((p, i) => {
        if (p.type === 'text') return <Markdown key={i} content={p.text} />;
        return null; // 工具类 part 不在正文渲染(状态条已呈现)
      })}
      {elapsed != null && <div className="text-[10px] opacity-40 mt-1">{(elapsed / 1000).toFixed(1)}s</div>}
    </div>
  );
}
