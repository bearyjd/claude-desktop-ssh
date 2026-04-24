// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface FileChipProps {
  name: string;
  size: number;
  onRemove: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function truncateName(name: string, max: number = 20): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf('.');
  if (ext > 0 && name.length - ext <= 6) {
    const extStr = name.slice(ext);
    return name.slice(0, max - extStr.length - 1) + '…' + extStr;
  }
  return name.slice(0, max - 1) + '…';
}

export function FileChip({ name, size, onRemove }: FileChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.name} numberOfLines={1}>{truncateName(name)}</Text>
      <Text style={styles.size}>{formatSize(size)}</Text>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  name: { color: '#a5b4fc', fontSize: 12, fontWeight: '500', maxWidth: 140 },
  size: { color: '#6b7280', fontSize: 10 },
  removeBtn: { padding: 2 },
  removeText: { color: '#6b7280', fontSize: 12 },
});
