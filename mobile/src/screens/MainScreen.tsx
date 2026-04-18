import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApprovalCard } from '../components/ApprovalCard';
import { EventFeed } from '../components/EventFeed';
import { ConnectionStatus, EventFrame, PendingApproval, SessionStatus } from '../types';

interface MainScreenProps {
  status: ConnectionStatus;
  sessionStatus: SessionStatus;
  events: EventFrame[];
  pendingApprovals: PendingApproval[];
  lastSeq: number;
  defaultContainer?: string;
  onDecide: (tool_use_id: string, allow: boolean) => void;
  onDisconnect: () => void;
  onRun: (prompt: string, container?: string) => void;
}

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  disconnected: '#6b7280',
  connecting: '#fbbf24',
  authenticating: '#fbbf24',
  connected: '#4ade80',
  error: '#f87171',
};

export function MainScreen({
  status,
  sessionStatus,
  events,
  pendingApprovals,
  lastSeq,
  defaultContainer,
  onDecide,
  onDisconnect,
  onRun,
}: MainScreenProps) {
  const [prompt, setPrompt] = useState('');
  const [container, setContainer] = useState(defaultContainer ?? '');

  const handleRun = () => {
    const p = prompt.trim();
    if (!p) return;
    onRun(p, container.trim() || undefined);
    setPrompt('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]} />
          <Text style={styles.statusText}>{status}</Text>
          {lastSeq > 0 && <Text style={styles.seqBadge}>seq {lastSeq}</Text>}
          {sessionStatus === 'running' && (
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>running</Text>
            </View>
          )}
        </View>
        <Pressable onPress={onDisconnect} style={styles.disconnectBtn}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </Pressable>
      </View>

      {sessionStatus === 'idle' && (
        <View style={styles.runPanel}>
          <Text style={styles.sectionLabel}>New session</Text>
          <TextInput
            style={[styles.input, styles.promptInput]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="What should Claude do?"
            placeholderTextColor="#444"
            multiline
            autoCorrect={false}
          />
          <View style={styles.runRow}>
            <TextInput
              style={[styles.input, styles.containerInput]}
              value={container}
              onChangeText={setContainer}
              placeholder="container (optional)"
              placeholderTextColor="#444"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.runBtn, !prompt.trim() && styles.runBtnDisabled]}
              onPress={handleRun}
              disabled={!prompt.trim()}
            >
              <Text style={styles.runBtnText}>Run</Text>
            </Pressable>
          </View>
        </View>
      )}

      {pendingApprovals.length > 0 && (
        <View style={styles.approvalsSection}>
          <Text style={styles.sectionLabel}>
            {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
          </Text>
          <ScrollView
            horizontal={false}
            showsVerticalScrollIndicator={false}
            style={styles.approvalsList}
          >
            {pendingApprovals.map((approval: PendingApproval) => (
              <ApprovalCard
                key={approval.tool_use_id}
                approval={approval}
                onDecide={onDecide}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.feedSection}>
        <Text style={styles.sectionLabel}>Event stream</Text>
        <EventFeed events={events} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  seqBadge: {
    color: '#444',
    fontSize: 11,
    marginLeft: 4,
  },
  sessionBadge: {
    backgroundColor: '#14280f',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#1f4a18',
  },
  sessionBadgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disconnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  disconnectText: {
    color: '#666',
    fontSize: 13,
  },
  runPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    padding: 16,
    gap: 10,
  },
  input: {
    backgroundColor: '#0d0d0d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 10,
    color: '#f0f0f0',
    fontSize: 14,
  },
  promptInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  runRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  containerInput: {
    flex: 1,
    fontSize: 13,
  },
  runBtn: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  runBtnDisabled: {
    opacity: 0.35,
  },
  runBtnText: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 14,
  },
  approvalsSection: {
    maxHeight: '50%',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingTop: 12,
  },
  approvalsList: {
    flexGrow: 0,
  },
  sectionLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  feedSection: {
    flex: 1,
    paddingTop: 12,
  },
});
