#!/usr/bin/env node

/**
 * GALAX WebSocket MCP Server
 * Real-time communication server for the GALAX Civic Networking App
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
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
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.activeUsers = new Map();
    this.chatRooms = new Map();
    this.setupSocketHandlers();
    this.setupTools();
  }

  setupSocketHandlers() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
          socket.userId = decoded.userId;
          next();
        } catch (err) {
          next(new Error('Authentication error'));
        }
      } else {
        next(new Error('No token provided'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.userId);
      this.activeUsers.set(socket.userId, socket.id);

      socket.on('join_room', (room) => {
        socket.join(room);
        if (!this.chatRooms.has(room)) {
          this.chatRooms.set(room, new Set());
        }
        this.chatRooms.get(room).add(socket.userId);
      });

      socket.on('leave_room', (room) => {
        socket.leave(room);
        if (this.chatRooms.has(room)) {
          this.chatRooms.get(room).delete(socket.userId);
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.userId);
        this.activeUsers.delete(socket.userId);
        
        // Remove from all chat rooms
        this.chatRooms.forEach((users, room) => {
          users.delete(socket.userId);
        });
      });
    });
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

    this.io.to(room).emit('new_message', messageData);
    
    return {
      content: [{
        type: 'text',
        text: `Message sent to room ${room}: "${message}"`
      }]
    };
  }

  async joinChatRoom({ room, userId }) {
    const socketId = this.activeUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(room);
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
    const socketId = this.activeUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(room);
        if (this.chatRooms.has(room)) {
          this.chatRooms.get(room).delete(userId);
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

    this.io.emit('civic_notification', notification);

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