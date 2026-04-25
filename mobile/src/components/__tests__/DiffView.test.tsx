import React from 'react';
import { render } from '@testing-library/react-native';
import { DiffView } from '../DiffView';
import type { DiffLine } from '../../utils/diff';

const SIMPLE_LINES: DiffLine[] = [
  { type: 'context', text: 'context' },
  { type: 'add', text: 'added line' },
  { type: 'remove', text: 'removed line' },
];

describe('DiffView — stats', () => {
  it('shows correct added count', () => {
    const { getByText } = render(<DiffView lines={SIMPLE_LINES} />);
    expect(getByText('+1')).toBeTruthy();
  });

  it('shows correct removed count', () => {
    const { getByText } = render(<DiffView lines={SIMPLE_LINES} />);
    expect(getByText('-1')).toBeTruthy();
  });

  it('does not render added stat when there are no added lines', () => {
    const lines: DiffLine[] = [{ type: 'remove', text: 'only removed' }];
    const { queryByText } = render(<DiffView lines={lines} />);
    expect(queryByText('-1')).toBeTruthy();
    expect(queryByText(/^\+\d/)).toBeNull();
  });

  it('does not render removed stat when there are no removed lines', () => {
    const lines: DiffLine[] = [{ type: 'add', text: 'only added' }];
    const { queryByText } = render(<DiffView lines={lines} />);
    expect(queryByText('+1')).toBeTruthy();
    expect(queryByText(/^-\d/)).toBeNull();
  });

  it('counts multiple added and removed lines correctly', () => {
    const lines: DiffLine[] = [
      { type: 'context', text: 'context' },
      { type: 'add', text: 'line a' },
      { type: 'add', text: 'line b' },
      { type: 'add', text: 'line c' },
      { type: 'remove', text: 'gone1' },
      { type: 'remove', text: 'gone2' },
    ];
    const { getByText } = render(<DiffView lines={lines} />);
    expect(getByText('+3')).toBeTruthy();
    expect(getByText('-2')).toBeTruthy();
  });
});

describe('DiffView — line rendering', () => {
  it('renders the Diff header', () => {
    const { getByText } = render(<DiffView lines={SIMPLE_LINES} />);
    expect(getByText('Diff')).toBeTruthy();
  });

  it('renders line text content', () => {
    const { getByText } = render(<DiffView lines={SIMPLE_LINES} />);
    expect(getByText('added line')).toBeTruthy();
    expect(getByText('removed line')).toBeTruthy();
  });

  it('renders gutter markers for each line type', () => {
    const { getAllByText } = render(<DiffView lines={SIMPLE_LINES} />);
    expect(getAllByText('+').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });
});

describe('DiffView — truncation', () => {
  it('shows truncation notice when lines exceed 80', () => {
    const lines: DiffLine[] = Array.from({ length: 90 }, (_, i) => ({
      type: 'add' as const,
      text: `line ${i}`,
    }));
    const { getByText } = render(<DiffView lines={lines} />);
    expect(getByText(/10 more lines/)).toBeTruthy();
  });

  it('does not show truncation notice when lines are within limit', () => {
    const lines: DiffLine[] = Array.from({ length: 50 }, (_, i) => ({
      type: 'add' as const,
      text: `line ${i}`,
    }));
    const { queryByText } = render(<DiffView lines={lines} />);
    expect(queryByText(/more lines/)).toBeNull();
  });
});
