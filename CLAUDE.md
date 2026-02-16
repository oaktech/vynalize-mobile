# Vynalize Mobile

React Native remote control app for the Vynalize audio visualizer.

## Tech stack

- React Native 0.84 (New Architecture enabled)
- TypeScript
- Zustand for state management
- WebSocket for real-time communication with the Vynalize server

## Project structure

- `App.tsx` — Root component, conditional render of ConnectScreen vs RemoteScreen
- `src/types.ts` — Shared types (AppMode, VisualizerMode, SongInfo, WS messages)
- `src/store.ts` — Zustand store synced via WebSocket
- `src/hooks/useWebSocket.ts` — Controller-role WebSocket with auto-reconnect
- `src/hooks/useDiscovery.ts` — Bonjour/mDNS discovery via react-native-zeroconf
- `src/screens/ConnectScreen.tsx` — Server discovery + manual IP entry
- `src/screens/RemoteScreen.tsx` — Main remote control UI

## Related codebase

The web app lives at `../vinyl-visions`. Types in `src/types.ts` are copied from `vinyl-visions/packages/web/src/types.ts` — keep them in sync when the protocol changes.

The WebSocket server is at `vinyl-visions/packages/server/src/wsRelay.ts`. No server changes are needed for the mobile app.

## Commands

```sh
npm start          # Start Metro bundler
npm run ios        # Build and run on iOS simulator
npm run android    # Build and run on Android emulator
npx tsc --noEmit   # Type check
```

## Conventions

- Dark theme throughout (black background, white text, accent color from server)
- Default accent color: `#8b5cf6`
- Auto-reconnect on WebSocket disconnect after 3 seconds
- Persist last server address via AsyncStorage for auto-connect on launch
