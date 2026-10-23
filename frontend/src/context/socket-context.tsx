'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/auth-context';
import { refreshAccessToken, TOKEN_KEY } from '@/lib/api';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Errors the backend socket auth middleware rejects a handshake with.
const AUTH_ERRORS = new Set(['AUTH_INVALID_TOKEN', 'AUTH_TOKEN_REVOKED', 'AUTH_REQUIRED']);

interface SocketContextType {
  passengerSocket: Socket | null;
  driverSocket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({
  passengerSocket: null,
  driverSocket: null,
});

/**
 * Create a namespace socket whose handshake always reads the *current* access
 * token, so reconnects after a token refresh authenticate with the new token.
 * A handshake rejected by the auth middleware is not retried by socket.io, so on
 * an auth error we refresh the token once and reconnect manually.
 */
function createSocket(namespace: 'passenger' | 'driver'): Socket {
  const socket = io(`${SOCKET_URL}/${namespace}`, {
    auth: (cb) => cb({ token: localStorage.getItem(TOKEN_KEY) }),
    // The backend accepts only WebSocket in production (RedisIoAdapter); the
    // client default starts with HTTP long-polling, which the server rejects
    // with "Transport unknown", so the socket would never connect.
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
  });

  let refreshing = false;
  socket.on('connect_error', async (err) => {
    if (!AUTH_ERRORS.has(err.message) || refreshing) return;
    refreshing = true;
    const newToken = await refreshAccessToken();
    refreshing = false;
    if (newToken) socket.connect();
    else window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  });

  return socket;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, role, user } = useAuth();

  // Use state (not ref) so context consumers re-render when socket becomes available.
  const [passengerSocket, setPassengerSocket] = useState<Socket | null>(null);
  const [driverSocket, setDriverSocket] = useState<Socket | null>(null);

  // Which user the live sockets belong to — prevents double-creation in React
  // Strict Mode and recreates sockets when a different user logs in.
  const socketOwner = useRef<string | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !userId) {
      // Logged out — tear down any open sockets
      setPassengerSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setDriverSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      socketOwner.current = null;
      return;
    }

    const ownerKey = `${userId}:${role}`;
    if (socketOwner.current === ownerKey) return;
    socketOwner.current = ownerKey;

    // Connect the role-appropriate namespace once per user session.
    setPassengerSocket((prev) => {
      prev?.disconnect();
      return role === 'PASSENGER' ? createSocket('passenger') : null;
    });
    setDriverSocket((prev) => {
      prev?.disconnect();
      return role === 'DRIVER' ? createSocket('driver') : null;
    });
  }, [isAuthenticated, isLoading, role, userId]);

  return (
    <SocketContext.Provider value={{ passengerSocket, driverSocket }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
