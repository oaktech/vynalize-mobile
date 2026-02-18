import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import type { WsCommand, WsMessage } from '../types';

export function useWebSocket(serverUrl: string | null, sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalClose = useRef(false);

  const setConnected = useStore((s) => s.setConnected);
  const setVisualizerMode = useStore((s) => s.setVisualizerMode);
  const setAppMode = useStore((s) => s.setAppMode);
  const setAccentColor = useStore((s) => s.setAccentColor);
  const setSensitivityGain = useStore((s) => s.setSensitivityGain);
  const setCurrentSong = useStore((s) => s.setCurrentSong);
  const setBpm = useStore((s) => s.setBpm);

  useEffect(() => {
    if (!serverUrl) return;
    intentionalClose.current = false;

    function connect() {
      const scheme = /^(\d|localhost)/i.test(serverUrl!) ? 'ws' : 'wss';
      let wsUrl = `${scheme}://${serverUrl}/ws?role=controller`;
      if (sessionId) {
        wsUrl += `&session=${sessionId}`;
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (e) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }

        if (msg.type === 'state') {
          setVisualizerMode(msg.data.visualizerMode);
          setAppMode(msg.data.appMode);
          setAccentColor(msg.data.accentColor);
          setSensitivityGain(msg.data.sensitivityGain);
        } else if (msg.type === 'song') {
          setCurrentSong(msg.data);
        } else if (msg.type === 'beat') {
          setBpm(msg.bpm);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setConnected(false);
        if (!intentionalClose.current) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    }

    connect();

    return () => {
      intentionalClose.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [serverUrl, sessionId, setConnected, setVisualizerMode, setAppMode, setAccentColor, setSensitivityGain, setCurrentSong, setBpm]);

  const send = useCallback((cmd: WsCommand) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(cmd));
    }
  }, []);

  const close = useCallback(() => {
    intentionalClose.current = true;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, [setConnected]);

  return { send, close };
}
