import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getBackendUrl = (): string => {
  if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port === '3000') return `${window.location.protocol}//${window.location.hostname}:5000`;
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const initSocket = (): Socket | null => {
  if (socket?.connected) return socket;
  const backendUrl = getBackendUrl();
  socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => {
    console.log('🔔 Socket connecté', socket?.id, '->', backendUrl);
  });
  socket.on('disconnect', (reason: string) => {
    console.log('🔕 Socket déconnecté', reason);
  });
  socket.on('connect_error', (err: Error) => {
    console.warn('⚠️ Erreur connexion socket:', err.message);
  });
  return socket;
};

export const on = (event: string, cb: (...args: unknown[]) => void): void => {
  socket?.on(event, cb);
};
export const off = (event: string, cb?: (...args: unknown[]) => void): void => {
  if (cb) socket?.off(event, cb);
  else socket?.off(event);
};
export const emit = (event: string, payload?: unknown): void => {
  socket?.emit(event, payload);
};
export const getSocket = (): Socket | null => socket;
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
