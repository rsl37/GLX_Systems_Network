/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GLX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */


import express from 'express';
import { createServer } from 'http';
import RealtimeManager from '../../server/realtimeManager.js';

// Test server setup utility (Socket.IO removed for Vercel compatibility)
export class TestServer {
  public app: express.Application;
  public server: any;
  public realtimeManager: RealtimeManager;
  public port: number;
  public baseUrl: string;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.realtimeManager = new RealtimeManager();
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
      this.realtimeManager.shutdown();
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

  // Create mock client for HTTP polling tests
  createHttpClient() {
    return {
      baseUrl: this.baseUrl,
      // Mock HTTP client for testing polling functionality
      poll: async (endpoint: string) => {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        return response.json();
      },
      post: async (endpoint: string, data: any) => {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return response.json();
      }
    };
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