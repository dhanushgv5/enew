import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const SOCKET_ORIGIN = API_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

// Lazily creates (or reuses) a single socket connection authenticated with
// the current access token. Call this after login/hydration, once a token
// exists - the gateway disconnects unauthenticated sockets immediately.
export function getSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(`${SOCKET_ORIGIN}/realtime`, {
      auth: { token },
      withCredentials: true,
      autoConnect: false,
    });
  } else {
    // Token may have rotated since the socket was created (e.g. refresh) -
    // update it before reconnecting.
    socket.auth = { token };
  }

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}