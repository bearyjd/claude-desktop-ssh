import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import { StyleSheet } from 'react-native';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { MainScreen } from './src/screens/MainScreen';
import { useClaudedWS } from './src/hooks/useClaudedWS';
import { ServerConfig } from './src/types';

export default function App() {
  const { status, sessionStatus, events, pendingApprovals, lastSeq, connect, disconnect, decide, run } = useClaudedWS();
  const [config, setConfig] = React.useState<ServerConfig | null>(null);

  const isConnected = status === 'connected' || status === 'authenticating' || status === 'connecting';

  const handleConnect = (cfg: ServerConfig) => {
    setConfig(cfg);
    connect(cfg);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {isConnected ? (
          <MainScreen
            status={status}
            sessionStatus={sessionStatus}
            events={events}
            pendingApprovals={pendingApprovals}
            lastSeq={lastSeq}
            defaultContainer={config?.container}
            onDecide={decide}
            onDisconnect={disconnect}
            onRun={run}
          />
        ) : (
          <ConnectScreen
            status={status}
            onConnect={handleConnect}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
