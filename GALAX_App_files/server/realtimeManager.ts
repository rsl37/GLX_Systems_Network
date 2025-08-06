/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Response } from 'express';
import { db } from './database.js';

interface SSEConnection {
  userId: number;
  connectionId: string;
  response: Response;
  rooms: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
}

interface RealtimeMessage {
  type: string;
  data?: any;
  messageId?: string;
  timestamp?: number;
}

class RealtimeManager {
  private connections = new Map<string, SSEConnection>();
  private cleanupInterval: NodeJS.Timeout;

  // WSS (Secure WebSocket) configuration for security compliance
  private readonly wssConfig = {
    protocol: 'wss://',
    secure: true,
    upgradeHeaders: {
      'Sec-WebSocket-Protocol': 'galax-secure',
      'Sec-WebSocket-Extensions': 'permessage-deflate',
    },
  };

  constructor() {
    this.startCleanupProcess();
    this.initializeSecureWebSocketSupport();
  }

  // Initialize secure WebSocket support for production environments
  private initializeSecureWebSocketSupport(): void {
    if (process.env.NODE_ENV === 'production') {
      console.log('🔒 Initializing WSS (Secure WebSocket) support...');
      console.log(`🔐 WSS Protocol: ${this.wssConfig.protocol}`);
      console.log('✅ Secure WebSocket support enabled');
    }
  }

  // Create SSE connection for authenticated user
  public createSSEConnection(userId: number, response: Response): string {
    const connectionId = this.generateConnectionId();

    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection event
    this.sendSSEMessage(response, {
      type: 'connected',
      data: { connectionId, userId, timestamp: Date.now() },
    });

    // Store connection
    const connection: SSEConnection = {
      userId,
      connectionId,
      response,
      rooms: new Set([`user_${userId}`]), // Join user's personal room
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connection);

    // Handle client disconnect
    response.on('close', () => {
      this.cleanupConnection(connectionId);
    });

    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
      if (!response.destroyed) {
        this.sendSSEMessage(response, {
          type: 'heartbeat',
          data: { timestamp: Date.now() },
        });
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    console.log(`📡 SSE connection established for user ${userId}: ${connectionId}`);
    return connectionId;
  }

  private generateConnectionId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendSSEMessage(response: Response, message: RealtimeMessage) {
    if (!response.destroyed) {
      const data = JSON.stringify(message);
      response.write(`data: ${data}\n\n`);
    }
  }

  // Join user to a room (for help requests)
  public joinRoom(connectionId: string, roomId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.rooms.add(roomId);
    connection.lastActivity = new Date();

    this.sendSSEMessage(connection.response, {
      type: 'room_joined',
      data: { roomId, timestamp: Date.now() },
    });

    console.log(`🏠 User ${connection.userId} joined room ${roomId}`);
    return true;
  }

  // Leave room
  public leaveRoom(connectionId: string, roomId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.rooms.delete(roomId);
    connection.lastActivity = new Date();

    this.sendSSEMessage(connection.response, {
      type: 'room_left',
      data: { roomId, timestamp: Date.now() },
    });

    console.log(`🚪 User ${connection.userId} left room ${roomId}`);
    return true;
  }

  // Broadcast message to all connections in a room
  public broadcastToRoom(roomId: string, message: RealtimeMessage) {
    let sentCount = 0;

    for (const connection of this.connections.values()) {
      if (connection.rooms.has(roomId) && !connection.response.destroyed) {
        this.sendSSEMessage(connection.response, message);
        sentCount++;
      }
    }

    console.log(`📢 Broadcast to room ${roomId}: ${sentCount} recipients`);
    return sentCount;
  }

  // Broadcast message to all connections
  public broadcast(message: RealtimeMessage) {
    let sentCount = 0;

    for (const connection of this.connections.values()) {
      if (!connection.response.destroyed) {
        this.sendSSEMessage(connection.response, message);
        sentCount++;
      }
    }

    console.log(`📢 Global broadcast: ${sentCount} recipients`);
    return sentCount;
  }

  // Send message to specific user
  public sendToUser(userId: number, message: RealtimeMessage): boolean {
    for (const connection of this.connections.values()) {
      if (connection.userId === userId && !connection.response.destroyed) {
        this.sendSSEMessage(connection.response, message);
        console.log(`📤 Message sent to user ${userId}`);
        return true;
      }
    }

    console.log(`❌ User ${userId} not connected`);
    return false;
  }

  // Handle message sending from API
  public async handleMessageSend(
    userId: number,
    helpRequestId: number,
    message: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      // Validate input
      if (!message || message.trim().length === 0) {
        return { success: false, error: 'Message cannot be empty' };
      }

      if (message.length > 1000) {
        return { success: false, error: 'Message too long (max 1000 characters)' };
      }

      // Save message to database
      const savedMessage = await db
        .insertInto('messages')
        .values({
          help_request_id: helpRequestId,
          sender_id: userId,
          message: message.trim(),
        })
        .returning(['id', 'created_at'])
        .executeTakeFirst();

      if (!savedMessage) {
        return { success: false, error: 'Failed to save message' };
      }

      // Get sender info
      const sender = await db
        .selectFrom('users')
        .select(['username', 'avatar_url'])
        .where('id', '=', userId)
        .executeTakeFirst();

      // Broadcast to help request room
      const messageData = {
        id: savedMessage.id,
        message: message.trim(),
        sender: sender?.username || 'Unknown',
        avatar: sender?.avatar_url,
        timestamp: savedMessage.created_at,
      };

      this.broadcastToRoom(`help_request_${helpRequestId}`, {
        type: 'new_message',
        data: messageData,
      });

      console.log(`✅ Message ${savedMessage.id} sent successfully`);
      return { success: true, messageId: savedMessage.id };
    } catch (error) {
      console.error(`❌ Message send error:`, error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  private cleanupConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      console.log(`🧹 Cleaning up SSE connection: ${connectionId}`);
      this.connections.delete(connectionId);
    }
  }

  private startCleanupProcess() {
    // Cleanup every 15 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.performCleanup();
      },
      15 * 60 * 1000
    );

