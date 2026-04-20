// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DirEntry, DirListingEvent } from '../types';

interface DirPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  listDir: (path: string, cb: (ev: DirListingEvent) => void) => void;
  initialPath?: string;
}

export function DirPicker({ visible, onClose, onSelect, listDir, initialPath = '~' }: DirPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = (path: string) => {
    setLoading(true);
    setError(null);
    listDir(path, (ev) => {
      setLoading(false);
      if (ev.error) {
        setError(ev.error);
      } else {
        setCurrentPath(ev.path);
        setEntries(ev.entries.sort((a: DirEntry, b: DirEntry) =>
          a.is_dir === b.is_dir ? a.name.localeCompare(b.name) : a.is_dir ? -1 : 1
        ));
      }
    });
  };

  useEffect(() => {
    if (visible) navigate(initialPath);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>Choose Directory</Text>
          <Pressable onPress={() => { onSelect(currentPath); onClose(); }} style={styles.selectBtn}>
            <Text style={styles.selectText}>Select</Text>
          </Pressable>
        </View>

        {/* Breadcrumb */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumb}>
          <Pressable onPress={() => navigate('/')} style={styles.crumb}>
            <Text style={styles.crumbText}>/</Text>
          </Pressable>
          {pathParts.map((part, i) => (
            <Pressable
              key={i}
              onPress={() => navigate('/' + pathParts.slice(0, i + 1).join('/'))}
              style={styles.crumb}
            >
              <Text style={[styles.crumbText, i === pathParts.length - 1 && styles.crumbActive]}>
                {part}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Entries */}
        {loading && <Text style={styles.status}>Loading…</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
        <ScrollView style={styles.list}>
          {currentPath !== '/' && (
            <Pressable onPress={() => navigate(currentPath + '/..')} style={styles.entry}>
              <Text style={styles.entryIcon}>📁</Text>
              <Text style={styles.entryName}>..</Text>
            </Pressable>
          )}
          {entries.map(entry => (
            <Pressable
              key={entry.name}
              style={styles.entry}
              onPress={() => entry.is_dir ? navigate(currentPath + '/' + entry.name) : undefined}
            >
              <Text style={styles.entryIcon}>{entry.is_dir ? '📁' : '📄'}</Text>
              <Text style={[styles.entryName, !entry.is_dir && styles.entryFile]}>
                {entry.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Current path footer */}
        <View style={styles.footer}>
          <Text style={styles.footerPath} numberOfLines={1}>{currentPath}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  cancelText: { color: '#9ca3af', fontSize: 15 },
  title: { color: '#e2e8f0', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  selectBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#14532d', borderRadius: 6 },
  selectText: { color: '#4ade80', fontSize: 15, fontWeight: '700' },
  breadcrumb: {
    flexGrow: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  crumb: { paddingHorizontal: 6, paddingVertical: 2 },
  crumbText: { color: '#71717a', fontSize: 13 },
  crumbActive: { color: '#e2e8f0', fontWeight: '600' },
  status: { color: '#6b7280', textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  errorText: { color: '#f87171', textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  list: { flex: 1 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  entryIcon: { fontSize: 16, marginRight: 12 },
  entryName: { color: '#e2e8f0', fontSize: 14 },
  entryFile: { color: '#52525b' },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  footerPath: { color: '#6b7280', fontSize: 11, fontFamily: 'Menlo' },
});
