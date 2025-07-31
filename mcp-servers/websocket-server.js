#!/usr/bin/env node

/**
 * GALAX WebSocket MCP Server
 * Real-time communication server for the GALAX Civic Networking App
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketMCPServer {
  constructor() {
    this.server = new Server({
      name: 'GALAX WebSocket MCP Server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.httpServer = createServer();
    this.wss = new WebSocketServer({ 
      server: this.httpServer,
      path: '/mcp-websocket',
      clientTracking: true,
      maxPayload: 1e6, // 1MB
    });
    });

    this.activeUsers = new Map();
    this.chatRooms = new Map();
    this.connections = new Map();
    this.setupWebSocketHandlers();
    this.setupTools();
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url, 'http://localhost');
      const token = url.searchParams.get('token');
      
      let userId = null;
      
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
          userId = decoded.userId;
        } catch (err) {
          console.error('Authentication error:', err);
          ws.close(1008, 'Authentication error');
          return;
        }
      } else {
        console.error('No token provided');
        ws.close(1008, 'No token provided');
        return;
      }

      const connectionId = this.generateConnectionId();
      console.log('User connected:', userId, connectionId);
      
      this.activeUsers.set(userId, connectionId);
      this.connections.set(connectionId, { ws, userId, rooms: new Set() });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(connectionId, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
          this.sendMessage(ws, { type: 'error', data: { message: 'Invalid message format' } });
        }
      });

      ws.on('close', () => {
        console.log('User disconnected:', userId, connectionId);
        this.activeUsers.delete(userId);
        
        const connection = this.connections.get(connectionId);
        if (connection) {
          // Remove from all chat rooms
          connection.rooms.forEach(room => {
            if (this.chatRooms.has(room)) {
              this.chatRooms.get(room).delete(userId);
              if (this.chatRooms.get(room).size === 0) {
                this.chatRooms.delete(room);
              }
            }
          });
        }
        
        this.connections.delete(connectionId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error for user', userId, ':', error);
      });

      // Send connection confirmation
      this.sendMessage(ws, { type: 'connected', data: { connectionId, userId } });
    });
  }

  generateConnectionId() {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { ws, userId } = connection;

    switch (message.type) {
      case 'join_room':
        this.handleJoinRoom(connectionId, message.data);
        break;
      case 'leave_room':
        this.handleLeaveRoom(connectionId, message.data);
        break;
      case 'send_message':
        this.handleSendMessage(connectionId, message.data);
        break;
      default:
        this.sendMessage(ws, { type: 'error', data: { message: 'Unknown message type' } });
    }
  }

  handleJoinRoom(connectionId, room) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.rooms.add(room);
    
    if (!this.chatRooms.has(room)) {
      this.chatRooms.set(room, new Set());
    }
    this.chatRooms.get(room).add(connection.userId);
    
    this.sendMessage(connection.ws, { type: 'room_joined', data: { room } });
  }

  handleLeaveRoom(connectionId, room) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.rooms.delete(room);
    
    if (this.chatRooms.has(room)) {
      this.chatRooms.get(room).delete(connection.userId);
      if (this.chatRooms.get(room).size === 0) {
        this.chatRooms.delete(room);
      }
    }
    
    this.sendMessage(connection.ws, { type: 'room_left', data: { room } });
  }

  handleSendMessage(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { room, message } = data;
    
    if (!room || !message) {
      this.sendMessage(connection.ws, { type: 'error', data: { message: 'Room and message are required' } });
      return;
    }

    // Broadcast to all users in the room
    if (this.chatRooms.has(room)) {
      const messageData = {
        type: 'new_message',
        data: {
          room,
          message,
          sender: connection.userId,
          timestamp: new Date().toISOString()
        }
      };

      this.chatRooms.get(room).forEach(userId => {
        const userConnectionId = this.activeUsers.get(userId);
        if (userConnectionId) {
          const userConnection = this.connections.get(userConnectionId);
          if (userConnection) {
            this.sendMessage(userConnection.ws, messageData);
          }
        }
      });
    }
  }

  sendMessage(ws, message) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }

  setupTools() {
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'send_realtime_message',
            description: 'Send real-time messages through WebSocket',
            inputSchema: {
              type: 'object',
              properties: {
                room: { type: 'string', description: 'Chat room ID' },
                message: { type: 'string', description: 'Message content' },
                userId: { type: 'string', description: 'Sender user ID' }
              },
              required: ['room', 'message', 'userId']
            }
          },
          {
            name: 'join_chat_room',
            description: 'Join a chat room for real-time communication',
            inputSchema: {
              type: 'object',
              properties: {
                room: { type: 'string', description: 'Chat room ID' },
                userId: { type: 'string', description: 'User ID to join' }
              },
              required: ['room', 'userId']
            }
          },
          {
            name: 'leave_chat_room',
            description: 'Leave a chat room',
            inputSchema: {
              type: 'object',
              properties: {
                room: { type: 'string', description: 'Chat room ID' },
                userId: { type: 'string', description: 'User ID to leave' }
              },
              required: ['room', 'userId']
            }
          },
          {
            name: 'get_active_users',
            description: 'Get list of currently active users',
            inputSchema: {
              type: 'object',
              properties: {
                room: { type: 'string', description: 'Optional room filter' }
              }
            }
          },
          {
            name: 'broadcast_notification',
            description: 'Broadcast civic notifications to all users',
            inputSchema: {
              type: 'object',
              properties: {
                type: { 
                  type: 'string', 
                  enum: ['emergency', 'community', 'event'],
                  description: 'Notification type'
                },
                message: { type: 'string', description: 'Notification message' },
                location: { type: 'string', description: 'Optional geo coordinates' }
              },
              required: ['type', 'message']
            }
          },
          {
            name: 'get_chat_history',
            description: 'Get chat history for a room',
            inputSchema: {
              type: 'object',
              properties: {
                room: { type: 'string', description: 'Chat room ID' },
                limit: { type: 'number', description: 'Number of messages to retrieve', default: 50 }
              },
              required: ['room']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'send_realtime_message':
          return this.sendRealtimeMessage(args);
        case 'join_chat_room':
          return this.joinChatRoom(args);
        case 'leave_chat_room':
          return this.leaveChatRoom(args);
        case 'get_active_users':
          return this.getActiveUsers(args);
        case 'broadcast_notification':
          return this.broadcastNotification(args);
        case 'get_chat_history':
          return this.getChatHistory(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async sendRealtimeMessage({ room, message, userId }) {
    const messageData = {
      id: Date.now().toString(),
      userId,
      message,
      timestamp: new Date().toISOString(),
      room
    };

    // Broadcast to all users in the room
    if (this.chatRooms.has(room)) {
      const broadcastMessage = {
        type: 'new_message',
        data: messageData
      };

      this.chatRooms.get(room).forEach(userId => {
        const userConnectionId = this.activeUsers.get(userId);
        if (userConnectionId) {
          const userConnection = this.connections.get(userConnectionId);
          if (userConnection) {
            this.sendMessage(userConnection.ws, broadcastMessage);
          }
        }
      });
    }
    
    return {
      content: [{
        type: 'text',
        text: `Message sent to room ${room}: "${message}"`
      }]
    };
  }

  async joinChatRoom({ room, userId }) {
    const connectionId = this.activeUsers.get(userId);
    if (connectionId) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.rooms.add(room);
        if (!this.chatRooms.has(room)) {
          this.chatRooms.set(room, new Set());
        }
        this.chatRooms.get(room).add(userId);
      }
    }

    return {
      content: [{
        type: 'text',
        text: `User ${userId} joined room ${room}`
      }]
    };
  }

  async leaveChatRoom({ room, userId }) {
    const connectionId = this.activeUsers.get(userId);
    if (connectionId) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.rooms.delete(room);
        if (this.chatRooms.has(room)) {
          this.chatRooms.get(room).delete(userId);
          if (this.chatRooms.get(room).size === 0) {
            this.chatRooms.delete(room);
          }
        }
      }
    }

    return {
      content: [{
        type: 'text',
        text: `User ${userId} left room ${room}`
      }]
    };
  }

  async getActiveUsers({ room }) {
    let users;
    if (room && this.chatRooms.has(room)) {
      users = Array.from(this.chatRooms.get(room));
    } else {
      users = Array.from(this.activeUsers.keys());
    }

    return {
      content: [{
        type: 'text',
        text: `Active users${room ? ` in room ${room}` : ''}: ${users.join(', ')}`
      }]
    };
  }

  async broadcastNotification({ type, message, location }) {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      location,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all connected users
    const broadcastMessage = {
      type: 'civic_notification',
      data: notification
    };

    this.connections.forEach(connection => {
      this.sendMessage(connection.ws, broadcastMessage);
    });

    return {
      content: [{
        type: 'text',
        text: `Broadcast ${type} notification: "${message}"${location ? ` at ${location}` : ''}`
      }]
    };
  }

  async getChatHistory({ room, limit = 50 }) {
    // In a real implementation, this would query a database
    // For now, return a mock response
    return {
      content: [{
        type: 'text',
        text: `Chat history for room ${room} (last ${limit} messages) - would be retrieved from database`
      }]
    };
  }

  async start() {
    const port = process.env.WEBSOCKET_PORT || 8080;
    
    this.httpServer.listen(port, () => {
      console.log(`WebSocket MCP Server listening on port ${port}`);
    });

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('WebSocket MCP Server started');
  }
}

// Start the server if this file is executed directly
if (require.main === module) {
  const server = new WebSocketMCPServer();
  server.start().catch(console.error);
}

module.exports = WebSocketMCPServer;