// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import { eventsToPlainText, summarizeInput } from '../EventLog';
import { EventFrame, AssistantEvent } from '../../types';

function frame(seq: number, event: EventFrame['event']): EventFrame {
  return { seq, ts: 1000 + seq, event };
}

describe('eventsToPlainText', () => {
  it('formats session_started events', () => {
    const events: EventFrame[] = [
      frame(1, { type: 'session_started', prompt: 'hello' } as unknown as EventFrame['event']),
    ];
    const result = eventsToPlainText(events);
    expect(result).toContain('session started');
    expect(result).toContain('1001');
  });

  it('formats session_ended with ok as "done"', () => {
    const events: EventFrame[] = [
      frame(1, { type: 'session_ended', ok: true } as unknown as EventFrame['event']),
    ];
    const result = eventsToPlainText(events);
    expect(result).toContain('session done');
  });

  it('formats session_ended with ok=false as "failed"', () => {
    const events: EventFrame[] = [
      frame(1, { type: 'session_ended', ok: false } as unknown as EventFrame['event']),
    ];
    const result = eventsToPlainText(events);
    expect(result).toContain('session failed');
  });

  it('formats assistant text truncated to 200 chars', () => {
    const longText = 'a'.repeat(300);
    const events: EventFrame[] = [
      frame(1, {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: longText }],
        },
      } as AssistantEvent),
    ];
    const result = eventsToPlainText(events);
    expect(result).toContain('assistant:');
    // The text should be truncated to 200 chars
    const assistantLine = result.split('\n').find(l => l.includes('assistant:'))!;
    // "assistant: " prefix + 200 chars of 'a'
    expect(assistantLine.includes('a'.repeat(200))).toBe(true);
    expect(assistantLine.includes('a'.repeat(201))).toBe(false);
  });

  it('formats tool_use with summarized input', () => {
    const events: EventFrame[] = [
      frame(1, {
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: 'tu1',
            name: 'Bash',
            input: { command: 'echo hello' },
          }],
        },
      } as AssistantEvent),
    ];
    const result = eventsToPlainText(events);
    expect(result).toContain('tool: Bash');
    expect(result).toContain('echo hello');
  });

  it('formats tool_result', () => {
    const events: EventFrame[] = [
      frame(1, {
        type: 'tool_result',
        tool_use_id: 'tu1',
        content: 'some output',
      } as unknown as EventFrame['event']),
    ];
    const result = eventsToPlainText(events);
    expect(result).toContain('result');
  });

  it('caps at 500 events with omission notice', () => {
    const events: EventFrame[] = Array.from({ length: 510 }, (_, i) =>
      frame(i, {
        type: 'tool_result',
        tool_use_id: `tu${i}`,
        content: `r${i}`,
      } as unknown as EventFrame['event']),
    );
    const result = eventsToPlainText(events);
    expect(result).toContain('10 more events omitted');
  });
});

describe('summarizeInput', () => {
  it('returns command for Bash tool', () => {
    expect(summarizeInput('Bash', { command: 'echo hi' })).toBe('echo hi');
  });

  it('returns path for tools with path field', () => {
    expect(summarizeInput('Read', { path: '/tmp/file.txt' })).toBe('/tmp/file.txt');
  });

  it('returns file_path for tools with file_path field', () => {
    expect(summarizeInput('Write', { file_path: '/home/user/foo.ts' })).toBe('/home/user/foo.ts');
  });

  it('returns pattern for tools with pattern field', () => {
    expect(summarizeInput('Grep', { pattern: 'TODO' })).toBe('TODO');
  });

  it('returns first value for unknown tools', () => {
    expect(summarizeInput('CustomTool', { foo: 'bar', baz: 'qux' })).toBe('bar');
  });

  it('returns empty string for empty input', () => {
    expect(summarizeInput('Anything', {})).toBe('');
  });

  it('truncates to 120 chars', () => {
    const longCommand = 'x'.repeat(200);
    const result = summarizeInput('Bash', { command: longCommand });
    expect(result).toHaveLength(120);
  });
});
