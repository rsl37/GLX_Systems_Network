/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Socket.io Integration Module
 *
 * Provides low-latency real-time communication for in-app chat,
 * volunteer coordination, and notifications using Socket.io.
 *
 * This is the primary WebSocket provider for real-time messaging.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type {
  IRealtimeProvider,
  SocketIOConfig,
  RealtimeMessage,
  ProviderHealthStatus,
  ChatMessage,
  NotificationMessage,
  MessagePriority,
} from './types.js';

// ============================================================================
// Socket.io Event Types
// ============================================================================

interface ServerToClientEvents {
  message: (message: RealtimeMessage) => void;
  notification: (notification: NotificationMessage) => void;
  room_joined: (data: { roomId: string; userId: number }) => void;
  room_left: (data: { roomId: string; userId: number }) => void;
  user_typing: (data: { roomId: string; userId: number; username: string }) => void;
  presence_update: (data: { roomId: string; users: number[] }) => void;
  error: (error: { code: string; message: string }) => void;
  heartbeat: (timestamp: number) => void;
}

interface ClientToServerEvents {
  join_room: (roomId: string, callback: (success: boolean) => void) => void;
  leave_room: (roomId: string, callback: (success: boolean) => void) => void;
  send_message: (
    message: { roomId: string; content: string; priority?: MessagePriority },
    callback: (result: { success: boolean; messageId?: string; error?: string }) => void
  ) => void;
  typing_start: (roomId: string) => void;
  typing_stop: (roomId: string) => void;
  subscribe_notifications: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: number;
  username: string;
  connectedAt: Date;
  rooms: Set<string>;
}

type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ============================================================================
// Socket.io Provider Implementation
// ============================================================================

export class SocketIOProvider implements IRealtimeProvider {
  readonly name = 'socketio' as const;

  private io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  > | null = null;
  private config: SocketIOConfig | null = null;
  private connected = false;
  private lastHealthCheck: Date = new Date();
  private healthError: string | undefined;
  private subscriptions = new Map<string, Set<(message: RealtimeMessage) => void>>();
  private connectedClients = new Map<number, Set<string>>(); // userId -> socketIds

  /**
   * Initialize the Socket.io provider with configuration
   */
  initialize(config: SocketIOConfig): void {
    this.config = config;
    console.log('🔌 Socket.io provider initialized');
  }

