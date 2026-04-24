// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import { exportTranscriptMarkdown, copyMessageText } from '../transcript';
import { EventFrame, AssistantEvent } from '../../types';
import { frame } from '../../__test-utils__/frame';

describe('exportTranscriptMarkdown', () => {
  it('includes session header with session ID', () => {
    const result = exportTranscriptMarkdown([], 'abc-123');
    expect(result).toContain('# Session abc-123');
  });

  it('formats session_started with prompt as "## User"', () => {
    const events: EventFrame[] = [
      frame(1, { type: 'session_started', prompt: 'Hello Claude' } as unknown as EventFrame['event']),
    ];
    const result = exportTranscriptMarkdown(events, 'sid');
    expect(result).toContain('## User');
    expect(result).toContain('Hello Claude');
  });

  it('formats assistant text blocks as "## Assistant"', () => {
    const events: EventFrame[] = [
      frame(1, {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Hello there' }],
        },
      } as AssistantEvent),
    ];
    const result = exportTranscriptMarkdown(events, 'sid');
    expect(result).toContain('## Assistant');
    expect(result).toContain('Hello there');
  });

  it('formats tool_use blocks with JSON input', () => {
    const events: EventFrame[] = [
      frame(1, {
        type: 'assistant',
        message: {
          content: [{
            type: 'tool_use',
            id: 'tu1',
            name: 'Bash',
            input: { command: 'echo hi' },
          }],
        },
      } as AssistantEvent),
    ];
    const result = exportTranscriptMarkdown(events, 'sid');
    expect(result).toContain('### Tool: Bash');
    expect(result).toContain('"command": "echo hi"');
  });

  it('formats tool_result with content', () => {
    const events: EventFrame[] = [
      frame(1, {
        type: 'tool_result',
        tool_use_id: 'tu1',
        content: 'output text',
      } as unknown as EventFrame['event']),
    ];
    const result = exportTranscriptMarkdown(events, 'sid');
    expect(result).toContain('### Result');
    expect(result).toContain('output text');
  });

  it('truncates tool_result content longer than 10000 chars', () => {
    const longContent = 'x'.repeat(15_000);
    const events: EventFrame[] = [
      frame(1, {
        type: 'tool_result',
        tool_use_id: 'tu1',
        content: longContent,
      } as unknown as EventFrame['event']),
    ];
    const result = exportTranscriptMarkdown(events, 'sid');
    expect(result).toContain('[truncated]');
    expect(result).not.toContain('x'.repeat(15_000));
  });

  it('caps events at 500 and shows omission notice', () => {
    const events: EventFrame[] = Array.from({ length: 510 }, (_, i) =>
      frame(i, {
        type: 'tool_result',
        tool_use_id: `tu${i}`,
        content: `result ${i}`,
      } as unknown as EventFrame['event']),
    );
    const result = exportTranscriptMarkdown(events, 'sid');
    expect(result).toContain('10 more events omitted');
  });

  it('formats session_ended with ok=true as "completed"', () => {
    const events: EventFrame[] = [
      frame(1, { type: 'session_ended', ok: true } as unknown as EventFrame['event']),
    ];
    const result = exportTranscriptMarkdown(events, 'sid');
    expect(result).toContain('completed');
  });

  it('formats session_ended with ok=false as "failed"', () => {
    const events: EventFrame[] = [
      frame(1, { type: 'session_ended', ok: false } as unknown as EventFrame['event']),
    ];
    const result = exportTranscriptMarkdown(events, 'sid');
    expect(result).toContain('failed');
  });
});

describe('copyMessageText', () => {
  it('returns empty string for non-assistant events', () => {
    expect(copyMessageText({ type: 'system', subtype: 'init' })).toBe('');
    expect(copyMessageText({ type: 'tool_result', tool_use_id: 'x', content: 'y' })).toBe('');
  });

  it('extracts text from assistant event with single text block', () => {
    const event: AssistantEvent = {
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'Hello' }],
      },
    };
    expect(copyMessageText(event)).toBe('Hello');
  });

  it('joins multiple text blocks with newline', () => {
    const event: AssistantEvent = {
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Line 1' },
          { type: 'text', text: 'Line 2' },
        ],
      },
    };
    expect(copyMessageText(event)).toBe('Line 1\nLine 2');
  });

  it('skips non-text blocks', () => {
    const event: AssistantEvent = {
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'ls' } },
          { type: 'text', text: 'World' },
        ],
      },
    };
    expect(copyMessageText(event)).toBe('Hello\nWorld');
  });
});
