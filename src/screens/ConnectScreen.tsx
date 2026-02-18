import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscovery, type DiscoveredServer } from '../hooks/useDiscovery';

const STORAGE_KEY = 'vynalize_last_server';
const SESSION_STORAGE_KEY = 'vynalize_last_session';
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CLOUD_HOST = 'vynalize.com';

function isLocalHost(host: string): boolean {
  return /^(\d|localhost)/i.test(host);
}

interface Props {
  onConnect: (host: string, sessionId?: string) => void;
}

export default function ConnectScreen({ onConnect }: Props) {
  const insets = useSafeAreaInsets();
  const { servers, scanning, scan } = useDiscovery();
  const [manualIp, setManualIp] = useState('');
  const [displayCode, setDisplayCode] = useState('');
  const [localMode, setLocalMode] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-connect to last server on launch
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(SESSION_STORAGE_KEY),
    ]).then(([savedHost, savedSession]) => {
      if (savedSession) setDisplayCode(savedSession);

      if (savedHost && savedSession) {
        // Have both host + session — reconnect immediately
        handleConnect(savedHost, savedSession);
      } else if (savedHost && isLocalHost(savedHost)) {
        // Local server doesn't require a display code
        setLocalMode(true);
        handleConnect(savedHost);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect(host: string, sessionId?: string) {
    setConnecting(true);
    setError(null);

    // Probe health first
    const httpScheme = /^(\d|localhost)/i.test(host) ? 'http' : 'https';
    try {
      const res = await fetch(`${httpScheme}://${host}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Not a Vynalize server');
    } catch {
      setConnecting(false);
      setDisplayCode('');
      setError(`Can't reach server at ${host}`);
      if (isLocalHost(host)) scan();
      return;
    }

    // Validate session code via a probe WS before navigating.
    // Server behavior: invalid session → sends {type:'error'} then closes with 4001.
    // Valid session → stays open, may send cached state.
    if (sessionId) {
      const wsScheme = isLocalHost(host) ? 'ws' : 'wss';
      const valid = await new Promise<boolean>((resolve) => {
        let settled = false;
        const ws = new WebSocket(
          `${wsScheme}://${host}/ws?role=controller&session=${sessionId}`,
        );
        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            ws.close();
            resolve(true); // WS stayed open with no error → session valid
          }
        }, 1500);
        ws.onmessage = (e: MessageEvent) => {
          if (settled) return;
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'error') {
              settled = true;
              clearTimeout(timeout);
              ws.close();
              resolve(false); // Server rejected session
              return;
            }
          } catch {}
          // Non-error message → session valid with cached state
          settled = true;
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };
        ws.onclose = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve(false); // Connection closed unexpectedly
          }
        };
        ws.onerror = () => {
          // onclose will also fire
        };
      });

      if (!valid) {
        setConnecting(false);
        setDisplayCode('');
        setError('Invalid code — try again');
        // Clear persisted session so it doesn't auto-retry on next launch
        AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY, host);
    if (sessionId) {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    setConnecting(false);
    onConnect(host, sessionId);
  }

  function getSessionId(): string | undefined {
    const code = displayCode.trim();
    return code.length > 0 ? code : undefined;
  }

  function handleManualConnect() {
    const host = manualIp.trim();
    if (!host) return;
    // Add default port if not specified
    const withPort = host.includes(':') ? host : `${host}:3001`;
    handleConnect(withPort, getSessionId());
  }

  function handleServerPress(server: DiscoveredServer) {
    handleConnect(`${server.host}:${server.port}`, getSessionId());
  }

  function toggleLocalMode() {
    const entering = !localMode;
    setLocalMode(entering);
    if (entering) scan();
  }

  function handleDisplayCodeChange(text: string) {
    const filtered = text
      .toUpperCase()
      .split('')
      .filter((ch) => CODE_CHARSET.includes(ch))
      .join('')
      .slice(0, 6);
    setDisplayCode(filtered);
    if (filtered.length === 6 && !connecting) {
      handleConnect(CLOUD_HOST, filtered);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../assets/vynalize-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Remote Control</Text>
      </View>

      {/* Display code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VYNALIZE.COM CODE</Text>
        <TextInput
          style={[styles.codeInput, connecting && styles.codeInputDisabled]}
          value={displayCode}
          onChangeText={handleDisplayCodeChange}
          placeholder="ENTER CODE"
          placeholderTextColor="rgba(255,255,255,0.45)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          editable={!connecting}
        />
        {connecting && (
          <View style={styles.inlineSpinner}>
            <ActivityIndicator size="small" color="#8b5cf6" />
            <Text style={styles.inlineSpinnerText}>Verifying...</Text>
          </View>
        )}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Local mode toggle */}
      <TouchableOpacity
        style={styles.localToggle}
        onPress={toggleLocalMode}
        activeOpacity={0.7}
      >
        <Text style={styles.localToggleText}>
          {localMode ? 'Use cloud server' : 'Connect to local server'}
        </Text>
      </TouchableOpacity>

      {localMode && (
        <>
          {/* Discovered servers */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>LOCAL SERVERS</Text>
              {scanning && <ActivityIndicator size="small" color="#8b5cf6" />}
            </View>

            {servers.length > 0 ? (
              <FlatList
                data={servers}
                keyExtractor={(item) => `${item.host}:${item.port}`}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.serverCard}
                    onPress={() => handleServerPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.serverDot} />
                    <View style={styles.serverInfo}>
                      <Text style={styles.serverName}>{item.name}</Text>
                      <Text style={styles.serverAddr}>{item.host}:{item.port}</Text>
                    </View>
                    <Text style={styles.chevron}>{'\u203A'}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {scanning ? 'Scanning local network...' : 'No servers found'}
                </Text>
                {!scanning && (
                  <TouchableOpacity onPress={scan} style={styles.rescanBtn}>
                    <Text style={styles.rescanText}>Scan Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Manual entry */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MANUAL CONNECTION</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.input}
                value={manualIp}
                onChangeText={setManualIp}
                placeholder="192.168.1.100:3001"
                placeholderTextColor="rgba(255,255,255,0.45)"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleManualConnect}
              />
              <TouchableOpacity
                style={[styles.connectBtn, !manualIp.trim() && styles.connectBtnDisabled]}
                onPress={handleManualConnect}
                disabled={!manualIp.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.connectBtnText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 72,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  logo: {
    width: 340,
    height: 200,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 12,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  serverAddr: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Menlo',
    marginTop: 2,
  },
  chevron: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 22,
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  rescanBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.3)',
  },
  rescanText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  localToggle: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  localToggleText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '500',
  },
  codeInput: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Menlo',
    textAlign: 'center',
    letterSpacing: 8,
    paddingHorizontal: 16,
  },
  codeInputDisabled: {
    opacity: 0.5,
  },
  inlineSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  inlineSpinnerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Menlo',
  },
  connectBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnDisabled: {
    opacity: 0.4,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
