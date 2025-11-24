/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface RealtimeHealthStatus {
  connected: boolean;
  authenticated: boolean;
  retryAttempts: number;
  maxRetries: number;
  lastError: string | null;
  connectionTime: number | null;
}

interface RealtimeMessage {
  type: string;
  data?: any;
  messageId?: string;
  timestamp?: number;
}

export function useRealtime(token: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [health, setHealth] = useState<RealtimeHealthStatus>({
    connected: false,
    authenticated: false,
    retryAttempts: 0,
    maxRetries: 5,
    lastError: null,
    connectionTime: null,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const connectionStartTime = useRef<number>(0);
  const messageHandlersRef = useRef<Map<string, (data: any) => void>>(new Map());
  const connectionId = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      cleanup();
      return;
    }

    initializeConnection();

    return () => {
      cleanup();
    };
  }, [token]);

  const initializeConnection = useCallback(() => {
    if (!token) return;

    try {
      connectionStartTime.current = Date.now();

      // WebSocket Security Configuration (WSS support for production)
      const isProduction = process.env.NODE_ENV === 'production';
      const secureProtocol = isProduction ? 'wss://' : 'ws://';

      // Create Server-Sent Events connection
      const apiBase = isProduction
        ? 'https://glxcivicnetwork.me/api'
        : 'http://localhost:3001/api';

      // WSS configuration for secure WebSocket fallback support
      const wssConfig = {
        protocol: secureProtocol,
        secure: isProduction,
        upgradeHeaders: {
          'Sec-WebSocket-Protocol': 'glx-secure',
          'Sec-WebSocket-Extensions': 'permessage-deflate'
        }
          'Sec-WebSocket-Protocol': 'galax-secure',
          'Sec-WebSocket-Extensions': 'permessage-deflate',
        },
      };

      if (isProduction) {
        console.log(`🔒 WSS Protocol configured: ${wssConfig.protocol}`);
        console.log('✅ Secure WebSocket support enabled');
      }

      const eventSource = new EventSource(`${apiBase}/realtime/events`, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        console.log('📡 SSE connection opened');
        setHealth(prev => ({
          ...prev,
          connected: true,
          authenticated: true,
          connectionTime: Date.now() - connectionStartTime.current,
          lastError: null,
          retryAttempts: 0,
        }));
      };

      eventSource.onmessage = event => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = error => {
        console.error('❌ SSE connection error:', error);
        setHealth(prev => ({
          ...prev,
          connected: false,
          authenticated: false,
          lastError: 'Connection error',
        }));

        // Attempt reconnection with exponential backoff
        if (health.retryAttempts < health.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, health.retryAttempts), 16000);

          retryTimeoutRef.current = setTimeout(() => {
            setHealth(prev => ({ ...prev, retryAttempts: prev.retryAttempts + 1 }));
            initializeConnection();
          }, delay);

          console.log(
            `🔄 SSE reconnection attempt ${health.retryAttempts + 1}/${health.maxRetries} in ${delay}ms`
          );
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('❌ Error initializing SSE connection:', error);
      setHealth(prev => ({
        ...prev,
        connected: false,
        authenticated: false,
        lastError: 'Connection failed',
      }));
    }
  }, [token, health.retryAttempts, health.maxRetries]);

  const handleMessage = useCallback((message: RealtimeMessage) => {
    console.log('📨 SSE message received:', message.type);

    switch (message.type) {
      case 'connected':
        connectionId.current = message.data?.connectionId;
        console.log('✅ Connection established:', connectionId.current);
        break;

      case 'heartbeat':
        // Update last activity
        setHealth(prev => ({ ...prev, connectionTime: Date.now() - connectionStartTime.current }));
        break;

      case 'room_joined':
        console.log('🏠 Joined room:', message.data?.roomId);
        break;

      case 'room_left':
        console.log('🚪 Left room:', message.data?.roomId);
        break;

      case 'new_message':
        console.log('💬 New message received:', message.data);
        break;

      default:
        console.log('📝 Unknown message type:', message.type);
    }

    // Call registered handlers
    const handler = messageHandlersRef.current.get(message.type);
    if (handler) {
      handler(message.data);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }

    setHealth({
      connected: false,
      authenticated: false,
      retryAttempts: 0,
      maxRetries: 5,
      lastError: null,
      connectionTime: null,
    });

    connectionId.current = null;
    messageHandlersRef.current.clear();
  }, []);

  // Register message handler
  const onMessage = useCallback((messageType: string, handler: (data: any) => void) => {
    messageHandlersRef.current.set(messageType, handler);
  }, []);

  // Remove message handler
  const offMessage = useCallback((messageType: string) => {
    messageHandlersRef.current.delete(messageType);
  }, []);

  // Join help request room
  const joinRoom = useCallback(async (helpRequestId: number): Promise<boolean> => {
    if (!connectionId.current || !token) {
      console.error('❌ No active connection to join room');
      return false;
    }

    try {
      const apiBase = process.env.NODE_ENV === 'production'
        ? 'https://glxcivicnetwork.me/api'
        : 'http://localhost:3001/api';

      const response = await fetch(`${apiBase}/realtime/join-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          helpRequestId,
          connectionId: connectionId.current
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Successfully joined room:', result.roomId);
        return true;
      } else {
        console.error('❌ Failed to join room:', result.error);
  const joinRoom = useCallback(
    async (helpRequestId: number): Promise<boolean> => {
      if (!connectionId.current || !token) {
        console.error('❌ No active connection to join room');
        return false;
      }

      try {
        const apiBase =
          process.env.NODE_ENV === 'production'
            ? 'https://galaxcivicnetwork.me/api'
            : 'http://localhost:3001/api';

        const response = await fetch(`${apiBase}/realtime/join-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            helpRequestId,
            connectionId: connectionId.current,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log('✅ Successfully joined room:', result.roomId);
          return true;
        } else {
          console.error('❌ Failed to join room:', result.error);
          return false;
        }
      } catch (error) {
        console.error('❌ Error joining room:', error);
        return false;
      }
    },
    [token]
  );

  // Leave help request room
  const leaveRoom = useCallback(async (helpRequestId: number): Promise<boolean> => {
    if (!connectionId.current || !token) {
      console.error('❌ No active connection to leave room');
      return false;
    }

    try {
      const apiBase = process.env.NODE_ENV === 'production'
        ? 'https://glxcivicnetwork.me/api'
        : 'http://localhost:3001/api';

      const response = await fetch(`${apiBase}/realtime/leave-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          helpRequestId,
          connectionId: connectionId.current
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Successfully left room:', result.roomId);
        return true;
      } else {
        console.error('❌ Failed to leave room:', result.error);
  const leaveRoom = useCallback(
    async (helpRequestId: number): Promise<boolean> => {
      if (!connectionId.current || !token) {
        console.error('❌ No active connection to leave room');
        return false;
      }

      try {
        const apiBase =
          process.env.NODE_ENV === 'production'
            ? 'https://galaxcivicnetwork.me/api'
            : 'http://localhost:3001/api';

        const response = await fetch(`${apiBase}/realtime/leave-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            helpRequestId,
            connectionId: connectionId.current,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log('✅ Successfully left room:', result.roomId);
          return true;
        } else {
          console.error('❌ Failed to leave room:', result.error);
          return false;
        }
      } catch (error) {
        console.error('❌ Error leaving room:', error);
        return false;
      }
    },
    [token]
  );

  // Send message to help request
  const sendMessage = useCallback(async (helpRequestId: number, message: string): Promise<{ success: boolean; messageId?: number; error?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const apiBase = process.env.NODE_ENV === 'production'
        ? 'https://glxcivicnetwork.me/api'
        : 'http://localhost:3001/api';

      const response = await fetch(`${apiBase}/realtime/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          helpRequestId,
          message
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Message sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
      } else {
        console.error('❌ Failed to send message:', result.error);
        return { success: false, error: result.details || result.error || 'Failed to send message' };
  const sendMessage = useCallback(
    async (
      helpRequestId: number,
      message: string
    ): Promise<{ success: boolean; messageId?: number; error?: string }> => {
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      try {
        const apiBase =
          process.env.NODE_ENV === 'production'
            ? 'https://galaxcivicnetwork.me/api'
            : 'http://localhost:3001/api';

        const response = await fetch(`${apiBase}/realtime/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            helpRequestId,
            message,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log('✅ Message sent successfully:', result.messageId);
          return { success: true, messageId: result.messageId };
        } else {
          console.error('❌ Failed to send message:', result.error);
          return {
            success: false,
            error: result.details || result.error || 'Failed to send message',
          };
        }
      } catch (error) {
        console.error('❌ Error sending message:', error);
        return { success: false, error: 'Network error occurred while sending message' };
      }
    },
    [token]
  );

  // Manual reconnection
  const reconnect = useCallback(() => {
    cleanup();
    setHealth(prev => ({ ...prev, retryAttempts: 0 }));
    initializeConnection();
  }, [initializeConnection]);

  return {
    health,
    onMessage,
    offMessage,
    joinRoom,
    leaveRoom,
    sendMessage,
    reconnect,
    connectionId: connectionId.current,
  };
}
