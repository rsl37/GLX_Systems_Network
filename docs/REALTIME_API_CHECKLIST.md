---
title: "Recommended Hybrid Communication and Dispatch Architecture"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "api-reference"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# Recommended Hybrid Communication and Dispatch Architecture

This document summarizes the recommended hybrid communication and dispatch architecture that integrates various technologies to enhance crisis management and communication. The architecture consists of the following components:

1. **Crisis/Incident Dispatch and Status Management**: Managed by **Resgrid**.
2. **Chat, Messaging, and Notifications**: Handled by **Socket.io** (local/self-hosted) for real-time communication, and/or **Ably** for scalable, cloud, and global implementation.
3. **SMS/Voice Features**: Integrated through **Vonage** for effective communication during crises.

---

# Real-time API Checklist

## Implementation Status

- [x] **Crisis/Incident Dispatch**: Resgrid integration complete (`server/communications/resgrid.ts`)
- [x] **Chat Feature**: Socket.io provider implemented (`server/communications/socketio.ts`)
- [x] **Messaging Notifications**: Ably scaffold ready (`server/communications/globalMessaging.ts`)
- [x] **SMS Integration**: Vonage SMS implemented (`server/communications/vonage.ts`)
- [x] **Voice Communication**: Vonage voice calls implemented (`server/communications/vonage.ts`)
- [x] **Communication Manager**: Unified interface created (`server/communications/index.ts`)
- [x] **API Routes**: REST endpoints implemented (`server/routes/communications.ts`)
- [x] **Tests**: Comprehensive test suite (`tests/communications/`)

---

## API Endpoints Reference

### Health & Configuration
- `GET /api/communications/health` - Provider health status
- `GET /api/communications/config` - Configuration (auth required)

### Incident Management (Resgrid)
- `POST /api/communications/incidents` - Create incident
- `GET /api/communications/incidents` - List incidents
- `GET /api/communications/incidents/:id` - Get incident
- `PATCH /api/communications/incidents/:id` - Update incident
- `POST /api/communications/incidents/:id/dispatch` - Dispatch units

### Unit Management
- `GET /api/communications/units` - List units
- `PATCH /api/communications/units/:id/status` - Update unit status

### Escalation (Vonage)
- `POST /api/communications/escalate/sms` - Send SMS
- `POST /api/communications/escalate/voice` - Initiate voice call
- `POST /api/communications/escalate/broadcast` - Bulk SMS

### Webhooks
- `POST /api/communications/webhooks/resgrid` - Resgrid events
- `POST /api/communications/webhooks/vonage` - Vonage status updates

---

## Environment Variables

```bash
# Provider Selection
COMM_DEFAULT_PROVIDER=socketio

# Resgrid
RESGRID_API_KEY=
RESGRID_API_URL=https://api.resgrid.com/api/v1
RESGRID_DEPARTMENT_ID=

# Socket.io (default provider)
SOCKETIO_ENABLED=true
SOCKETIO_PATH=/socket.io

# Ably
ABLY_API_KEY=
ABLY_CLIENT_ID=

# Vonage
VONAGE_API_KEY=
VONAGE_API_SECRET=
VONAGE_FROM_NUMBER=

# Escalation
ESCALATION_ENABLE_SMS=true
ESCALATION_ENABLE_VOICE=true
ESCALATION_PRIORITY_THRESHOLD=high
```

---

## Next Steps

1. Configure Resgrid account and department
2. Set up Vonage account for SMS/voice
3. Deploy and test in staging environment
4. Implement Ably when scaling globally
