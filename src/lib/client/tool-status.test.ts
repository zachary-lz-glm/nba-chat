import { describe, expect, it } from 'vitest';
import { type UIMessage } from 'ai';
import { getLookups } from './tool-status';

describe('lookup state from actual tool results', () => {
  it('stays running after input is ready and before the result arrives', () => {
    const parts: UIMessage['parts'] = [{ type: 'dynamic-tool', toolName: 'get_games_by_date', toolCallId: 'a', state: 'input-available', input: { date: '2026-10-10' } }];
    expect(getLookups(parts)).toEqual([{ name: 'get_games_by_date', state: 'running' }]);
  });
  it('reports a structured data-source error as failure', () => {
    const parts: UIMessage['parts'] = [{ type: 'dynamic-tool', toolName: 'get_games_by_date', toolCallId: 'a', state: 'output-available', input: {}, output: { error: 'unavailable' } }];
    expect(getLookups(parts)[0].state).toBe('error');
  });
  it('distinguishes no games from returned games', () => {
    const part = { type: 'dynamic-tool' as const, toolName: 'get_games_by_date', toolCallId: 'a', state: 'output-available' as const, input: {} };
    expect(getLookups([{ ...part, output: { games: [] } }])[0].state).toBe('empty');
    expect(getLookups([{ ...part, output: { games: [{ id: 'game' }] } }])[0].state).toBe('success');
  });
  it('marks unfinished queries as stopped once the stream ends', () => {
    const parts: UIMessage['parts'] = [{ type: 'dynamic-tool', toolName: 'get_games_by_date', toolCallId: 'a', state: 'input-available', input: {} }];
    expect(getLookups(parts, false)[0].state).toBe('stopped');
  });
  it('does not invent a lookup for text-only answers', () => {
    expect(getLookups([{ type: 'text', text: '已查证' }])).toEqual([]);
  });
});
