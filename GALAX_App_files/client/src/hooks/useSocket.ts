/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Pusher from 'pusher-js';

interface ConnectionHealthStatus {
  connected: boolean;
  authenticated: boolean;
  retryAttempts: number;
  maxRetries: number;
  lastError: string | null;
  connectionTime: number | null;
  pusherState: string;
}

interface Message {
  id: string;
  content: string;
  userId: number;
  username: string;
  timestamp: string;
  type: 'chat' | 'system';
}

interface NotificationData {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

// Pusher-based real-time system to replace WebSocket functionality
export function useSocket(token: string | null) {
  const [health, setHealth] = useState<ConnectionHealthStatus>({
    connected: false,
    authenticated: false,
    retryAttempts: 0,
    maxRetries: 5,
    lastError: null,
    connectionTime: null,
    pusherState: 'disconnected'
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  
  const pusherRef = useRef<Pusher | null>(null);
  const channelsRef = useRef<{ [key: string]: any }>({});
  const connectionStartTime = useRef<number>(0);

  const baseUrl = process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:3001/api';

  useEffect(() => {
    if (!token) {
      cleanup();
      return;
    }

    initializePusher();

    return () => {
      cleanup();
    };
  }, [token]);

  const initializePusher = () => {
    connectionStartTime.current = Date.now();
    console.log('🔌 Initializing Pusher connection...');
    
    // Initialize Pusher with configuration
    pusherRef.current = new Pusher(process.env.REACT_APP_PUSHER_KEY || 'your-pusher-key', {
      cluster: process.env.REACT_APP_PUSHER_CLUSTER || 'us2',
      authEndpoint: `${baseUrl}/pusher/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    setupPusherEventListeners();
  };

  const setupPusherEventListeners = () => {
    if (!pusherRef.current) return;

    const pusher = pusherRef.current;

    // Connection state listeners
    pusher.connection.bind('connected', () => {
      console.log('✅ Pusher connected');
      setHealth(prev => ({
        ...prev,
        connected: true,
        authenticated: true,
        lastError: null,
        connectionTime: Date.now() - connectionStartTime.current,
        retryAttempts: 0,
        pusherState: 'connected'
      }));
    });

    pusher.connection.bind('disconnected', () => {
      console.log('❌ Pusher disconnected');
      setHealth(prev => ({
        ...prev,
        connected: false,
        pusherState: 'disconnected'
      }));
    });

    pusher.connection.bind('error', (error: any) => {
      console.error('❌ Pusher connection error:', error);
      setHealth(prev => ({
        ...prev,
        connected: false,
        lastError: error.message || 'Connection error',
        pusherState: 'error'
      }));
      handleReconnection();
    });

    pusher.connection.bind('state_change', (states: any) => {
      console.log('🔄 Pusher state change:', states.previous, '->', states.current);
      setHealth(prev => ({
        ...prev,
        pusherState: states.current
      }));
    });

    // Subscribe to global notifications channel
    subscribeToNotifications();
  };

  const subscribeToNotifications = () => {
    if (!pusherRef.current || !token) return;

    const notificationChannel = pusherRef.current.subscribe(`private-user-notifications`);
    
    notificationChannel.bind('new-notification', (data: NotificationData) => {
      console.log('📢 New notification received:', data);
      setNotifications(prev => [...prev, data].slice(-50)); // Keep last 50 notifications
    });

    channelsRef.current['notifications'] = notificationChannel;
  };

  const sendMessage = useCallback(async (content: string, roomId?: string) => {
    try {
      const response = await fetch(`${baseUrl}/chat/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, roomId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Message sent via Pusher:', data.messageId);
      
      // No need to poll - Pusher will deliver the message in real-time
      return data;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }, [token, baseUrl]);

  const joinRoom = useCallback(async (roomId: string) => {
    try {
      // Subscribe to the room's Pusher channel
      if (pusherRef.current && !channelsRef.current[roomId]) {
        const channel = pusherRef.current.subscribe(`private-help-request-${roomId}`);
        
        channel.bind('new-message', (data: Message) => {
          console.log('📨 New message received:', data);
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            if (!existingIds.has(data.id)) {
              return [...prev, data];
            }
            return prev;
          });
        });

        channel.bind('user-joined', (data: any) => {
          console.log('👋 User joined room:', data);
        });

        channel.bind('user-left', (data: any) => {
          console.log('👋 User left room:', data);
        });

        channelsRef.current[roomId] = channel;
      }

      // Also call the API to join the room on the backend
      const response = await fetch(`${baseUrl}/chat/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('🏠 Joined room via Pusher:', roomId);
      
      // Reset messages for this room and get initial messages
      setMessages([]);
      await loadRoomMessages(roomId);
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      throw error;
    }
  }, [token, baseUrl]);

  const leaveRoom = useCallback(async (roomId: string) => {
    try {
      // Unsubscribe from Pusher channel
      if (channelsRef.current[roomId]) {
        channelsRef.current[roomId].unbind_all();
        pusherRef.current?.unsubscribe(`private-help-request-${roomId}`);
        delete channelsRef.current[roomId];
      }

      // Call API to leave room
      const response = await fetch(`${baseUrl}/chat/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('🚪 Left room via Pusher:', roomId);
      
    } catch (error) {
      console.error('❌ Failed to leave room:', error);
      throw error;
    }
  }, [token, baseUrl]);

  const loadRoomMessages = async (roomId: string) => {
    try {
      const response = await fetch(`${baseUrl}/chat/${roomId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const messages = await response.json();
      setMessages(messages);
    } catch (error) {
      console.error('❌ Failed to load room messages:', error);
    }
  };

  const handleReconnection = () => {
    setHealth(prev => {
      const newRetryAttempts = prev.retryAttempts + 1;
      
      if (newRetryAttempts >= prev.maxRetries) {
        console.error('❌ Maximum Pusher reconnection attempts reached');
        return {
          ...prev,
          retryAttempts: newRetryAttempts,
          lastError: 'Maximum reconnection attempts reached'
        };
      }

      console.log(`🔄 Pusher reconnection attempt ${newRetryAttempts}/${prev.maxRetries}`);
      
      // Pusher handles reconnection automatically, we just track attempts
      return {
        ...prev,
        retryAttempts: newRetryAttempts,
        lastError: `Reconnecting (attempt ${newRetryAttempts}/${prev.maxRetries})`
      };
    });
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up Pusher connection...');
    
    // Unsubscribe from all channels
    Object.keys(channelsRef.current).forEach(channelName => {
      const channel = channelsRef.current[channelName];
      if (channel) {
        channel.unbind_all();
      }
    });

    // Disconnect Pusher
    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }
    
    // Clear channel references
    channelsRef.current = {};
    
    // Reset state
    setHealth({
      connected: false,
      authenticated: false,
      retryAttempts: 0,
      maxRetries: 5,
      lastError: null,
      connectionTime: null,
      pusherState: 'disconnected'
    });
    
    setMessages([]);
    setNotifications([]);
  };

  const forceReconnect = () => {
    console.log('🔄 Forcing Pusher reconnection...');
    
    setHealth(prev => ({
      ...prev,
      retryAttempts: 0,
      lastError: null
    }));
    
    cleanup();
    
    if (token) {
      setTimeout(() => {
        initializePusher();
      }, 1000);
    }
  };

  const getConnectionHealth = () => health;

  // Enhanced socket-like interface with Pusher functionality
  const socketLikeInterface = {
    connected: health.connected,
    pusherState: health.pusherState,
    emit: (event: string, data?: any) => {
      if (event === 'send_message') {
        return sendMessage(data.content, data.roomId);
      } else if (event === 'join_room') {
        return joinRoom(data.roomId);
      } else if (event === 'leave_room') {
        return leaveRoom(data.roomId);
      }
    },
    on: (event: string, callback: (data: any) => void) => {
      // For backward compatibility with existing components
      console.log(`Event listener registered for: ${event} (handled by Pusher)`);
    },
    off: (event: string, callback?: (data: any) => void) => {
      console.log(`Event listener removed for: ${event} (handled by Pusher)`);
    },
  };

  return {
    socket: socketLikeInterface,
    health,
    messages,
    notifications,
    sendMessage,
    joinRoom,
    leaveRoom,
    forceReconnect,
    getConnectionHealth,
    cleanup,
    pusher: pusherRef.current
  };
}
