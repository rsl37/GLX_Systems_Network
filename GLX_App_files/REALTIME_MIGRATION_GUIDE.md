---
title: "GLX Civic Platform - Real-Time Communication Guide"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "guide"
maintainer: "GLX Development Team"
version: "2.0.0"
tags: []
relatedDocs: []
---

# GLX Civic Platform - Real-Time Communication Guide

## Overview

This guide documents the real-time communication architecture using Socket.io and Ably in the GLX Civic Networking App. The platform now uses Socket.io as the primary real-time messaging solution, with Ably as an optional cloud-hosted alternative.

## Real-Time Architecture

### Primary: Socket.io
- **Self-hosted** real-time WebSocket communication
- **Full control** over message delivery and presence
- **Low latency** direct server-to-client connections

### Alternative: Ably
- **Cloud-hosted** real-time messaging service
- **Global CDN** for worldwide low-latency delivery
- **Managed infrastructure** with 99.999% uptime SLA

## Setup Instructions

### 1. Socket.io Configuration

Socket.io is the default real-time provider. No external account is required.

#### Environment Variables

```bash
# Socket.io Configuration (optional - for custom settings)
SOCKET_IO_URL=http://localhost:3000
```

### 2. Ably Configuration (Optional)

For cloud-hosted real-time messaging with Ably:

1. Sign up at [Ably.com](https://ably.com)
2. Create a new app in your dashboard
3. Note down your API Key

#### Environment Variables

```bash
# Ably Configuration
ABLY_API_KEY=your-ably-api-key
```

## Vonage SMS/Voice Configuration

Vonage is used for SMS and voice communications:

1. Sign up at [Vonage.com](https://vonage.com)
2. Get your API credentials

#### Environment Variables

```bash
# Vonage Configuration
VONAGE_API_KEY=your-vonage-api-key
VONAGE_API_SECRET=your-vonage-api-secret
```

## Features

### Real-Time Messaging
- Instant message delivery via WebSocket
- Automatic reconnection handling
- Connection state monitoring

### Presence Features
- Online/offline user status
- Typing indicators
- User join/leave notifications

### Private Channels
- Authenticated channel subscriptions
- Secure user-to-user messaging
- Room-based communication

## API Endpoints

### Real-Time
- `GET /api/realtime/health` - Real-time service health status
- WebSocket connection at server root

### Chat
- `POST /api/chat/send` - Send message + broadcast via Socket.io
- `GET /api/chat/{id}/messages` - Get message history
- `POST /api/chat/join` - Join room + broadcast join event
- `POST /api/chat/leave` - Leave room + broadcast leave event

## Code Examples

### Frontend Usage

```javascript
// useSocket hook handles Socket.io connection
const { sendMessage, joinRoom, messages, health } = useSocket(token);

// Join a help request chat room
await joinRoom('help_request_123');

// Send a message (broadcasts instantly via Socket.io)
await sendMessage('Hello!', 'help_request_123');

// Connection state
console.log(health.connected); // true/false
```

### Backend Integration

```javascript
// Broadcasting a message via Socket.io
io.to(`room-${helpRequestId}`).emit('new-message', {
  id: messageId,
  content: message,
  userId: senderId,
  username: senderName,
  timestamp: new Date().toISOString(),
});
```

## Civic Platform Features

- 🏛️ **Democratic Governance** - Real-time voting and proposal updates
- 🆘 **Crisis Management** - Instant emergency alerts and coordination
- 🤝 **Help Requests** - Live chat between help seekers and providers
- 📢 **Community Events** - Real-time event updates and coordination
- 🔔 **Notifications** - Instant delivery of important civic updates

## Troubleshooting

### Common Issues

1. **Messages not delivered in real-time**
   - Verify Socket.io server is running
   - Check browser network tab for WebSocket connections
   - Review server logs for connection errors

2. **Connection issues**
   - Verify CORS settings allow WebSocket connections
   - Check firewall settings for WebSocket ports
   - Monitor Socket.io connection logs in browser console

3. **Ably-specific issues**
   - Verify ABLY_API_KEY is set correctly
   - Check Ably dashboard for connection logs
   - Ensure API key has appropriate permissions

## Support

For technical issues:
1. Check server logs for real-time service errors
2. Review browser console for client-side issues
3. Monitor connection health via `/api/realtime/health`
4. For Ably: Contact Ably support for service-related problems
