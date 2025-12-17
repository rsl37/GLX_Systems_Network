#!/usr/bin/env node
/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: roselleroberts@pm.me for licensing inquiries
 */

/**
 * GLX Realtime MCP Server
 * Real-time communication server using SSE for the GLX Civic Networking App
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { createServer } = require('http');
const jwt = require('jsonwebtoken');
const { validateEnv, BASE_ENV_SCHEMA, hashSecretForLogging } = require('./lib/env-validator');
const { validateString, validateId, validateInteger, validateArray } = require('./lib/input-validator');
const { Logger } = require('./lib/logger');

class RealtimeMCPServer {
  constructor() {
    this.server = new Server({
      name: 'GLX Realtime MCP Server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.httpServer = createServer();
    this.activeUsers = new Map();
    this.chatRooms = new Map();
    this.sseConnections = new Map();
    this.setupHttpHandlers();
    this.setupTools();
  }

  setupHttpHandlers() {
    this.httpServer.on('request', (req, res) => {
      const url = new URL(req.url, 'http://localhost');

      if (url.pathname === '/mcp-realtime/events') {
        this.handleSSEConnection(req, res);
      } else if (url.pathname === '/mcp-realtime/send-message' && req.method === 'POST') {
        this.handleMessageSend(req, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
  }

  handleSSEConnection(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        userId = decoded.userId;
      } catch (error) {
        console.error('JWT verification failed:', error);
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const connectionId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store connection
    this.sseConnections.set(connectionId, { userId, response: res });

    if (userId) {
      this.activeUsers.set(userId, connectionId);
    }

    // Send initial connection event
    res.write(
      `data: ${JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: Date.now(),
      })}\n\n`
    );

    // Handle client disconnect
    req.on('close', () => {
      this.sseConnections.delete(connectionId);
      if (userId) {
        this.activeUsers.delete(userId);
      }
      console.log(`SSE connection closed: ${connectionId}`);
    });

    console.log(`SSE connection established: ${connectionId}, User: ${userId || 'Anonymous'}`);
  }

  handleMessageSend(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { roomId, message, userId } = JSON.parse(body);

        // Broadcast to room
        this.broadcastToRoom(roomId, {
          type: 'new_message',
          data: { message, userId, timestamp: Date.now() },
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  }

  setupTools() {
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'send_realtime_message',
            description: 'Send a real-time message via SSE',
            inputSchema: {
              type: 'object',
              properties: {
                roomId: { type: 'string', description: 'Chat room ID' },
                message: { type: 'string', description: 'Message content' },
                userId: { type: 'number', description: 'User ID' },
              },
              required: ['roomId', 'message', 'userId'],
            },
          },
          {
            name: 'get_active_users',
            description: 'Get list of active users',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'broadcast_message',
            description: 'Broadcast message to all connected users',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Message to broadcast' },
                type: { type: 'string', description: 'Message type' },
              },
              required: ['message', 'type'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler('tools/call', async request => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'send_realtime_message':
          return this.handleSendMessage(args);
        case 'get_active_users':
          return this.handleGetActiveUsers();
        case 'broadcast_message':
          return this.handleBroadcastMessage(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  handleSendMessage(args) {
    const { roomId, message, userId } = args;
    
    validateString(roomId, { required: true, minLength: 1, maxLength: 256 });
    validateString(message, { required: true, minLength: 1, maxLength: 10000 });
    validateInteger(userId, { required: true, min: 1 });

    try {
      this.broadcastToRoom(roomId, {
        type: 'new_message',
        data: { message, userId, timestamp: Date.now() },
      });

      return {
        content: [
          {
            type: 'text',
            text: `Message sent to room ${roomId}: "${message}"`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  handleGetActiveUsers() {
    const activeUsersList = Array.from(this.activeUsers.keys());
    return {
      content: [
        {
          type: 'text',
          text: `Active users: ${activeUsersList.length}\n${activeUsersList.join(', ')}`,
        },
      ],
    };
  }

  handleBroadcastMessage(args) {
    const { message, type } = args;
    
    validateString(message, { required: true, minLength: 1, maxLength: 10000 });
    validateString(type, { required: true, minLength: 1, maxLength: 100 });

    try {
      this.broadcastToAll({
        type: type || 'announcement',
        data: { message, timestamp: Date.now() },
      });

      return {
        content: [
          {
            type: 'text',
            text: `Broadcast sent to ${this.sseConnections.size} connections`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to broadcast: ${error.message}`);
    }
  }

  broadcastToRoom(roomId, messageData) {
    const room = this.chatRooms.get(roomId) || [];
    let sentCount = 0;

    for (const connectionId of room) {
      const connection = this.sseConnections.get(connectionId);
      if (connection && !connection.response.destroyed) {
        connection.response.write(`data: ${JSON.stringify(messageData)}\n\n`);
        sentCount++;
      }
    }

    console.log(`Broadcast to room ${roomId}: ${sentCount} recipients`);
    return sentCount;
  }

  broadcastToAll(messageData) {
    let sentCount = 0;

    for (const connection of this.sseConnections.values()) {
      if (!connection.response.destroyed) {
        connection.response.write(`data: ${JSON.stringify(messageData)}\n\n`);
        sentCount++;
      }
    }

    console.log(`Global broadcast: ${sentCount} recipients`);
    return sentCount;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Start HTTP server for SSE connections
    const PORT = process.env.MCP_REALTIME_PORT || 3003;
    this.httpServer.listen(PORT, () => {
      console.log(`GLX Realtime MCP Server listening on port ${PORT}`);
      console.log('SSE endpoint: /mcp-realtime/events');
      console.log('Message endpoint: /mcp-realtime/send-message');
    });
  }
}

const server = new RealtimeMCPServer();
server.run().catch(console.error);
