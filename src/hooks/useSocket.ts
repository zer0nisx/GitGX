'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io({
        path: '/socket.io',
      });

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('[Socket] Connected');
        // Initialize API
        fetch('/api/init').catch(console.error);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('[Socket] Disconnected');
      });
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, []);

  return { socket, isConnected };
}

export function getSocket(): Socket | null {
  return socket;
}
