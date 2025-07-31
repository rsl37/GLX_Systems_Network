import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import WebSocketManager from '../../server/webSocketManager.js';

// Test server setup utility
export class TestServer {
  public app: express.Application;
  public server: any;
  public wss: WebSocketServer;
  public webSocketManager: WebSocketManager;
  public port: number;
  public baseUrl: string;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/websocket',
      clientTracking: true,
      maxPayload: 1e6, // 1MB
    });
    this.webSocketManager = new WebSocketManager(this.wss);
    this.port = 0; // Let system assign available port
    this.baseUrl = '';
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(0, (err: any) => {
        if (err) {
          reject(err);
        } else {
          this.port = this.server.address()?.port || 0;
          this.baseUrl = `http://localhost:${this.port}`;
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise(async (resolve) => {
      await this.webSocketManager.shutdown();
      this.server.close(() => {
        resolve();
      });
    });
  }

  // Setup basic middleware
  setupBasicMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  // Create test WebSocket client
  createWebSocketClient() {
    const WebSocket = require('ws');
    return new WebSocket(`ws://localhost:${this.port}/websocket`);
  }
}

// Mock database operations for testing
export const mockDb = {
  users: [] as any[],
  helpRequests: [] as any[],
  
  clear() {
    this.users = [];
    this.helpRequests = [];
  },

  addUser(user: any) {
    const id = this.users.length + 1;
    const newUser = { id, ...user };
    this.users.push(newUser);
    return newUser;
  },

  findUser(criteria: any) {
    return this.users.find(user => {
      return Object.keys(criteria).every(key => user[key] === criteria[key]);
    });
  },

  addHelpRequest(request: any) {
    const id = this.helpRequests.length + 1;
    const newRequest = { id, ...request, created_at: new Date() };
    this.helpRequests.push(newRequest);
    return newRequest;
  }
};