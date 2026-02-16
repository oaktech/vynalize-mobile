declare module 'react-native-zeroconf' {
  interface ZeroconfService {
    name: string;
    host: string;
    port: number;
    addresses: string[];
    txt?: Record<string, string>;
  }

  export default class Zeroconf {
    constructor();
    on(event: 'resolved', cb: (service: ZeroconfService) => void): this;
    on(event: 'found', cb: (name: string) => void): this;
    on(event: 'remove', cb: (name: string) => void): this;
    on(event: 'start' | 'stop' | 'update', cb: () => void): this;
    on(event: 'error', cb: (err: Error) => void): this;
    on(event: string, cb: (...args: any[]) => void): this;
    scan(type?: string, protocol?: string, domain?: string): void;
    stop(): void;
    getServices(): Record<string, ZeroconfService>;
    removeDeviceListeners(): void;
    removeAllListeners(event?: string): this;
  }
}
