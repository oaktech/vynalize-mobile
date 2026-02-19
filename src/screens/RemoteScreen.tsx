import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import type { AppMode, VisualizerMode, WsCommand } from '../types';

const APP_MODES: { id: AppMode; label: string; icon: string }[] = [
  { id: 'visualizer', label: 'Visual', icon: '\u266B' },
  { id: 'lyrics', label: 'Lyrics', icon: '\u2261' },
  { id: 'video', label: 'Video', icon: '\u25B6' },
  { id: 'ascii', label: 'ASCII', icon: 'T' },
];

const VIZ_MODES: { id: VisualizerMode; label: string }[] = [
  { id: 'spectrum', label: 'Spectrum' },
  { id: 'radial', label: 'Radial' },
  { id: 'particles', label: 'Particles' },
  { id: 'radical', label: 'Radical' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'synthwave', label: 'Synthwave' },
  { id: 'spaceage', label: 'Space Age' },
  { id: 'starrynight', label: 'Starry Night' },
  { id: 'guitarhero', label: 'Guitar Hero' },
  { id: 'vynalize', label: 'Vynalize' },
];

const VIZ_COUNT = VIZ_MODES.length;
const VIZ_COPIES = 5;
const VIZ_MID = 2; // middle copy index (0-based)
const VIZ_RING = Array.from({ length: VIZ_COPIES }, () => VIZ_MODES).flat();

interface Props {
  send: (cmd: WsCommand) => void;
  onDisconnect: () => void;
}

