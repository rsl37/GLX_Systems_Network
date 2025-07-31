/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { db } from './database.js';
import { URL } from 'url';

interface UserConnection {
  userId: number;
  connectionId: string;
  connectedAt: Date;
  lastActivity: Date;
  heartbeatInterval?: NodeJS.Timeout;
  idleTimeout?: NodeJS.Timeout;
  ws: WebSocket;
  rooms: Set<string>;
}

interface ConnectionRetry {
  attempts: number;
  lastAttempt: Date;
  maxRetries: number;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  messageId?: string;
  timestamp?: number;
}

class WebSocketManager {
  private connectedUsers = new Map<string, UserConnection>();
  private connectionRetries = new Map<string, ConnectionRetry>();
  private cleanupInterval: NodeJS.Timeout;
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupConnectionHandling();
    this.startCleanupProcess();
  }

  private setupConnectionHandling() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const connectionId = this.generateConnectionId();
      console.log(`🔌 WebSocket connected: ${connectionId}`);
      this.handleNewConnection(ws, connectionId, req);
    });
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleNewConnection(ws: WebSocket, connectionId: string, req: IncomingMessage) {
    // Initialize connection tracking
    this.connectedUsers.set(connectionId, {
      userId: 0, // Will be set during authentication
      connectionId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      ws,
      rooms: new Set()
    });

    // Set up heartbeat mechanism
    this.setupHeartbeat(ws, connectionId);

    // Set up idle timeout
    this.setupIdleTimeout(ws, connectionId);

    // Handle messages
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, connectionId, data);
    });

    // Handle connection close
    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`🔌 WebSocket ${connectionId} disconnected: ${code} - ${reason.toString()}`);
      this.cleanupConnection(connectionId);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      console.error(`❌ WebSocket error for ${connectionId}:`, error);
      this.sendMessage(ws, { type: 'error_handled', data: { message: 'An error occurred', timestamp: Date.now() } });
    });

    // Send connection confirmation
    this.sendMessage(ws, { type: 'connected', data: { connectionId, timestamp: Date.now() } });
  }

  private async handleMessage(ws: WebSocket, connectionId: string, data: Buffer) {
    try {
      this.updateLastActivity(connectionId);
      
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log(`📨 Message from ${connectionId}:`, message.type);

      switch (message.type) {
        case 'authenticate':
          await this.handleAuthentication(ws, connectionId, message.data);
          break;
        case 'ping':
          this.handlePing(ws, connectionId, message.data);
          break;
        case 'join_help_request':
          this.handleJoinRoom(ws, connectionId, message.data);
          break;
        case 'leave_help_request':
          this.handleLeaveRoom(ws, connectionId, message.data);
          break;
        case 'send_message':
          await this.handleSendMessage(ws, connectionId, message.data);
          break;
        case 'retry_connection':
          this.handleConnectionRetry(ws, connectionId);
          break;
        default:
          console.warn(`⚠️ Unknown message type: ${message.type}`);
          this.sendMessage(ws, { type: 'error', data: { message: 'Unknown message type' } });
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${connectionId}:`, error);
      this.sendMessage(ws, { type: 'error', data: { message: 'Failed to process message' } });
    }
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private setupHeartbeat(ws: WebSocket, connectionId: string) {
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, { type: 'ping', data: { timestamp: Date.now() } });
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // 30 seconds

    const connection = this.connectedUsers.get(connectionId);
    if (connection) {
      connection.heartbeatInterval = heartbeat;
    }
  }

  private handlePing(ws: WebSocket, connectionId: string, data: any) {
    this.updateLastActivity(connectionId);
    this.sendMessage(ws, { type: 'pong', data });
    console.log(`💓 Heartbeat response from ${connectionId}, latency: ${Date.now() - data.timestamp}ms`);
  }

  private setupIdleTimeout(ws: WebSocket, connectionId: string) {
    const idleTimeout = setTimeout(() => {
      this.checkIdleConnection(ws, connectionId);
    }, 30 * 60 * 1000); // 30 minutes

    const connection = this.connectedUsers.get(connectionId);
    if (connection) {
      connection.idleTimeout = idleTimeout;
    }
  }

  private async handleAuthentication(ws: WebSocket, connectionId: string, token: string) {
    try {
      console.log(`🔐 Authenticating connection: ${connectionId}`);
      
      if (!token || typeof token !== 'string') {
        this.sendMessage(ws, { type: 'auth_error', data: { message: 'Invalid token format' } });
        return;
      }

      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const userId = decoded.userId;

      if (!userId || typeof userId !== 'number') {
        this.sendMessage(ws, { type: 'auth_error', data: { message: 'Invalid user ID in token' } });
        return;
      }

      // Check if user exists
      const user = await db
        .selectFrom('users')
        .select(['id', 'username'])
        .where('id', '=', userId)
        .executeTakeFirst();

      if (!user) {
        this.sendMessage(ws, { type: 'auth_error', data: { message: 'User not found' } });
        return;
      }

      // Update connection with user ID
      const connection = this.connectedUsers.get(connectionId);
      if (connection) {
        connection.userId = userId;
      }

      // Store user connection in database
      await db
        .insertInto('user_connections')
        .values({
          user_id: userId,
          socket_id: connectionId
        })
        .execute();

      // Add to user room
      this.joinRoom(connectionId, `user_${userId}`);
      
      // Reset retry attempts on successful authentication
      this.connectionRetries.delete(connectionId);
      
      this.sendMessage(ws, { type: 'authenticated', data: { userId, timestamp: Date.now() } });
      console.log(`✅ User ${userId} authenticated successfully`);
      
    } catch (error) {
      console.error(`❌ Authentication error for ${connectionId}:`, error);
      this.sendMessage(ws, { type: 'auth_error', data: { message: 'Authentication failed' } });
    }
  }

  private handleJoinRoom(ws: WebSocket, connectionId: string, helpRequestId: number) {
    try {
      if (!this.isAuthenticated(connectionId)) {
        this.sendMessage(ws, { type: 'error', data: { message: 'Not authenticated' } });
        return;
      }

      if (!helpRequestId || typeof helpRequestId !== 'number' || helpRequestId <= 0) {
        this.sendMessage(ws, { type: 'error', data: { message: 'Invalid help request ID' } });
        return;
      }
      
      const roomId = `help_request_${helpRequestId}`;
      this.joinRoom(connectionId, roomId);
      console.log(`🏠 Connection ${connectionId} joined help request ${helpRequestId}`);
      
      this.sendMessage(ws, { type: 'room_joined', data: { roomId } });
      
    } catch (error) {
      console.error(`❌ Error joining room for ${connectionId}:`, error);
      this.sendMessage(ws, { type: 'error', data: { message: 'Failed to join room' } });
    }
  }

  private handleLeaveRoom(ws: WebSocket, connectionId: string, helpRequestId: number) {
    try {
      if (!helpRequestId || typeof helpRequestId !== 'number') {
        return;
      }
      
      const roomId = `help_request_${helpRequestId}`;
      this.leaveRoom(connectionId, roomId);
      console.log(`🚪 Connection ${connectionId} left help request ${helpRequestId}`);
      
      this.sendMessage(ws, { type: 'room_left', data: { roomId } });
      
    } catch (error) {
      console.error(`❌ Error leaving room for ${connectionId}:`, error);
    }
  }

  private joinRoom(connectionId: string, roomId: string) {
    const connection = this.connectedUsers.get(connectionId);
    if (connection) {
      connection.rooms.add(roomId);
    }
  }

  private leaveRoom(connectionId: string, roomId: string) {
    const connection = this.connectedUsers.get(connectionId);
    if (connection) {
      connection.rooms.delete(roomId);
    }
  }

  private async handleSendMessage(ws: WebSocket, connectionId: string, data: any) {
    try {
      const connection = this.connectedUsers.get(connectionId);
      if (!connection || !connection.userId) {
        this.sendMessage(ws, { type: 'error', data: { message: 'Not authenticated' } });
        return;
      }

      const { helpRequestId, message } = data;
      
      // Validate input
      if (!helpRequestId || typeof helpRequestId !== 'number') {
        this.sendMessage(ws, { type: 'error', data: { message: 'Invalid help request ID' } });
        return;
      }
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        this.sendMessage(ws, { type: 'error', data: { message: 'Message cannot be empty' } });
        return;
      }
      
      if (message.length > 1000) {
        this.sendMessage(ws, { type: 'error', data: { message: 'Message too long (max 1000 characters)' } });
        return;
      }
      
      console.log(`💬 Message from user ${connection.userId} in help request ${helpRequestId}`);
      
      // Save message to database
      const savedMessage = await db
        .insertInto('messages')
        .values({
          help_request_id: helpRequestId,
          sender_id: connection.userId,
          message: message.trim()
        })
        .returning(['id', 'created_at'])
        .executeTakeFirst();

      if (!savedMessage) {
        this.sendMessage(ws, { type: 'error', data: { message: 'Failed to save message' } });
        return;
      }

      // Get sender info
      const sender = await db
        .selectFrom('users')
        .select(['username', 'avatar_url'])
        .where('id', '=', connection.userId)
        .executeTakeFirst();

      // Broadcast to help request room
      const messageData = {
        id: savedMessage.id,
        message: message.trim(),
        sender: sender?.username || 'Unknown',
        avatar: sender?.avatar_url,
        timestamp: savedMessage.created_at
      };

      this.broadcastToRoom(`help_request_${helpRequestId}`, { type: 'new_message', data: messageData });
      
      // Confirm message sent to sender
      this.sendMessage(ws, { 
        type: 'message_sent', 
        data: { 
          messageId: savedMessage.id, 
          timestamp: savedMessage.created_at 
        } 
      });

      console.log(`✅ Message ${savedMessage.id} sent successfully`);
      
    } catch (error) {
      console.error(`❌ Message send error for ${connectionId}:`, error);
      this.sendMessage(ws, { type: 'error', data: { message: 'Failed to send message' } });
    }
  }

  private handleConnectionRetry(ws: WebSocket, connectionId: string) {
    try {
      const retryInfo = this.connectionRetries.get(connectionId) || {
        attempts: 0,
        lastAttempt: new Date(),
        maxRetries: 5
      };

      if (retryInfo.attempts >= retryInfo.maxRetries) {
        this.sendMessage(ws, { 
          type: 'max_retries_reached', 
          data: { message: 'Maximum retry attempts reached' } 
        });
        this.forceDisconnect(ws, connectionId, 'max_retries_exceeded');
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * Math.pow(2, retryInfo.attempts), 16000);
      
      retryInfo.attempts++;
      retryInfo.lastAttempt = new Date();
      this.connectionRetries.set(connectionId, retryInfo);

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendMessage(ws, { 
            type: 'connection_retry', 
            data: { 
              attempt: retryInfo.attempts, 
              maxRetries: retryInfo.maxRetries,
              nextDelay: Math.min(1000 * Math.pow(2, retryInfo.attempts), 16000)
            } 
          });
        }
      }, delay);

      console.log(`🔄 Connection retry ${retryInfo.attempts}/${retryInfo.maxRetries} for ${connectionId}, delay: ${delay}ms`);
      
    } catch (error) {
      console.error(`❌ Connection retry error for ${connectionId}:`, error);
    }
  }

  private async cleanupConnection(connectionId: string) {
    try {
      const connection = this.connectedUsers.get(connectionId);
      
      if (connection) {
        // Clear intervals and timeouts
        if (connection.heartbeatInterval) {
          clearInterval(connection.heartbeatInterval);
        }
        
        if (connection.idleTimeout) {
          clearTimeout(connection.idleTimeout);
        }

        // Remove from database
        if (connection.userId) {
          await db
            .deleteFrom('user_connections')
            .where('socket_id', '=', connectionId)
            .execute();
        }

        // Remove from memory
        this.connectedUsers.delete(connectionId);
        
        console.log(`🧹 Cleaned up connection for ${connectionId}`);
      }

      // Clean up retry attempts
      this.connectionRetries.delete(connectionId);
      
    } catch (error) {
      console.error(`❌ Error cleaning up connection ${connectionId}:`, error);
    }
  }

  private updateLastActivity(connectionId: string) {
    const connection = this.connectedUsers.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  private checkIdleConnection(ws: WebSocket, connectionId: string) {
    const connection = this.connectedUsers.get(connectionId);
    if (!connection) return;

    const idleTime = Date.now() - connection.lastActivity.getTime();
    const maxIdleTime = 30 * 60 * 1000; // 30 minutes

    if (idleTime > maxIdleTime) {
      console.log(`⏰ Connection ${connectionId} idle for ${Math.round(idleTime / 60000)} minutes, disconnecting`);
      this.sendMessage(ws, { 
        type: 'idle_timeout', 
        data: { 
          message: 'Connection closed due to inactivity',
          idleTime: Math.round(idleTime / 60000)
        } 
      });
      this.forceDisconnect(ws, connectionId, 'idle_timeout');
    } else {
      // Reset idle timeout
      this.setupIdleTimeout(ws, connectionId);
    }
  }

  private forceDisconnect(ws: WebSocket, connectionId: string, reason: string) {
    console.log(`🔌 Force disconnecting ${connectionId}: ${reason}`);
    ws.close(1000, reason);
  }

  private isAuthenticated(connectionId: string): boolean {
    const connection = this.connectedUsers.get(connectionId);
    return connection ? connection.userId > 0 : false;
  }

  // Public method to broadcast to all connections
  public broadcast(message: WebSocketMessage) {
    for (const connection of this.connectedUsers.values()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(connection.ws, message);
      }
    }
  }

  // Public method to broadcast to a specific room
  public broadcastToRoom(roomId: string, message: WebSocketMessage) {
    for (const connection of this.connectedUsers.values()) {
      if (connection.rooms.has(roomId) && connection.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(connection.ws, message);
      }
    }
  }

  private startCleanupProcess() {
    // Periodic cleanup every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 15 * 60 * 1000);

    console.log('🧹 WebSocket cleanup process started');
  }

  private async performCleanup() {
    console.log('🧹 Performing WebSocket cleanup...');
    
    const now = Date.now();
    const maxIdleTime = 60 * 60 * 1000; // 1 hour for cleanup
    let cleanedCount = 0;

    // Clean up stale connections
    for (const [connectionId, connection] of this.connectedUsers.entries()) {
      const idleTime = now - connection.lastActivity.getTime();
      
      if (idleTime > maxIdleTime || connection.ws.readyState !== WebSocket.OPEN) {
        console.log(`🧹 Cleaning up stale connection: ${connectionId}`);
        this.forceDisconnect(connection.ws, connectionId, 'stale_connection');
        await this.cleanupConnection(connectionId);
        cleanedCount++;
      }
    }

    // Clean up old retry attempts
    const maxRetryAge = 5 * 60 * 1000; // 5 minutes
    for (const [connectionId, retryInfo] of this.connectionRetries.entries()) {
      const retryAge = now - retryInfo.lastAttempt.getTime();
      if (retryAge > maxRetryAge) {
        this.connectionRetries.delete(connectionId);
      }
    }

    // Clean up orphaned database connections
    try {
      const orphanedConnections = await db
        .selectFrom('user_connections')
        .selectAll()
        .execute();

      let orphanedCount = 0;
      for (const dbConnection of orphanedConnections) {
        const connection = this.connectedUsers.get(dbConnection.socket_id);
        if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
          await db
            .deleteFrom('user_connections')
            .where('socket_id', '=', dbConnection.socket_id)
            .execute();
          orphanedCount++;
        }
      }

      if (orphanedCount > 0) {
        console.log(`🧹 Cleaned up ${orphanedCount} orphaned database connections`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up orphaned connections:', error);
    }

    console.log(`🧹 Cleanup complete. Active connections: ${this.connectedUsers.size}, cleaned: ${cleanedCount}`);
  }

  // Public methods for monitoring
  public getConnectionCount(): number {
    return this.connectedUsers.size;
  }

  public getConnectedUsers(): Map<string, UserConnection> {
    return new Map(this.connectedUsers);
  }

  public getRetryAttempts(): Map<string, ConnectionRetry> {
    return new Map(this.connectionRetries);
  }

  public getHealthStatus() {
    return {
      activeConnections: this.connectedUsers.size,
      retryAttempts: this.connectionRetries.size,
      timestamp: new Date().toISOString()
    };
  }

  // Cleanup method for graceful shutdown
  public async shutdown() {
    console.log('🔌 Shutting down WebSocket manager...');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect all connections
    for (const connection of this.connectedUsers.values()) {
      connection.ws.close(1001, 'Server shutdown');
    }

    // Clean up all connections
    for (const connectionId of this.connectedUsers.keys()) {
      await this.cleanupConnection(connectionId);
    }

    console.log('✅ WebSocket manager shutdown complete');
  }
}

export default WebSocketManager;