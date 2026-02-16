import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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
  { id: 'waveform', label: 'Waveform' },
  { id: 'radial', label: 'Radial' },
  { id: 'particles', label: 'Particles' },
  { id: 'geometric', label: 'Geometry' },
  { id: 'radical', label: 'Radical' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'synthwave', label: 'Synthwave' },
  { id: 'spaceage', label: 'Space Age' },
  { id: 'starrynight', label: 'Starry Night' },
];

interface Props {
  send: (cmd: WsCommand) => void;
  onDisconnect: () => void;
}

export default function RemoteScreen({ send, onDisconnect }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const vizBtnWidth = (screenWidth - 40 - 16) / 3; // 40px padding, 2×8px gap

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

  const cyclePrev = useCallback(
    () => send({ type: 'command', action: 'prevVisualizer' }),
    [send],
  );

  const cycleNext = useCallback(
    () => send({ type: 'command', action: 'nextVisualizer' }),
    [send],
  );

  const setSensitivity = useCallback(
    (v: number) => send({ type: 'command', action: 'adjustSensitivity', value: v }),
    [send],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* Header */}
      <View style={styles.headerLogoRow}>
        <Image
          source={require('../assets/vynalize-logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Remote</Text>
        </View>
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

      {/* Now Playing */}
      <View style={styles.nowPlaying}>
        {currentSong ? (
          <View style={styles.songRow}>
            {currentSong.albumArtUrl ? (
              <Image source={{ uri: currentSong.albumArtUrl }} style={styles.albumArt} />
            ) : (
              <View style={styles.albumArtPlaceholder}>
                <Text style={styles.placeholderIcon}>{'\u25CB'}</Text>
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
          <View style={styles.songRow}>
            <View style={[styles.albumArtPlaceholder, { opacity: 0.5 }]}>
              <Text style={[styles.placeholderIcon, { opacity: 0.4 }]}>{'\u25CB'}</Text>
            </View>
            <View>
              <Text style={styles.waitingText}>Waiting for music...</Text>
              <Text style={styles.waitingHint}>Play a record on the connected display</Text>
            </View>
          </View>
        )}
      </View>

      {/* App Mode Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DISPLAY MODE</Text>
        <View style={styles.modeGrid}>
          {APP_MODES.map((mode) => {
            const active = appMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setAppMode(mode.id)}
                activeOpacity={0.7}
                style={[
                  styles.modeBtn,
                  {
                    borderColor: active ? `${accentColor}55` : 'rgba(255,255,255,0.06)',
                    backgroundColor: active ? `${accentColor}18` : 'rgba(255,255,255,0.02)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeIcon,
                    { color: active ? accentColor : 'rgba(255,255,255,0.4)' },
                  ]}
                >
                  {mode.icon}
                </Text>
                <Text
                  style={[
                    styles.modeLabel,
                    { color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)' },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Visualizer Modes */}
      <View style={styles.section}>
        <View style={styles.vizHeader}>
          <Text style={styles.sectionLabel}>VISUALIZER</Text>
          <View style={styles.cycleButtons}>
            <TouchableOpacity onPress={cyclePrev} activeOpacity={0.6} style={styles.cycleBtn}>
              <Text style={styles.cycleBtnText}>{'\u2039'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cycleNext} activeOpacity={0.6} style={styles.cycleBtn}>
              <Text style={styles.cycleBtnText}>{'\u203A'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.vizGrid}>
          {VIZ_MODES.map((mode) => {
            const active = visualizerMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setVisualizerMode(mode.id)}
                activeOpacity={0.7}
                style={[
                  styles.vizBtn,
                  {
                    width: vizBtnWidth,
                    borderColor: active ? `${accentColor}55` : 'rgba(255,255,255,0.06)',
                    backgroundColor: active ? `${accentColor}18` : 'rgba(255,255,255,0.02)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.vizLabel,
                    { color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)' },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Sensitivity */}
      <View style={styles.section}>
        <View style={styles.sensitivityHeader}>
          <Text style={styles.sectionLabel}>SENSITIVITY</Text>
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
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>Line-in</Text>
          <Text style={styles.sliderLabel}>Mic</Text>
          <Text style={styles.sliderLabel}>Boost</Text>
        </View>
      </View>

      {/* Disconnect + Footer */}
      <TouchableOpacity onPress={onDisconnect} activeOpacity={0.7} style={styles.disconnectBtn}>
        <Text style={styles.disconnectText}>Disconnect</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Vynalize Remote v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLogoRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLogo: {
    width: 260,
    height: 80,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
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
  nowPlaying: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    marginBottom: 28,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  albumArt: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  albumArtPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.25)',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  songArtist: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  songAlbum: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  waitingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.25)',
  },
  waitingHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.15)',
    marginTop: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeIcon: {
    fontSize: 18,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  vizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  cycleButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  cycleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
  },
  vizGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vizBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  vizLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sensitivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  sensitivityValue: {
    fontSize: 13,
    fontFamily: 'Menlo',
    color: 'rgba(255,255,255,0.4)',
  },
  slider: {
    width: '100%',
    height: 48,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: -4,
  },
  sliderLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
  },
  disconnectBtn: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 16,
  },
  disconnectText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 10,
    color: 'rgba(255,255,255,0.15)',
    paddingBottom: 8,
  },
});
