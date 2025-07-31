/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketHealthStatus {
  connected: boolean;
  authenticated: boolean;
  retryAttempts: number;
  maxRetries: number;
  lastError: string | null;
  connectionTime: number | null;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  messageId?: string;
  timestamp?: number;
}

export function useWebSocket(token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [health, setHealth] = useState<WebSocketHealthStatus>({
    connected: false,
    authenticated: false,
    retryAttempts: 0,
    maxRetries: 5,
    lastError: null,
    connectionTime: null
  });
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const connectionStartTime = useRef<number>(0);
  const messageHandlersRef = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    if (!token) {
      cleanup();
      return;
    }

    initializeWebSocket();

    return () => {
      cleanup();
    };
  }, [token]);

  const initializeWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    connectionStartTime.current = Date.now();
    
    console.log('🔌 Initializing WebSocket connection...');
    
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? `wss://${window.location.host}/websocket`
      : 'ws://localhost:3001/websocket';
      
    wsRef.current = new WebSocket(wsUrl);
    setupEventHandlers();
  };

  const setupEventHandlers = () => {
    if (!wsRef.current) return;

    const ws = wsRef.current;

    // Connection opened
    ws.onopen = () => {
      const connectionTime = Date.now() - connectionStartTime.current;
      console.log(`✅ WebSocket connected in ${connectionTime}ms`);
      
      setHealth(prev => ({
        ...prev,
        connected: true,
        lastError: null,
        connectionTime,
        retryAttempts: 0
      }));
      
      // Authenticate immediately after connection
      sendMessage({ type: 'authenticate', data: token });
      
      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = undefined;
      }
    };

    // Message received
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error);
      }
    };

    // Connection closed
    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      setHealth(prev => ({
        ...prev,
        connected: false,
        authenticated: false,
        lastError: event.reason || 'Connection closed'
      }));
      
      stopHeartbeat();
      
      // Only reconnect if disconnection wasn't intentional
      if (event.code !== 1000) {
        handleReconnection();
      }
    };

    // Connection error
    ws.onerror = (error) => {
      console.error('❌ WebSocket connection error:', error);
      setHealth(prev => ({
        ...prev,
        connected: false,
        lastError: 'Unable to connect to the server. Please check your internet connection.'
      }));
      
      handleReconnection();
    };
  };

  const handleMessage = (message: WebSocketMessage) => {
    console.log(`📨 WebSocket message:`, message.type);

    switch (message.type) {
      case 'connected':
        console.log('🔌 WebSocket connection confirmed:', message.data);
        break;

      case 'authenticated':
        console.log('🔐 WebSocket authenticated successfully:', message.data);
        setHealth(prev => ({
          ...prev,
          authenticated: true,
          lastError: null
        }));
        startHeartbeat();
        break;

      case 'auth_error':
        console.error('❌ WebSocket authentication failed:', message.data);
        setHealth(prev => ({
          ...prev,
          authenticated: false,
          lastError: message.data?.message || 'WebSocket authentication failed. Please refresh the page and try again.'
        }));
        break;

      case 'ping':
        // Respond to server ping
        sendMessage({ type: 'ping', data: message.data });
        break;

      case 'pong':
        // Handle pong response (for client-initiated pings)
        const latency = Date.now() - (message.data?.timestamp || Date.now());
        console.log(`💓 Heartbeat response, latency: ${latency}ms`);
        break;

      case 'connection_retry':
        console.log(`🔄 Connection retry ${message.data?.attempt}/${message.data?.maxRetries}`);
        setHealth(prev => ({
          ...prev,
          retryAttempts: message.data?.attempt || 0,
          maxRetries: message.data?.maxRetries || 5
        }));
        break;

      case 'max_retries_reached':
        console.error('❌ Maximum retry attempts reached:', message.data);
        setHealth(prev => ({
          ...prev,
          lastError: 'Maximum retry attempts reached'
        }));
        break;

      case 'idle_timeout':
        console.warn('⏰ Connection closed due to inactivity:', message.data);
        setHealth(prev => ({
          ...prev,
          lastError: `Idle timeout: ${message.data?.idleTime} minutes`
        }));
        break;

      case 'room_joined':
        console.log('🏠 Joined room:', message.data?.roomId);
        break;

      case 'room_left':
        console.log('🚪 Left room:', message.data?.roomId);
        break;

      case 'message_sent':
        console.log('✅ Message sent:', message.data?.messageId);
        break;

      case 'error':
        console.error('❌ WebSocket error:', message.data);
        setHealth(prev => ({
          ...prev,
          lastError: message.data?.message || 'A communication error occurred. Please refresh the page if issues persist.'
        }));
        break;

      case 'error_handled':
        console.log('🔧 Error handled by server:', message.data);
        break;

      default:
        // Handle custom message types through registered handlers
        const handler = messageHandlersRef.current.get(message.type);
        if (handler) {
          handler(message.data);
        } else {
          console.log('📦 Unhandled message type:', message.type, message.data);
        }
        break;
    }
  };

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
    }
  }, []);

  const startHeartbeat = () => {
    stopHeartbeat(); // Clear any existing heartbeat
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send ping to server
        sendMessage({ type: 'ping', data: { timestamp: Date.now() } });
      } else {
        console.warn('⚠️ Heartbeat failed - WebSocket not connected');
        stopHeartbeat();
        handleReconnection();
      }
    }, 35000); // Check every 35 seconds (server sends ping every 30s)
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  };

  const handleReconnection = () => {
    if (retryTimeoutRef.current) {
      return; // Already attempting reconnection
    }

    setHealth(prev => {
      const newRetryAttempts = prev.retryAttempts + 1;
      
      if (newRetryAttempts >= prev.maxRetries) {
        console.error('❌ Maximum reconnection attempts reached');
        return {
          ...prev,
          retryAttempts: newRetryAttempts,
          lastError: 'Maximum reconnection attempts reached'
        };
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * Math.pow(2, newRetryAttempts - 1), 16000);
      
      console.log(`🔄 Scheduling reconnection attempt ${newRetryAttempts}/${prev.maxRetries} in ${delay}ms`);
      
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = undefined;
        
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        
        initializeWebSocket();
      }, delay);

      return {
        ...prev,
        retryAttempts: newRetryAttempts,
        lastError: `Reconnecting in ${delay}ms (attempt ${newRetryAttempts}/${prev.maxRetries})`
      };
    });
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up WebSocket connection...');
    
    // Clear timeouts and intervals
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }
    
    stopHeartbeat();
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client cleanup');
      wsRef.current = null;
    }
    
    // Reset health status
    setHealth({
      connected: false,
      authenticated: false,
      retryAttempts: 0,
      maxRetries: 5,
      lastError: null,
      connectionTime: null
    });

    // Clear message handlers
    messageHandlersRef.current.clear();
  };

  const forceReconnect = () => {
    console.log('🔄 Forcing WebSocket reconnection...');
    
    setHealth(prev => ({
      ...prev,
      retryAttempts: 0,
      lastError: null
    }));
    
    cleanup();
    
    if (token) {
      setTimeout(() => {
        initializeWebSocket();
      }, 1000);
    }
  };

  // Public API methods
  const joinHelpRequest = useCallback((helpRequestId: number) => {
    sendMessage({ type: 'join_help_request', data: helpRequestId });
  }, [sendMessage]);

  const leaveHelpRequest = useCallback((helpRequestId: number) => {
    sendMessage({ type: 'leave_help_request', data: helpRequestId });
  }, [sendMessage]);

  const sendChatMessage = useCallback((helpRequestId: number, message: string) => {
    sendMessage({ 
      type: 'send_message', 
      data: { helpRequestId, message } 
    });
  }, [sendMessage]);

  const on = useCallback((messageType: string, handler: (data: any) => void) => {
    messageHandlersRef.current.set(messageType, handler);
    
    return () => {
      messageHandlersRef.current.delete(messageType);
    };
  }, []);

  const off = useCallback((messageType: string) => {
    messageHandlersRef.current.delete(messageType);
  }, []);

  const getConnectionHealth = () => health;

  return {
    health,
    sendMessage,
    joinHelpRequest,
    leaveHelpRequest,
    sendChatMessage,
    on,
    off,
    forceReconnect,
    getConnectionHealth,
    cleanup
  };
}