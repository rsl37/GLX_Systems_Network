# GLX Civic Networking Platform: Hybrid Communication & Incident System Overview

This document outlines the recommended hybrid system for real-time chat, notifications, incident/dispatch management, and critical communications—optimized for flexibility, cost, scalability, and reliability.

---

## **Implementation Status**

✅ **Implemented** - The hybrid communication system is now fully integrated into the GLX platform.

| Component | Status | Location |
|-----------|--------|----------|
| Communication Types & Interfaces | ✅ Complete | `server/communications/types.ts` |
| Resgrid Integration | ✅ Complete | `server/communications/resgrid.ts` |
| Socket.io Provider | ✅ Complete | `server/communications/socketio.ts` |
| Ably Global Messaging | ✅ Complete | `server/communications/globalMessaging.ts` |
| Vonage SMS/Voice | ✅ Complete | `server/communications/vonage.ts` |
| Communication Manager | ✅ Complete | `server/communications/index.ts` |
| API Routes | ✅ Complete | `server/routes/communications.ts` |
| Tests | ✅ Complete | `tests/communications/` |

---

## **Hybrid Approach Overview**

- **Incident/Dispatch Management:**  
  Use **Resgrid** for turnkey incident/dispatch workflows, crisis coordination, unit/resource tracking, and team status updates.

- **Real-time Chat & Notifications (General Purpose):**  
  Use **Socket.io** for low-latency, custom chat, notifications, feeds, volunteer comms, and general in-app messaging.  
  For broader/global reach or heavier scale, integrate **Ably**.

- **SMS/Voice Escalation:**  
  Use **Vonage** for immediate, critical alerts via SMS/voice calls—used for escalation, backup channels, or reaching users outside the platform.

---

## **Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Communication Manager                         │
│                  (server/communications/index.ts)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Realtime   │  │   Dispatch   │  │  Escalation  │          │
│  │   Provider   │  │   Provider   │  │   Provider   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐          │
│  │  Pusher      │  │   Resgrid    │  │    Vonage    │          │
│  │  Socket.io   │  │              │  │              │          │
│  │  Ably        │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## **Why This Approach?**

- **Flexibility:** Customizable features for civic networking, volunteering, community updates, and messaging.
- **Low Cost:** Start with open-source (Socket.io); add managed/global services only when needed.
- **Scalability:** Seamlessly expand from local use to national/global deployments with Ably and Resgrid.
- **Granular Integration:** Plug in custom business logic, roles, permissions, workflows for both crisis response and everyday networking.
- **Turnkey Dispatch:** Resgrid accelerates emergency response, minimizing engineering effort for critical workflows.
- **Multi-purpose Communication:** Each component covers its niche, preventing lock-in and maximizing adaptability.

---

## **Quick Start**

### 1. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Default communication provider
COMM_DEFAULT_PROVIDER=socketio

# Resgrid (Incident/Dispatch)
RESGRID_API_KEY=your-api-key
RESGRID_API_URL=https://api.resgrid.com/api/v1
RESGRID_DEPARTMENT_ID=your-dept-id

# Socket.io (Default Real-time Provider)
SOCKETIO_ENABLED=true
SOCKETIO_PATH=/socket.io

# Ably (Global Real-time Messaging)
ABLY_API_KEY=your-ably-api-key
ABLY_CLIENT_ID=glx-server

# Vonage (SMS/Voice)
VONAGE_API_KEY=your-api-key
VONAGE_API_SECRET=your-api-secret
VONAGE_FROM_NUMBER=+1234567890

# Escalation Settings
ESCALATION_ENABLE_SMS=true
ESCALATION_ENABLE_VOICE=true
ESCALATION_PRIORITY_THRESHOLD=high
```

### 2. API Endpoints

All communication endpoints are available under `/api/communications/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health status of all providers |
| `/config` | GET | Current configuration (auth required) |
| `/incidents` | POST | Create new incident |
| `/incidents` | GET | List incidents with filters |
| `/incidents/:id` | GET | Get incident by ID |
| `/incidents/:id` | PATCH | Update incident |
| `/incidents/:id/dispatch` | POST | Dispatch units to incident |
| `/units` | GET | List units with filters |
| `/units/:id/status` | PATCH | Update unit status |
| `/escalate/sms` | POST | Send SMS escalation |
| `/escalate/voice` | POST | Initiate voice call |
| `/escalate/broadcast` | POST | Broadcast SMS to multiple recipients |

### 3. Example Usage

#### Create an Incident

```javascript
const response = await fetch('/api/communications/incidents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Building Fire',
    description: 'Fire reported at 123 Main St',
    severity: 'critical',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Main St, New York, NY'
    },
    type: 'fire'
  })
});
```

#### Send Emergency SMS

```javascript
const response = await fetch('/api/communications/escalate/sms', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '+1234567890',
    body: 'EMERGENCY: Evacuate building immediately',
    priority: 'emergency',
    incidentId: 'incident-123'
  })
});
```

---

## **When to Use Each Component**

| Feature                          | Recommended Service      | Usage Scenario                         |
| --------------------------------- | ----------------------- | -------------------------------------- |
| Incident/crisis dispatch          | Resgrid                 | Emergencies, public safety, coordination |
| Chat/volunteer messaging          | Socket.io               | In-app chat, volunteer groups, quick comms |
| Notifications/feeds/updates       | Socket.io/Ably          | Activity feeds, system notifications   |
| Global real-time scaling          | Ably                    | Large populations, global users        |
| SMS/voice alerts & escalation     | Vonage                  | Urgent messages, off-platform outreach |

---

## **Provider Switching**

To switch the default real-time provider, update the `COMM_DEFAULT_PROVIDER` environment variable:

```bash
# Use Socket.io (default)
COMM_DEFAULT_PROVIDER=socketio
SOCKETIO_ENABLED=true

# Use Ably (for global scaling)
COMM_DEFAULT_PROVIDER=ably
ABLY_API_KEY=your-api-key

# Use Pusher (if needed)
COMM_DEFAULT_PROVIDER=pusher
```

---

## **Security Considerations**

1. **Environment Variables**: All API keys and secrets are stored in environment variables, never in code.
2. **Authentication**: All API endpoints (except webhooks) require JWT authentication.
3. **Phone Validation**: Phone numbers are validated before SMS/voice operations.
4. **Webhook Security**: Resgrid webhooks support signature verification.
5. **Priority Thresholds**: SMS/voice escalation only triggers for messages above the configured priority threshold.

---

## **Testing**

Run the communication system tests:

```bash
# Run all communication tests
npm run test -- tests/communications

# Run specific test files
npm run test -- tests/communications/communications.test.ts
npm run test -- tests/communications/providers.test.ts
```

---

## **Extending the System**

### Adding a New Provider

1. Create a new provider class implementing the appropriate interface (`IRealtimeProvider`, `IDispatchProvider`, or `IEscalationProvider`)
2. Add configuration type to `types.ts`
3. Register in `CommunicationManager.initializeProviders()`
4. Add environment variable loading in `loadConfigFromEnv()`

### Example: Custom Provider

```typescript
import { IRealtimeProvider, ProviderHealthStatus } from './types.js';

export class CustomProvider implements IRealtimeProvider {
  readonly name = 'custom' as const;
  
  async connect(): Promise<void> {
    // Implementation
  }
  
  async subscribe(channel: string, callback: Function): Promise<void> {
    // Implementation
  }
  
  // ... other methods
}
```

---

## **Notes**

- Keep API credentials secure; never commit secrets to code repositories.
- Update this document as you expand features, add integrations, or scale your deployment.
- For code templates or further guidance, see the implementation in `server/communications/`.
