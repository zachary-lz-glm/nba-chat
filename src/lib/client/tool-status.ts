import { getToolName, isToolUIPart, type UIMessage } from 'ai';

export type Lookup = { name: string; state: 'running' | 'success' | 'empty' | 'error' | 'stopped' };
export function getLookups(parts: UIMessage['parts'], streaming = true): Lookup[] {
  return parts.filter(isToolUIPart).map((part) => {
    const name = getToolName(part);
    if (part.state === 'output-error' || part.state === 'output-denied') return { name, state: 'error' };
    if (part.state !== 'output-available') return { name, state: streaming ? 'running' : 'stopped' };
    const output = part.output;
    if (output && typeof output === 'object') {
      if ('error' in output) return { name, state: 'error' };
      if ('games' in output && Array.isArray(output.games) && output.games.length === 0) return { name, state: 'empty' };
    }
    return { name, state: 'success' };
  });
}
