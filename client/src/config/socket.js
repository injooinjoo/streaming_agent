// Socket.io client configuration
// Singleton pattern - one connection shared across all components

import { io } from 'socket.io-client';
import { API_URL, USE_MOCK_DATA } from './api';

// Create socket with optimized settings for Fly.io deployment
const socket = io(API_URL, {
  // WebSocket first to avoid sticky session issues on load balancers
  transports: ['websocket', 'polling'],
  // Reconnection settings
  reconnection: !USE_MOCK_DATA,
  reconnectionAttempts: USE_MOCK_DATA ? 0 : 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  // Timeout settings
  timeout: 20000,
  // Auto connect
  autoConnect: !USE_MOCK_DATA,
});

// Connection event logging (development only)
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });
}

export default socket;