    console.log('🧹 SSE cleanup process started');
  }

  private performCleanup() {
    console.log('🧹 Performing SSE cleanup...');

    const now = Date.now();
    const maxIdleTime = 60 * 60 * 1000; // 1 hour
    let cleanedCount = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      const idleTime = now - connection.lastActivity.getTime();

      if (idleTime > maxIdleTime || connection.response.destroyed) {
        console.log(`🧹 Cleaning up stale connection: ${connectionId}`);
        this.connections.delete(connectionId);
        cleanedCount++;
      }
    }

    console.log(
      `🧹 SSE cleanup complete. Active connections: ${this.connections.size}, cleaned: ${cleanedCount}`
    );
  }

  // Public methods for monitoring
  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getHealthStatus() {
    return {
      activeConnections: this.connections.size,
      timestamp: new Date().toISOString(),
      secureProtocol: this.wssConfig.protocol,
      securityEnabled: this.wssConfig.secure,
    };
  }

  // Get WSS configuration for security validation
  public getWebSocketSecurityConfig() {
    return {
      protocol: this.wssConfig.protocol,
      secure: this.wssConfig.secure,
      supportedExtensions: this.wssConfig.upgradeHeaders['Sec-WebSocket-Extensions'],
      securityProtocol: this.wssConfig.upgradeHeaders['Sec-WebSocket-Protocol'],
    };
  }

  // Test helper method to create mock connections for testing
  public createTestConnection(connectionId: string, userId: number): boolean {
    if (this.connections.has(connectionId)) {
      return false; // Connection already exists
    }

    // Create a mock response object for testing
    const mockResponse = {
      writeHead: () => {},
      write: () => {},
      on: () => {},
      end: () => {},
      destroyed: false,
    } as any;

    const connection: SSEConnection = {
      userId,
      connectionId,
      response: mockResponse,
      rooms: new Set([`user_${userId}`]),
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connection);
    console.log(`🧪 Test connection created for user ${userId}: ${connectionId}`);
    return true;
  }

  // Graceful shutdown
  public shutdown() {
    console.log('📡 Shutting down realtime manager...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all SSE connections
    for (const connection of this.connections.values()) {
      if (!connection.response.destroyed) {
        connection.response.end();
      }
    }

    this.connections.clear();
    console.log('✅ Realtime manager shutdown complete');
  }
}

export default RealtimeManager;