export default function RemoteScreen({ send, onDisconnect }: Props) {
  const insets = useSafeAreaInsets();

  const currentSong = useStore((s) => s.currentSong);
  const bpm = useStore((s) => s.bpm);
  const appMode = useStore((s) => s.appMode);
  const visualizerMode = useStore((s) => s.visualizerMode);
  const accentColor = useStore((s) => s.accentColor);
  const sensitivityGain = useStore((s) => s.sensitivityGain);
  const connected = useStore((s) => s.connected);

  const slidingRef = useRef(false);

  const setAppMode = useCallback(
    (mode: AppMode) => send({ type: 'command', action: 'setAppMode', value: mode }),
    [send],
  );

  const setVisualizerMode = useCallback(
    (mode: VisualizerMode) => send({ type: 'command', action: 'setVisualizerMode', value: mode }),
    [send],
  );

  const cycleDirectionRef = useRef<'left' | 'right' | null>(null);

  const cyclePrev = useCallback(() => {
    const idx = VIZ_MODES.findIndex((m) => m.id === visualizerMode);
    const prev = VIZ_MODES[(idx - 1 + VIZ_COUNT) % VIZ_COUNT];
    cycleDirectionRef.current = 'left';
    setVisualizerMode(prev.id);
    if (appMode !== 'visualizer') setAppMode('visualizer');
  }, [visualizerMode, setVisualizerMode, appMode, setAppMode]);

  const cycleNext = useCallback(() => {
    const idx = VIZ_MODES.findIndex((m) => m.id === visualizerMode);
    const next = VIZ_MODES[(idx + 1) % VIZ_COUNT];
    cycleDirectionRef.current = 'right';
    setVisualizerMode(next.id);
    if (appMode !== 'visualizer') setAppMode('visualizer');
  }, [visualizerMode, setVisualizerMode, appMode, setAppMode]);

  const setSensitivity = useCallback(
    (v: number) => send({ type: 'command', action: 'adjustSensitivity', value: v }),
    [send],
  );

  const [syncFlash, setSyncFlash] = useState<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adjustVideoOffset = useCallback(
    (deltaMs: number) => {
      send({ type: 'command', action: 'adjustVideoOffset', value: deltaMs });
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      setSyncFlash(deltaMs < 0 ? '\u22120.2s' : '+0.2s');
      syncTimerRef.current = setTimeout(() => setSyncFlash(null), 700);
    },
    [send],
  );

  const vizScrollRef = useRef<ScrollView>(null);
  const vizChipXRef = useRef<number[]>([]);
  const didInitialScroll = useRef(false);
  const scrollXRef = useRef(0);
  const isResettingRef = useRef(false);

  const onVizChipLayout = useCallback((index: number, e: LayoutChangeEvent) => {
    vizChipXRef.current[index] = e.nativeEvent.layout.x;
  }, []);

  const scrollToChip = useCallback((index: number, animated: boolean) => {
    const x = vizChipXRef.current[index];
    if (x == null || !vizScrollRef.current) return;
    vizScrollRef.current.scrollTo({ x: Math.max(0, x - 80), animated });
  }, []);

  // Width of one full copy of chips (computed from layout positions)
  const oneSetWidthRef = useRef(0);

  // On first layout, jump to the middle copy (no animation)
  const onVizContentSizeChange = useCallback(() => {
    if (didInitialScroll.current) return;
    const first = vizChipXRef.current[0];
    const second = vizChipXRef.current[VIZ_COUNT];
    if (first == null || second == null) return;
    oneSetWidthRef.current = second - first;
    didInitialScroll.current = true;
    const modeIdx = VIZ_MODES.findIndex((m) => m.id === visualizerMode);
    scrollToChip(VIZ_MID * VIZ_COUNT + modeIdx, false);
  }, [visualizerMode, scrollToChip]);

  // When visualizerMode changes, scroll to the right copy for seamless wrapping
  useEffect(() => {
    if (!didInitialScroll.current) return;
    const modeIdx = VIZ_MODES.findIndex((m) => m.id === visualizerMode);
    const middleIdx = VIZ_MID * VIZ_COUNT + modeIdx;
    let targetIdx = middleIdx;

    const dir = cycleDirectionRef.current;
    cycleDirectionRef.current = null;

    if (dir === 'left' && modeIdx === VIZ_COUNT - 1) {
      targetIdx = (VIZ_MID - 1) * VIZ_COUNT + modeIdx; // copy before middle
    } else if (dir === 'right' && modeIdx === 0) {
      targetIdx = (VIZ_MID + 1) * VIZ_COUNT; // copy after middle
    }

    scrollToChip(targetIdx, true);

    // After wrap, silently reset to the middle copy
    if (targetIdx !== middleIdx) {
      isResettingRef.current = true;
      setTimeout(() => {
        scrollToChip(middleIdx, false);
        isResettingRef.current = false;
      }, 400);
    }
  }, [visualizerMode, scrollToChip]);

  // After any scroll ends, normalize position back into the middle copy
  const resetToMiddleCopy = useCallback(() => {
    if (isResettingRef.current) return;
    const w = oneSetWidthRef.current;
    if (!w) return;
    const x = scrollXRef.current;
    const midStart = VIZ_MID * w;
    const midEnd = (VIZ_MID + 1) * w;
    if (x >= midStart && x < midEnd) return; // already in middle copy
    // Shift by whole-copy increments to land back in the middle copy range
    const offset = ((x - midStart) % w + w) % w;
    vizScrollRef.current?.scrollTo({ x: midStart + offset, animated: false });
  }, []);

  const activeVizLabel =
    VIZ_MODES.find((m) => m.id === visualizerMode)?.label ?? visualizerMode;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* 1. Header */}
      <View style={styles.headerLogoRow}>
        <Image
          source={require('../assets/vynalize-logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.headerStatusRow}>
        <View />
        <View style={styles.headerRight}>
          {!connected && (
            <View style={styles.reconnectBadge}>
              <Text style={styles.reconnectText}>Reconnecting...</Text>
            </View>
          )}
          {bpm != null && (
            <View style={styles.bpmContainer}>
              <View style={[styles.bpmDot, { backgroundColor: accentColor }]} />
              <Text style={styles.bpmValue}>
                {bpm} <Text style={styles.bpmLabel}>BPM</Text>
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 2. Now Playing Hero */}
      <View
        style={[
          styles.nowPlaying,
          { borderTopColor: accentColor, backgroundColor: `${accentColor}08` },
        ]}
      >
        {currentSong ? (
          <View style={styles.songRow}>
            {currentSong.albumArtUrl ? (
              <Image source={{ uri: currentSong.albumArtUrl }} style={styles.albumArt} />
            ) : (
              <View style={styles.albumArtPlaceholder}>
                <Text style={styles.placeholderIcon}>{'\u266B'}</Text>
              </View>
            )}
            <View style={styles.songInfo}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {currentSong.title}
              </Text>
              <Text style={styles.songArtist} numberOfLines={1}>
                {currentSong.artist}
              </Text>
              {currentSong.album ? (
                <Text style={styles.songAlbum} numberOfLines={1}>
                  {currentSong.album}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.listeningContainer}>
            <Text style={styles.listeningText}>Listening...</Text>
          </View>
        )}
      </View>

      {/* Video Sync — rewind / fast-forward */}
      {appMode === 'video' && currentSong && (
        <View style={styles.syncRow}>
          <TouchableOpacity
            onPress={() => adjustVideoOffset(-200)}
            activeOpacity={0.6}
            style={[styles.syncButton, { backgroundColor: `${accentColor}14` }]}
          >
            <Text style={[styles.syncIcon, { color: accentColor }]}>{'\u2039\u2039'}</Text>
          </TouchableOpacity>
          <Text style={[styles.syncLabel, syncFlash != null && { color: accentColor }]}>
            {syncFlash ?? 'Video sync'}
          </Text>
          <TouchableOpacity
            onPress={() => adjustVideoOffset(200)}
            activeOpacity={0.6}
            style={[styles.syncButton, { backgroundColor: `${accentColor}14` }]}
          >
            <Text style={[styles.syncIcon, { color: accentColor }]}>{'\u203A\u203A'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Display Mode — Segmented Control */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Display mode</Text>
        <View style={styles.segmentedControl}>
          {APP_MODES.map((mode) => {
            const active = appMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setAppMode(mode.id)}
                activeOpacity={0.7}
                style={[
                  styles.segment,
                  active && { backgroundColor: accentColor },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? '#fff' : 'rgba(255,255,255,0.4)' },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. Visualizer Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Visualizer</Text>
        <View style={styles.vizNavRow}>
          <TouchableOpacity onPress={cyclePrev} activeOpacity={0.6} style={styles.vizArrow}>
            <Text style={styles.vizArrowText}>{'\u2039'}</Text>
          </TouchableOpacity>
          <Text style={styles.vizCurrentName}>{activeVizLabel}</Text>
          <TouchableOpacity onPress={cycleNext} activeOpacity={0.6} style={styles.vizArrow}>
            <Text style={styles.vizArrowText}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          ref={vizScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vizChipScroll}
          onContentSizeChange={onVizContentSizeChange}
          onScroll={(e) => { scrollXRef.current = e.nativeEvent.contentOffset.x; }}
          scrollEventThrottle={16}
          onMomentumScrollEnd={resetToMiddleCopy}
          onScrollEndDrag={resetToMiddleCopy}
        >
          {VIZ_RING.map((mode, i) => {
            const active = visualizerMode === mode.id;
            return (
              <TouchableOpacity
                key={`${i}-${mode.id}`}
                onLayout={(e) => onVizChipLayout(i, e)}
                onPress={() => {
                  setVisualizerMode(mode.id);
                  if (appMode !== 'visualizer') setAppMode('visualizer');
                }}
                activeOpacity={0.7}
                style={[
                  styles.vizChip,
                  active
                    ? { backgroundColor: accentColor }
                    : { backgroundColor: 'rgba(255,255,255,0.08)' },
                ]}
              >
                <Text
                  style={[
                    styles.vizChipText,
                    { color: active ? '#fff' : 'rgba(255,255,255,0.4)' },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Sensitivity Slider */}
      <View style={styles.section}>
        <View style={styles.sensitivityHeader}>
          <Text style={styles.sectionLabel}>Sensitivity</Text>
          <Text style={styles.sensitivityValue}>{sensitivityGain.toFixed(1)}x</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0.1}
          maximumValue={2.0}
          step={0.05}
          value={sensitivityGain}
          onSlidingStart={() => { slidingRef.current = true; }}
          onSlidingComplete={(v) => {
            slidingRef.current = false;
            setSensitivity(Math.round(v * 20) / 20);
          }}
          onValueChange={(v) => {
            if (slidingRef.current) {
              setSensitivity(Math.round(v * 20) / 20);
            }
          }}
          minimumTrackTintColor={accentColor}
          maximumTrackTintColor="rgba(255,255,255,0.08)"
          thumbTintColor={accentColor}
        />
      </View>

      {/* 6. Disconnect */}
      <TouchableOpacity onPress={onDisconnect} activeOpacity={0.5} style={styles.disconnectBtn}>
        <Text style={styles.disconnectText}>Disconnect</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  content: {
    paddingHorizontal: 24,
  },

  // 1. Header
  headerLogoRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLogo: {
    width: 320,
    height: 100,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reconnectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  reconnectText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  bpmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bpmDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bpmValue: {
    fontSize: 13,
    fontFamily: 'Menlo',
    color: 'rgba(255,255,255,0.5)',
  },
  bpmLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },

  // 2. Now Playing
  nowPlaying: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 3,
    padding: 16,
    marginBottom: 28,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  albumArt: {
    width: 88,
    height: 88,
    borderRadius: 16,
  },
  albumArtPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.2)',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  songArtist: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
  },
  songAlbum: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  listeningContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  listeningText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
  },

  // Shared section
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    marginBottom: 12,
  },

  // 3. Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 3,
    height: 44,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Video Sync
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: -14,
    marginBottom: 28,
  },
  syncButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncIcon: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '300',
  },
  syncLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
  },

  // 4. Visualizer Picker
  vizNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 14,
  },
  vizArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vizArrowText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '300',
  },
  vizCurrentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    minWidth: 100,
    textAlign: 'center',
  },
  vizChipScroll: {
    gap: 8,
    paddingRight: 24,
  },
  vizChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vizChipText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 5. Sensitivity
  sensitivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sensitivityValue: {
    fontSize: 13,
    fontFamily: 'Menlo',
    color: 'rgba(255,255,255,0.4)',
  },
  slider: {
    width: '100%',
    height: 44,
  },

  // 6. Disconnect
  disconnectBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  disconnectText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    fontWeight: '500',
  },
});
