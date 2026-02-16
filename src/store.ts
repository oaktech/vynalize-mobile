import { create } from 'zustand';
import type { AppMode, VisualizerMode, SongInfo } from './types';

export interface AppState {
  connected: boolean;
  serverUrl: string | null;
  currentSong: SongInfo | null;
  appMode: AppMode;
  visualizerMode: VisualizerMode;
  accentColor: string;
  sensitivityGain: number;
  bpm: number | null;

  setConnected: (connected: boolean) => void;
  setServerUrl: (url: string | null) => void;
  setCurrentSong: (song: SongInfo | null) => void;
  setAppMode: (mode: AppMode) => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  setAccentColor: (color: string) => void;
  setSensitivityGain: (gain: number) => void;
  setBpm: (bpm: number | null) => void;
  disconnect: () => void;
}

export const useStore = create<AppState>((set) => ({
  connected: false,
  serverUrl: null,
  currentSong: null,
  appMode: 'visualizer',
  visualizerMode: 'spectrum',
  accentColor: '#8b5cf6',
  sensitivityGain: 1.0,
  bpm: null,

  setConnected: (connected) => set({ connected }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setCurrentSong: (currentSong) => set({ currentSong }),
  setAppMode: (appMode) => set({ appMode }),
  setVisualizerMode: (visualizerMode) => set({ visualizerMode }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setSensitivityGain: (sensitivityGain) => set({ sensitivityGain }),
  setBpm: (bpm) => set({ bpm }),
  disconnect: () => set({ connected: false, serverUrl: null, currentSong: null, bpm: null }),
}));
