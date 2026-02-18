import React, { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from './src/store';
import { useWebSocket } from './src/hooks/useWebSocket';
import ConnectScreen from './src/screens/ConnectScreen';
import RemoteScreen from './src/screens/RemoteScreen';

const STORAGE_KEY = 'vynalize_last_server';
const SESSION_STORAGE_KEY = 'vynalize_last_session';

function App() {
  const serverUrl = useStore((s) => s.serverUrl);
  const sessionId = useStore((s) => s.sessionId);
  const connected = useStore((s) => s.connected);
  const setServerUrl = useStore((s) => s.setServerUrl);
  const setSessionId = useStore((s) => s.setSessionId);
  const disconnect = useStore((s) => s.disconnect);

  const { send, close } = useWebSocket(serverUrl, sessionId);

  const handleConnect = useCallback(
    (host: string, session?: string) => {
      setSessionId(session ?? null);
      setServerUrl(host);
    },
    [setServerUrl, setSessionId],
  );

  const handleDisconnect = useCallback(() => {
    close();
    disconnect();
    AsyncStorage.removeItem(STORAGE_KEY);
    AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  }, [close, disconnect]);

  const showRemote = serverUrl != null && connected;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {showRemote ? (
        <RemoteScreen send={send} onDisconnect={handleDisconnect} />
      ) : (
        <ConnectScreen onConnect={handleConnect} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
