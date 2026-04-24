// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ContextMeter } from './ContextMeter';

interface StatusBarProps {
  agentName: string;
  containerName: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  maxTokens: number;
  sessionRunning: boolean;
  onContainerPress?: () => void;
}

export function StatusBar({
  agentName,
  containerName,
  inputTokens,
  outputTokens,
  cacheTokens,
  maxTokens,
  sessionRunning,
  onContainerPress,
}: StatusBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.agentLabel}>{agentName}</Text>
        <Pressable onPress={onContainerPress} hitSlop={6} style={styles.containerChip}>
          <Text style={styles.containerText}>{containerName || 'host'}</Text>
        </Pressable>
      </View>
      {sessionRunning ? (
        <ContextMeter
          inputTokens={inputTokens}
          outputTokens={outputTokens}
          cacheTokens={cacheTokens}
          maxTokens={maxTokens}
        />
      ) : (
        <Text style={styles.idleLabel}>idle</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
    backgroundColor: '#0a0a0a',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agentLabel: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
  },
  containerChip: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  containerText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '500',
  },
  idleLabel: {
    color: '#52525b',
    fontSize: 11,
    fontWeight: '600',
  },
});
