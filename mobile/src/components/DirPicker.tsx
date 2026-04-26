// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { DirCreatedEvent, DirEntry, DirListingEvent } from '../types';

type SortOrder = 'asc' | 'desc';

interface DirPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  listDir: (path: string, cb: (ev: DirListingEvent) => void) => void;
  createDir?: (path: string, cb: (ev: DirCreatedEvent) => void) => void;
  initialPath?: string;
}

function sortEntries(entries: DirEntry[], sortOrder: SortOrder, dirsFirst: boolean): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (dirsFirst && a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    const cmp = a.name.localeCompare(b.name);
    return sortOrder === 'asc' ? cmp : -cmp;
  });
}

function isValidFolderName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed !== '.' && trimmed !== '..' && !trimmed.includes('/');
}

export function DirPicker({ visible, onClose, onSelect, listDir, createDir, initialPath = '~' }: DirPickerProps) {
  const theme = useTheme();
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [rawEntries, setRawEntries] = useState<DirEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [dirsFirst, setDirsFirst] = useState(true);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const entries = sortEntries(rawEntries, sortOrder, dirsFirst);

  const navigate = (path: string) => {
    setLoading(true);
    setError(null);
    listDir(path, (ev) => {
      setLoading(false);
      if (ev.error) {
        setError(ev.error);
      } else {
        setCurrentPath(ev.path);
        setRawEntries(ev.entries);
      }
    });
  };

  useEffect(() => {
    if (visible) {
      navigate(initialPath);
      setSortOrder('asc');
      setDirsFirst(true);
      setNewFolderMode(false);
      setNewFolderName('');
      setCreateError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!isValidFolderName(trimmed) || !createDir) return;
    setCreating(true);
    setCreateError(null);
    const dirPath = currentPath.endsWith('/') ? currentPath + trimmed : currentPath + '/' + trimmed;
    const refreshPath = currentPath;
    const timeout = setTimeout(() => {
      setCreating(false);
      setCreateError('Request timed out');
    }, 10_000);
    createDir(dirPath, (ev) => {
      clearTimeout(timeout);
      setCreating(false);
      if (ev.ok) {
        setNewFolderMode(false);
        setNewFolderName('');
        navigate(refreshPath);
      } else {
        setCreateError(ev.error ?? 'Failed to create folder');
      }
    });
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: theme.colors.onSurfaceVariant }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>Choose Directory</Text>
          {createDir ? (
            <Pressable
              onPress={() => { setNewFolderMode(!newFolderMode); setCreateError(null); setNewFolderName(''); }}
              style={[styles.addBtn, { backgroundColor: theme.colors.primaryContainer }]}
            >
              <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>+</Text>
            </Pressable>
          ) : (
            <View style={styles.addBtn} />
          )}
        </View>

        {/* New folder input */}
        {newFolderMode && (
          <View style={[styles.newFolderRow, { borderBottomColor: theme.colors.outlineVariant }]}>
            <TextInput
              style={[styles.newFolderInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
              placeholder="Folder name"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              onSubmitEditing={handleCreateFolder}
            />
            <Pressable
              onPress={handleCreateFolder}
              disabled={!isValidFolderName(newFolderName) || creating}
              style={[
                styles.createBtn,
                { backgroundColor: theme.colors.primary },
                (!isValidFolderName(newFolderName) || creating) && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.createBtnText, { color: theme.colors.onPrimary }]}>
                {creating ? '…' : 'Create'}
              </Text>
            </Pressable>
            <Pressable onPress={() => { setNewFolderMode(false); setCreateError(null); }} style={styles.cancelCreateBtn}>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Cancel</Text>
            </Pressable>
          </View>
        )}
        {createError && (
          <Text style={[styles.createErrorText, { color: theme.colors.error }]}>{createError}</Text>
        )}

        {/* Breadcrumb */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.breadcrumb, { borderBottomColor: theme.colors.outlineVariant }]}>
          <Pressable onPress={() => navigate('/')} style={styles.crumb}>
            <Text style={[styles.crumbText, { color: theme.colors.onSurfaceVariant }]}>/</Text>
          </Pressable>
          {pathParts.map((part, i) => (
            <Pressable
              key={i}
              onPress={() => navigate('/' + pathParts.slice(0, i + 1).join('/'))}
              style={styles.crumb}
            >
              <Text style={[
                styles.crumbText,
                { color: theme.colors.onSurfaceVariant },
                i === pathParts.length - 1 && { color: theme.colors.onSurface, fontWeight: '600' },
              ]}>
                {part}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Sort controls */}
        <View style={[styles.sortRow, { borderBottomColor: theme.colors.outlineVariant }]}>
          <Pressable
            onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={[styles.sortChip, { backgroundColor: theme.colors.secondaryContainer }]}
          >
            <Text style={[styles.sortChipText, { color: theme.colors.onSecondaryContainer }]}>
              {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDirsFirst(prev => !prev)}
            style={[
              styles.sortChip,
              { backgroundColor: dirsFirst ? theme.colors.secondaryContainer : theme.colors.surfaceVariant },
            ]}
          >
            <Text style={[styles.sortChipText, { color: dirsFirst ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant }]}>
              Dirs first {dirsFirst ? '✓' : ''}
            </Text>
          </Pressable>
        </View>

        {/* Entries */}
        {loading && <Text style={[styles.status, { color: theme.colors.onSurfaceVariant }]}>Loading…</Text>}
        {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}
        <ScrollView style={styles.list}>
          {currentPath !== '/' && (
            <Pressable onPress={() => navigate(currentPath + '/..')} style={[styles.entry, { borderBottomColor: theme.colors.outlineVariant }]}>
              <Text style={styles.entryIcon}>📁</Text>
              <Text style={[styles.entryName, { color: theme.colors.onSurface }]}>..</Text>
            </Pressable>
          )}
          {entries.map(entry => (
            <Pressable
              key={entry.name}
              style={[styles.entry, { borderBottomColor: theme.colors.outlineVariant }]}
              onPress={() => entry.is_dir ? navigate(currentPath + '/' + entry.name) : undefined}
            >
              <Text style={styles.entryIcon}>{entry.is_dir ? '📁' : '📄'}</Text>
              <Text style={[styles.entryName, { color: entry.is_dir ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {entry.name}
              </Text>
              {entry.is_dir && (
                <Pressable
                  onPress={() => { onSelect(currentPath + '/' + entry.name); onClose(); }}
                  style={[styles.selectArrow, { backgroundColor: theme.colors.primaryContainer }]}
                  hitSlop={8}
                >
                  <Text style={[styles.selectArrowText, { color: theme.colors.primary }]}>→</Text>
                </Pressable>
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { borderTopColor: theme.colors.outlineVariant, backgroundColor: theme.colors.elevation.level1 }]}>
          <Text style={[styles.bottomPath, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{currentPath}</Text>
          <Button
            mode="contained"
            onPress={() => { onSelect(currentPath); onClose(); }}
            style={styles.bottomBtn}
            labelStyle={styles.bottomBtnLabel}
          >
            Use This Directory
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  cancelText: { fontSize: 15 },
  title: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 22, fontWeight: '700', lineHeight: 24 },
  newFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  newFolderInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  createBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  createBtnText: { fontSize: 13, fontWeight: '600' },
  cancelCreateBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  createErrorText: { textAlign: 'center', paddingVertical: 4, fontSize: 12 },
  breadcrumb: {
    flexGrow: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  crumb: { paddingHorizontal: 6, paddingVertical: 2 },
  crumbText: { fontSize: 13 },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
  },
  sortChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  sortChipText: { fontSize: 12, fontWeight: '500' },
  status: { textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  errorText: { textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  list: { flex: 1 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  entryIcon: { fontSize: 16, marginRight: 12 },
  entryName: { fontSize: 14, flex: 1 },
  selectArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  selectArrowText: { fontSize: 16, fontWeight: '600' },
  bottomBar: {
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  bottomPath: { fontSize: 11, fontFamily: 'Menlo' },
  bottomBtn: { borderRadius: 8 },
  bottomBtnLabel: { fontSize: 15, fontWeight: '600', paddingVertical: 2 },
});
