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

interface Props {
  onConnect: (host: string) => void;
}

export default function ConnectScreen({ onConnect }: Props) {
  const insets = useSafeAreaInsets();
  const { servers, scanning, scan } = useDiscovery();
  const [manualIp, setManualIp] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-connect to last server on launch
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        handleConnect(saved);
      } else {
        scan();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect(host: string) {
    setConnecting(true);
    setError(null);

    // Probe health first
    try {
      const res = await fetch(`http://${host}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Not a Vynalize server');
    } catch {
      setConnecting(false);
      setError(`Can't reach server at ${host}`);
      scan();
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, host);
    setConnecting(false);
    onConnect(host);
  }

  function handleManualConnect() {
    const host = manualIp.trim();
    if (!host) return;
    // Add default port if not specified
    const withPort = host.includes(':') ? host : `${host}:3001`;
    handleConnect(withPort);
  }

  function handleServerPress(server: DiscoveredServer) {
    handleConnect(`${server.host}:${server.port}`);
  }

  if (connecting) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.connectingText}>Connecting...</Text>
      </View>
    );
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

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Discovered servers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>NEARBY SERVERS</Text>
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
            placeholderTextColor="rgba(255,255,255,0.2)"
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
    color: 'rgba(255,255,255,0.35)',
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
    color: 'rgba(255,255,255,0.3)',
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
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Menlo',
    marginTop: 2,
  },
  chevron: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 22,
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 14,
  },
  rescanBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  rescanText: {
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: '600',
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
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
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
  connectingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
});
