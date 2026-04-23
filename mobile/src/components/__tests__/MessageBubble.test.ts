// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import { splitTextAndCode, Segment } from '../MessageBubble';

describe('splitTextAndCode', () => {
  it('returns single text segment for plain text with no fences', () => {
    const result = splitTextAndCode('Hello world');
    expect(result).toEqual<Segment[]>([
      { type: 'text', content: 'Hello world' },
    ]);
  });

  it('extracts a single code fence correctly with language', () => {
    const raw = '```typescript\nconst x = 1;\n```';
    const result = splitTextAndCode(raw);
    expect(result).toEqual<Segment[]>([
      { type: 'code', content: 'const x = 1;', language: 'typescript' },
    ]);
  });

  it('sets language to undefined for code fence without language', () => {
    const raw = '```\nsome code\n```';
    const result = splitTextAndCode(raw);
    expect(result).toEqual<Segment[]>([
      { type: 'code', content: 'some code', language: undefined },
    ]);
  });

  it('produces 3 segments for text before and after a code fence', () => {
    const raw = 'Before text\n```js\ncode here\n```\nAfter text';
    const result = splitTextAndCode(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual<Segment>({ type: 'text', content: 'Before text' });
    expect(result[1]).toEqual<Segment>({ type: 'code', content: 'code here', language: 'js' });
    expect(result[2]).toEqual<Segment>({ type: 'text', content: 'After text' });
  });

  it('extracts multiple code fences', () => {
    const raw = '```python\nprint("a")\n```\nMiddle\n```rust\nfn main() {}\n```';
    const result = splitTextAndCode(raw);
    const codeSegments = result.filter(s => s.type === 'code');
    expect(codeSegments).toHaveLength(2);
    expect(codeSegments[0].language).toBe('python');
    expect(codeSegments[1].language).toBe('rust');
  });

  it('returns single text segment with empty string for empty input', () => {
    const result = splitTextAndCode('');
    expect(result).toEqual<Segment[]>([
      { type: 'text', content: '' },
    ]);
  });

  it('skips whitespace-only text between fences', () => {
    const raw = '```js\na\n```\n   \n```py\nb\n```';
    const result = splitTextAndCode(raw);
    // Only code segments; the whitespace-only text between them is trimmed to empty and skipped
    expect(result).toEqual<Segment[]>([
      { type: 'code', content: 'a', language: 'js' },
      { type: 'code', content: 'b', language: 'py' },
    ]);
  });
});
