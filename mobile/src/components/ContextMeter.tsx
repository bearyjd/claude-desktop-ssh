// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ContextMeterProps {
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  maxTokens: number;
}

function formatK(n: number): string {
  if (n === 0) return '0';
  return `${(n / 1000).toFixed(0)}k`;
}

export function ContextMeter({ inputTokens, outputTokens, maxTokens }: ContextMeterProps) {
  const totalUsed = inputTokens + outputTokens;
  const pct = maxTokens > 0 ? Math.min((totalUsed / maxTokens) * 100, 100) : 0;

  let barColor = '#4ade80';
  if (pct >= 80) barColor = '#f87171';
  else if (pct >= 60) barColor = '#fbbf24';

  return (
    <View style={styles.container}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.label, { color: barColor }]}>
        {formatK(totalUsed)}/{formatK(maxTokens)} ({pct.toFixed(0)}%)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
