// Socket.io client configuration
// Singleton pattern - one connection shared across all components

import { io } from 'socket.io-client';
import { API_URL } from './api';

// Create socket with optimized settings for Fly.io deployment
const socket = io(API_URL, {
  // WebSocket first to avoid sticky session issues on load balancers
  transports: ['websocket', 'polling'],
  // Reconnection settings
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  // Timeout settings
  timeout: 20000,
  // Auto connect
  autoConnect: true,
});

// Connection event logging (development only)
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/80c0a9e4-2eba-4c84-9403-d1deac15aad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'socket.js:connect',message:'Socket connected',data:{socketId:socket.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/80c0a9e4-2eba-4c84-9403-d1deac15aad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'socket.js:disconnect',message:'Socket disconnected',data:{reason},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/80c0a9e4-2eba-4c84-9403-d1deac15aad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'socket.js:connect_error',message:'Socket connection error',data:{message:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  });
}

export default socket;
