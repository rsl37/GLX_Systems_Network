import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import WebSocket from 'ws';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import WebSocketManager from '../../server/webSocketManager.js';

describe('WebSocket Real-time Communication Tests', () => {
  let server: any;
  let wss: WebSocketServer;
  let webSocketManager: WebSocketManager;
  let client: WebSocket;
  const port = 3002;

  beforeAll(async () => {
    // Create HTTP server
    server = createServer();
    
    // Create WebSocket server
    wss = new WebSocketServer({ 
      server,
      path: '/websocket',
      clientTracking: true,
      maxPayload: 1e6, // 1MB
    });

    // Initialize WebSocket manager
    webSocketManager = new WebSocketManager(wss);

    // Start server
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        console.log(`Test WebSocket server listening on port ${port}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await webSocketManager.shutdown();
    server.close();
  });

  beforeEach(async () => {
    // Create fresh client for each test
    client = new WebSocket(`ws://localhost:${port}/websocket`);
    
    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      client.on('open', () => resolve());
      client.on('error', reject);
    });
  });

  afterEach(() => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  const sendMessage = (message: any) => {
    return new Promise<any>((resolve, reject) => {
      const messageId = Math.random().toString(36);
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 5000);

      const handleMessage = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          clearTimeout(timeout);
          client.off('message', handleMessage);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

      client.on('message', handleMessage);
      client.send(JSON.stringify({ ...message, messageId }));
    });
  };

  test('should establish WebSocket connection', async () => {
    expect(client.readyState).toBe(WebSocket.OPEN);
    
    // Should receive connection confirmation
    const response = await new Promise<any>((resolve) => {
      client.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
    
    expect(response.type).toBe('connected');
    expect(response.data.connectionId).toBeDefined();
  });

  test('should handle authentication flow', async () => {
    // Skip initial connection message
    await new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    // Mock JWT token (in real app this would be a valid JWT)
    const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.' + 
                     Buffer.from(JSON.stringify({ userId: 1 })).toString('base64') + 
                     '.signature';

    // Send authentication message
    client.send(JSON.stringify({
      type: 'authenticate',
      data: mockToken
    }));

    // Wait for auth response
    const response = await new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_error' || message.type === 'authenticated') {
          resolve(message);
        }
      });
    });

    // Should receive auth error (since we don't have real user in test DB)
    expect(response.type).toBe('auth_error');
    expect(response.data.message).toBeDefined();
  });

  test('should handle ping/pong heartbeat', async () => {
    // Skip initial connection message
    await new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    const timestamp = Date.now();
    
    // Send ping
    client.send(JSON.stringify({
      type: 'ping',
      data: { timestamp }
    }));

    // Wait for pong response
    const response = await new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          resolve(message);
        }
      });
    });

    expect(response.type).toBe('pong');
    expect(response.data.timestamp).toBe(timestamp);
  });

  test('should handle room operations without authentication', async () => {
    // Skip initial connection message
    await new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    // Try to join room without authentication
    client.send(JSON.stringify({
      type: 'join_help_request',
      data: 123
    }));

    // Should receive error
    const response = await new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          resolve(message);
        }
      });
    });

    expect(response.type).toBe('error');
    expect(response.data.message).toBe('Not authenticated');
  });

  test('should handle message sending without authentication', async () => {
    // Skip initial connection message
    await new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    // Try to send message without authentication
    client.send(JSON.stringify({
      type: 'send_message',
      data: {
        helpRequestId: 123,
        message: 'Test message'
      }
    }));

    // Should receive error
    const response = await new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          resolve(message);
        }
      });
    });

    expect(response.type).toBe('error');
    expect(response.data.message).toBe('Not authenticated');
  });

  test('should handle connection retry mechanism', async () => {
    // Skip initial connection message
    await new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    // Send retry connection request
    client.send(JSON.stringify({
      type: 'retry_connection'
    }));

    // Wait for retry response
    const response = await new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connection_retry') {
          resolve(message);
        }
      });
    });

    expect(response.type).toBe('connection_retry');
    expect(response.data.attempt).toBeGreaterThan(0);
    expect(response.data.maxRetries).toBeDefined();
  });

  test('should handle malformed messages gracefully', async () => {
    // Skip initial connection message
    await new Promise<void>((resolve) => {
      client.on('message', () => resolve());
    });

    // Send malformed JSON
    client.send('invalid json');

    // Send message with invalid type
    client.send(JSON.stringify({
      type: 'unknown_type',
      data: {}
    }));

    // Should receive error response
    const response = await new Promise<any>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          resolve(message);
        }
      });
    });

    expect(response.type).toBe('error');
    expect(response.data.message).toBeDefined();
  });

  test('should track connection health', () => {
    const health = webSocketManager.getHealthStatus();
    
    expect(health.activeConnections).toBeGreaterThan(0);
    expect(health.retryAttempts).toBeGreaterThanOrEqual(0);
    expect(health.timestamp).toBeDefined();
  });

  test('should handle connection cleanup on close', async () => {
    const initialConnections = webSocketManager.getConnectionCount();
    
    // Close connection
    client.close();
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalConnections = webSocketManager.getConnectionCount();
    expect(finalConnections).toBeLessThan(initialConnections);
  });

  test('should broadcast messages correctly', async () => {
    const testMessage = {
      type: 'test_broadcast',
      data: { message: 'Hello everyone!' }
    };

    // Create second client to receive broadcast
    const client2 = new WebSocket(`ws://localhost:${port}/websocket`);
    
    await new Promise<void>((resolve, reject) => {
      client2.on('open', () => resolve());
      client2.on('error', reject);
    });

    // Skip initial connection messages for both clients
    await Promise.all([
      new Promise<void>((resolve) => client.on('message', () => resolve())),
      new Promise<void>((resolve) => client2.on('message', () => resolve()))
    ]);

    // Broadcast message
    webSocketManager.broadcast(testMessage);

    // Both clients should receive the message
    const [response1, response2] = await Promise.all([
      new Promise<any>((resolve) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'test_broadcast') {
            resolve(message);
          }
        });
      }),
      new Promise<any>((resolve) => {
        client2.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'test_broadcast') {
            resolve(message);
          }
        });
      })
    ]);

    expect(response1.type).toBe('test_broadcast');
    expect(response1.data.message).toBe('Hello everyone!');
    expect(response2.type).toBe('test_broadcast');
    expect(response2.data.message).toBe('Hello everyone!');

    client2.close();
  });
});