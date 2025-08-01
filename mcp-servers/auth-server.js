#!/usr/bin/env node

/*
 * Copyright © 2025 GALAX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GALAX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */

/**
 * GALAX JWT Authentication MCP Server
 * Authentication and authorization server for the GALAX platform
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthMCPServer {
  constructor() {
    this.server = new Server({
      name: 'GALAX JWT Authentication MCP Server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    this.tokenExpiry = process.env.TOKEN_EXPIRY || '3600'; // 1 hour default
    this.refreshTokens = new Map(); // In production, use Redis or database
    this.userPermissions = new Map(); // Mock user permissions storage
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'verify_jwt_token',
            description: 'Verify and decode a JWT token',
            inputSchema: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'JWT token to verify' },
                ignoreExpiration: { type: 'boolean', description: 'Whether to ignore token expiration', default: false }
              },
              required: ['token']
            }
          },
          {
            name: 'generate_access_token',
            description: 'Generate a new access token for a user',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'string', description: 'User ID' },
                username: { type: 'string', description: 'Username' },
                email: { type: 'string', description: 'User email' },
                roles: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'User roles/permissions',
                  default: ['user']
                },
                customClaims: {
                  type: 'object',
                  description: 'Additional custom claims to include in token'
                }
              },
              required: ['userId', 'username', 'email']
            }
          },
          {
            name: 'refresh_token',
            description: 'Refresh an access token using a refresh token',
            inputSchema: {
              type: 'object',
              properties: {
                refreshToken: { type: 'string', description: 'Refresh token' },
                userId: { type: 'string', description: 'User ID for validation' }
              },
              required: ['refreshToken', 'userId']
            }
          },
          {
            name: 'validate_user_permissions',
            description: 'Validate if a user has specific permissions',
            inputSchema: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'JWT token' },
                requiredPermissions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of required permissions'
                },
                resource: { type: 'string', description: 'Optional resource identifier' }
              },
              required: ['token', 'requiredPermissions']
            }
          },
          {
            name: 'get_user_profile',
            description: 'Get user profile information from token',
            inputSchema: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'JWT token' },
                includePermissions: { type: 'boolean', description: 'Include user permissions in response', default: true }
              },
              required: ['token']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'verify_jwt_token':
          return this.verifyJwtToken(args);
        case 'generate_access_token':
          return this.generateAccessToken(args);
        case 'refresh_token':
          return this.refreshToken(args);
        case 'validate_user_permissions':
          return this.validateUserPermissions(args);
        case 'get_user_profile':
          return this.getUserProfile(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async verifyJwtToken({ token, ignoreExpiration = false }) {
    try {
      const options = ignoreExpiration ? { ignoreExpiration: true } : {};
      const decoded = jwt.verify(token, this.jwtSecret, options);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            valid: true,
            decoded,
            tokenInfo: {
              userId: decoded.userId,
              username: decoded.username,
              email: decoded.email,
              roles: decoded.roles,
              iat: new Date(decoded.iat * 1000).toISOString(),
              exp: new Date(decoded.exp * 1000).toISOString()
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            valid: false,
            error: error.message,
            errorType: error.name
          }, null, 2)
        }]
      };
    }
  }

  async generateAccessToken({ userId, username, email, roles = ['user'], customClaims = {} }) {
    try {
      const payload = {
        userId,
        username,
        email,
        roles,
        ...customClaims,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + parseInt(this.tokenExpiry)
      };

      const accessToken = jwt.sign(payload, this.jwtSecret);

      // Generate refresh token
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const refreshTokenExpiry = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days

      // Store refresh token (in production, use database)
      this.refreshTokens.set(refreshToken, {
        userId,
        expiry: refreshTokenExpiry
      });

      // Store user permissions (mock)
      this.userPermissions.set(userId, {
        roles,
        permissions: this.getRolePermissions(roles),
        lastUpdated: new Date().toISOString()
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: this.tokenExpiry,
            refreshTokenExpiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
            user: {
              userId,
              username,
              email,
              roles
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  async refreshToken({ refreshToken, userId }) {
    try {
      const storedToken = this.refreshTokens.get(refreshToken);

      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }

      if (storedToken.userId !== userId) {
        throw new Error('Refresh token does not match user');
      }

      if (storedToken.expiry < Math.floor(Date.now() / 1000)) {
        this.refreshTokens.delete(refreshToken);
        throw new Error('Refresh token has expired');
      }

      // Get user permissions
      const userPerms = this.userPermissions.get(userId);
      if (!userPerms) {
        throw new Error('User permissions not found');
      }

      // Generate new access token
      const payload = {
        userId,
        username: `user_${userId}`, // In production, get from database
        email: `user_${userId}@example.com`, // In production, get from database
        roles: userPerms.roles,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + parseInt(this.tokenExpiry)
      };

      const newAccessToken = jwt.sign(payload, this.jwtSecret);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            accessToken: newAccessToken,
            tokenType: 'Bearer',
            expiresIn: this.tokenExpiry,
            refreshToken // Keep the same refresh token
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  async validateUserPermissions({ token, requiredPermissions, resource }) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const userPerms = this.userPermissions.get(decoded.userId);

      if (!userPerms) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              hasPermission: false,
              reason: 'User permissions not found'
            }, null, 2)
          }]
        };
      }

      const userPermissions = userPerms.permissions;
      const hasAllPermissions = requiredPermissions.every(perm =>
        userPermissions.includes(perm) || userPermissions.includes('*')
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            hasPermission: hasAllPermissions,
            userPermissions,
            requiredPermissions,
            resource,
            userId: decoded.userId,
            roles: decoded.roles
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            hasPermission: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  async getUserProfile({ token, includePermissions = true }) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const userPerms = this.userPermissions.get(decoded.userId);

      const profile = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        roles: decoded.roles,
        tokenInfo: {
          issuedAt: new Date(decoded.iat * 1000).toISOString(),
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          timeUntilExpiry: decoded.exp - Math.floor(Date.now() / 1000)
        }
      };

      if (includePermissions && userPerms) {
        profile.permissions = userPerms.permissions;
        profile.permissionsLastUpdated = userPerms.lastUpdated;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(profile, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            errorType: error.name
          }, null, 2)
        }]
      };
    }
  }

  getRolePermissions(roles) {
    // Mock permission mapping - in production, this would come from database
    const rolePermissions = {
      admin: ['*'], // All permissions
      moderator: [
        'user:read', 'user:update', 'content:moderate', 'reports:read',
        'community:manage', 'events:manage'
      ],
      civic_leader: [
        'user:read', 'community:manage', 'events:manage', 'civic_issues:manage',
        'announcements:create'
      ],
      user: [
        'profile:read', 'profile:update', 'community:participate', 'events:participate',
        'civic_issues:report', 'help_requests:create', 'help_requests:respond'
      ],
      verified_user: [
        'profile:read', 'profile:update', 'community:participate', 'events:participate',
        'civic_issues:report', 'help_requests:create', 'help_requests:respond',
        'governance:vote'
      ]
    };

    const permissions = new Set();
    roles.forEach(role => {
      const rolePerms = rolePermissions[role] || [];
      rolePerms.forEach(perm => permissions.add(perm));
    });

    return Array.from(permissions);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Auth MCP Server started');
  }
}

// Start the server if this file is executed directly
if (require.main === module) {
  const server = new AuthMCPServer();
  server.start().catch(console.error);
}

module.exports = AuthMCPServer;