  /**
   * Attach Socket.io to an HTTP server
   */
  attachToServer(httpServer: HttpServer): void {
    if (!this.config) {
      throw new Error('Socket.io provider not initialized. Call initialize() first.');
    }

    if (!this.config.enabled) {
      console.log('⚠️ Socket.io is disabled in configuration');
      return;
    }

    this.io = new SocketIOServer(httpServer, {
      path: this.config.path || '/socket.io',
      cors: {
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: this.config.pingTimeout || 60000,
      pingInterval: this.config.pingInterval || 25000,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    this.connected = true;
    console.log('✅ Socket.io server attached and ready');
  }

  /**
   * Check if provider is connected
   */
  isConnected(): boolean {
    return this.connected && this.io !== null;
  }

  /**
   * Connect to Socket.io (for client-side or when server is pre-attached)
   */
  async connect(): Promise<void> {
    if (this.io) {
      this.connected = true;
      this.healthError = undefined;
      console.log('✅ Socket.io provider connected');
    } else {
      throw new Error('Socket.io server not attached. Call attachToServer() first.');
    }
  }

  /**
   * Disconnect Socket.io server
   */
  async disconnect(): Promise<void> {
    if (this.io) {
      await new Promise<void>(resolve => {
        this.io?.close(() => {
          resolve();
        });
      });
      this.io = null;
    }
    this.connected = false;
    this.subscriptions.clear();
    this.connectedClients.clear();
    console.log('🔌 Socket.io provider disconnected');
  }

  /**
   * Get health status of the provider
   */
  getHealthStatus(): ProviderHealthStatus {
    const connectedSockets = this.io?.sockets?.sockets?.size || 0;

    return {
      provider: 'socketio',
      connected: this.connected,
      lastCheck: this.lastHealthCheck,
      error: this.healthError,
      details: {
        connectedClients: connectedSockets,
        path: this.config?.path,
        corsOrigins: this.config?.corsOrigins,
      },
    };
  }

  // ============================================================================
  // Real-time Messaging Methods
  // ============================================================================

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (message: RealtimeMessage) => void): Promise<void> {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(callback);
    console.log(`📡 Subscribed to channel: ${channel}`);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    this.subscriptions.delete(channel);
    console.log(`📡 Unsubscribed from channel: ${channel}`);
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: RealtimeMessage): Promise<void> {
    this.ensureConnected();

    // Emit to all sockets in the room
    this.io?.to(channel).emit('message', message);

    // Also notify local subscriptions
    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }

    console.log(`📤 Published message to channel: ${channel}`);
  }

  /**
   * Broadcast a message to all connected clients
   */
  async broadcast(message: RealtimeMessage): Promise<void> {
    this.ensureConnected();

    this.io?.emit('message', message);
    console.log('📢 Broadcasted message to all clients');
  }

  /**
   * Send a notification to a specific user
   */
  async sendNotificationToUser(userId: number, notification: NotificationMessage): Promise<void> {
    this.ensureConnected();

    const userSocketIds = this.connectedClients.get(userId);
    if (userSocketIds) {
      userSocketIds.forEach(socketId => {
        this.io?.to(socketId).emit('notification', notification);
      });
      console.log(`🔔 Sent notification to user ${userId}`);
    } else {
      console.log(`⚠️ User ${userId} not connected, notification not delivered`);
    }
  }

  /**
   * Send a message to a specific room
   */
  async sendToRoom(roomId: string, message: RealtimeMessage): Promise<void> {
    this.ensureConnected();
    this.io?.to(roomId).emit('message', message);
    console.log(`📤 Sent message to room: ${roomId}`);
  }

  /**
   * Get list of users in a room
   */
  async getRoomUsers(roomId: string): Promise<number[]> {
    this.ensureConnected();

    const users: number[] = [];
    const sockets = await this.io?.in(roomId).fetchSockets();

    if (sockets) {
      sockets.forEach(socket => {
        if (socket.data.userId) {
          users.push(socket.data.userId);
        }
      });
    }

    return [...new Set(users)];
  }

  /**
   * Get total connected clients count
   */
  getConnectedClientsCount(): number {
    return this.io?.sockets?.sockets?.size || 0;
  }

  // ============================================================================
  // Authentication Middleware
  // ============================================================================

  /**
   * Set authentication middleware for socket connections
   */
  setAuthMiddleware(
    verifyToken: (token: string) => Promise<{ userId: number; username: string } | null>
  ): void {
    if (!this.io) {
      throw new Error('Socket.io server not attached');
    }

    this.io.use(async (socket, next) => {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const user = await verifyToken(token);
        if (!user) {
          return next(new Error('Invalid token'));
        }

        socket.data.userId = user.userId;
        socket.data.username = user.username;
        socket.data.connectedAt = new Date();
        socket.data.rooms = new Set();

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Socket.io provider not connected');
    }
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.data.userId;
      console.log(`🔌 Client connected: ${socket.id} (user: ${userId})`);

      // Track connected client
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId)!.add(socket.id);

      // Join user to their personal notification channel
      socket.join(`user_${userId}`);

      // Handle room joining
      socket.on('join_room', (roomId, callback) => {
        try {
          socket.join(roomId);
          socket.data.rooms.add(roomId);

          // Notify room of new user
          socket.to(roomId).emit('room_joined', { roomId, userId });

          console.log(`🏠 User ${userId} joined room: ${roomId}`);
          callback(true);

          // Send updated presence
          this.emitPresenceUpdate(roomId);
        } catch (error) {
          console.error(`❌ Failed to join room ${roomId}:`, error);
          callback(false);
        }
      });

      // Handle room leaving
      socket.on('leave_room', (roomId, callback) => {
        try {
          socket.leave(roomId);
          socket.data.rooms.delete(roomId);

          // Notify room of user leaving
          socket.to(roomId).emit('room_left', { roomId, userId });

          console.log(`🚪 User ${userId} left room: ${roomId}`);
          callback(true);

          // Send updated presence
          this.emitPresenceUpdate(roomId);
        } catch (error) {
          console.error(`❌ Failed to leave room ${roomId}:`, error);
          callback(false);
        }
      });

      // Handle message sending
      socket.on('send_message', async (messageData, callback) => {
        try {
          const messageId = this.generateMessageId();

          const message: ChatMessage = {
            id: messageId,
            type: 'chat',
            channel: messageData.roomId,
            data: {
              content: messageData.content,
              roomId: messageData.roomId,
            },
            timestamp: new Date(),
            priority: messageData.priority || 'normal',
            senderId: userId,
            senderName: socket.data.username,
          };

          // Broadcast to room
          this.io?.to(messageData.roomId).emit('message', message);

          // Notify local subscriptions
          const handlers = this.subscriptions.get(messageData.roomId);
          if (handlers) {
            handlers.forEach(handler => handler(message));
          }

          console.log(`💬 Message sent to ${messageData.roomId} by user ${userId}`);
          callback({ success: true, messageId });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          console.error('❌ Message send error:', errorMessage);
          callback({ success: false, error: errorMessage });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', roomId => {
        socket.to(roomId).emit('user_typing', {
          roomId,
          userId,
          username: socket.data.username,
        });
      });

      socket.on('typing_stop', roomId => {
        // Just stop broadcasting typing - clients handle timeout
      });

      // Handle notification subscription
      socket.on('subscribe_notifications', () => {
        console.log(`🔔 User ${userId} subscribed to notifications`);
        // User is already in their personal channel from connection
      });

      // Periodic heartbeat - store reference for cleanup
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat', Date.now());
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle disconnect
      socket.on('disconnect', reason => {
        console.log(`🔌 Client disconnected: ${socket.id} (reason: ${reason})`);

        // Clean up heartbeat interval to prevent memory leaks
        clearInterval(heartbeatInterval);

        // Remove from connected clients
        const userSockets = this.connectedClients.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.connectedClients.delete(userId);
          }
        }

        // Notify rooms of user leaving
        socket.data.rooms.forEach(roomId => {
          socket.to(roomId).emit('room_left', { roomId, userId });
          this.emitPresenceUpdate(roomId);
        });
      });
    });

    // Handle server-level errors
    this.io.engine.on('connection_error', (err: any) => {
      console.error('❌ Socket.io connection error:', err);
      this.healthError = err.message;
    });
  }

  private async emitPresenceUpdate(roomId: string): Promise<void> {
    const users = await this.getRoomUsers(roomId);
    this.io?.to(roomId).emit('presence_update', { roomId, users });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const socketIOProvider = new SocketIOProvider();

export default socketIOProvider;
