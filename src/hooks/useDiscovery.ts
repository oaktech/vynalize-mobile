import { useEffect, useRef, useState, useCallback } from 'react';
import Zeroconf from 'react-native-zeroconf';

export interface DiscoveredServer {
  name: string;
  host: string;
  port: number;
  addresses: string[];
}

async function probeHealth(host: string, port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://${host}:${port}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useDiscovery() {
  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [scanning, setScanning] = useState(false);
  const zeroconfRef = useRef<Zeroconf | null>(null);

  const scan = useCallback(() => {
    if (zeroconfRef.current) {
      zeroconfRef.current.stop();
    }

    const zc = new Zeroconf();
    zeroconfRef.current = zc;
    setServers([]);
    setScanning(true);

    zc.on('resolved', async (service: any) => {
      const addr = service.addresses?.[0];
      if (!addr) return;

      const server: DiscoveredServer = {
        name: service.name,
        host: addr,
        port: service.port,
        addresses: service.addresses,
      };

      // Probe to confirm it's a Vynalize server
      const isVynalize = await probeHealth(addr, service.port);
      if (isVynalize) {
        setServers((prev) => {
          if (prev.some((s) => s.host === addr && s.port === server.port)) return prev;
          return [...prev, server];
        });
      }
    });

    zc.on('error', () => {
      // Silently handle — manual entry is always available
    });

    // Scan for HTTP services (default _http._tcp)
    zc.scan('http', 'tcp', 'local.');

    // Stop after 10 seconds
    setTimeout(() => {
      setScanning(false);
      zc.stop();
    }, 10_000);
  }, []);

  useEffect(() => {
    return () => {
      zeroconfRef.current?.stop();
      zeroconfRef.current?.removeDeviceListeners();
      zeroconfRef.current = null;
    };
  }, []);

  return { servers, scanning, scan };
}
