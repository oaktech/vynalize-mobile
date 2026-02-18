export interface SongInfo {
  title: string;
  artist: string;
  album: string;
  duration: number;
  albumArtUrl: string | null;
  musicbrainzId: string | null;
  bpm: number | null;
}

export type VisualizerMode =
  | 'spectrum'
  | 'radial'
  | 'particles'
  | 'radical'
  | 'nebula'
  | 'vitals'
  | 'synthwave'
  | 'spaceage'
  | 'starrynight'
  | 'guitarhero';

export type AppMode = 'visualizer' | 'lyrics' | 'video' | 'ascii';

export type WsCommand =
  | { type: 'command'; action: 'setVisualizerMode'; value: VisualizerMode }
  | { type: 'command'; action: 'setAppMode'; value: AppMode }
  | { type: 'command'; action: 'setAccentColor'; value: string }
  | { type: 'command'; action: 'adjustSensitivity'; value: number }
  | { type: 'command'; action: 'nextVisualizer' }
  | { type: 'command'; action: 'prevVisualizer' }
  | { type: 'command'; action: 'adjustVideoOffset'; value: number };

export interface WsStateMessage {
  type: 'state';
  data: {
    visualizerMode: VisualizerMode;
    appMode: AppMode;
    accentColor: string;
    sensitivityGain: number;
  };
}

export interface WsSongMessage {
  type: 'song';
  data: SongInfo | null;
}

export interface WsBeatMessage {
  type: 'beat';
  bpm: number | null;
}

export type WsMessage = WsCommand | WsStateMessage | WsSongMessage | WsBeatMessage;
