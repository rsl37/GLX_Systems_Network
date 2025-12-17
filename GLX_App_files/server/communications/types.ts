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
 * Hybrid Communication System Types
 *
 * This module defines the interfaces and types for the hybrid communication
 * system that integrates multiple providers: Resgrid, Socket.io, Ably, and Vonage.
 */

// ============================================================================
// Core Communication Types
// ============================================================================

/**
 * Supported communication providers
 */
export type CommunicationProvider =
  | 'socketio' // Socket.io for low-latency chat (default)
  | 'ably' // Ably for global real-time messaging
  | 'resgrid' // Resgrid for incident/dispatch
  | 'vonage'; // Vonage for SMS/voice escalation

/**
 * Message priority levels for escalation
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'critical' | 'emergency';

/**
 * Channel types for different communication scenarios
 */
export type ChannelType =
  | 'public' // Public broadcast channel
  | 'private' // Authenticated private channel
  | 'presence' // Channel with user presence tracking
  | 'incident' // Crisis/incident coordination channel
  | 'notification' // User notification channel
  | 'dispatch'; // Emergency dispatch channel

// ============================================================================
// Real-time Messaging Types
// ============================================================================

/**
 * Base message structure for all real-time communications
 */
export interface RealtimeMessage {
  id: string;
  type: string;
  channel: string;
  data: unknown;
  timestamp: Date;
  priority: MessagePriority;
  senderId?: number;
  senderName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat message structure
 */
export interface ChatMessage extends RealtimeMessage {
  type: 'chat';
  data: {
    content: string;
    roomId: string;
    attachments?: Array<{
      type: 'image' | 'file' | 'link';
      url: string;
      name?: string;
    }>;
  };
}

/**
 * Notification message structure
 */
export interface NotificationMessage extends RealtimeMessage {
  type: 'notification';
  data: {
    title: string;
    body: string;
    actionUrl?: string;
    category?: string;
  };
}

// ============================================================================
// Incident/Dispatch Types (Resgrid)
// ============================================================================

/**
 * Incident severity levels
 */
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Incident status
 */
export type IncidentStatus =
  | 'pending'
  | 'dispatched'
  | 'en_route'
  | 'on_scene'
  | 'resolved'
  | 'cancelled';

/**
 * Unit/resource status for dispatch
 */
export type UnitStatus =
  | 'available'
  | 'busy'
  | 'en_route'
  | 'on_scene'
  | 'returning'
  | 'off_duty';

/**
 * Incident structure for Resgrid integration
 */
export interface Incident {
  id: string;
  externalId?: string; // Resgrid ID
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  type: string;
  reportedBy: number;
  assignedUnits: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  notes?: string[];
}

/**
 * Unit/resource for dispatch coordination
 */
export interface Unit {
  id: string;
  externalId?: string; // Resgrid ID
  name: string;
  type: string;
  status: UnitStatus;
  location?: {
    latitude: number;
    longitude: number;
  };
  members: number[];
  capabilities: string[];
  lastUpdate: Date;
}

/**
 * Dispatch request structure
 */
export interface DispatchRequest {
  incidentId: string;
  unitIds: string[];
  priority: MessagePriority;
  instructions?: string;
  estimatedArrival?: Date;
}

// ============================================================================
// SMS/Voice Types (Vonage)
// ============================================================================

/**
 * SMS message structure
 */
export interface SMSMessage {
  to: string;
  body: string;
  priority: MessagePriority;
  userId?: number;
  incidentId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Voice call request structure
 */
export interface VoiceCallRequest {
  to: string;
  message: string;
  priority: MessagePriority;
  userId?: number;
  incidentId?: string;
  callbackUrl?: string;
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  enableSMS: boolean;
  enableVoice: boolean;
  priorityThreshold: MessagePriority; // Minimum priority to trigger escalation
  retryAttempts: number;
  retryDelayMs: number;
}

// ============================================================================
// Provider Configuration Types
// ============================================================================

/**
 * Resgrid API configuration
 */
export interface ResgridConfig {
  apiKey: string;
  apiUrl: string;
  departmentId: string;
  webhookSecret?: string;
}

/**
 * Socket.io configuration
 */
export interface SocketIOConfig {
  enabled: boolean;
  port?: number;
  path?: string;
  corsOrigins: string[];
  pingTimeout?: number;
  pingInterval?: number;
}

/**
 * Ably configuration
 */
export interface AblyConfig {
  apiKey: string;
  clientId?: string;
}

/**
 * Vonage configuration
 */
export interface VonageConfig {
  apiKey: string;
  apiSecret: string;
  fromNumber: string;
  applicationId?: string;
  privateKey?: string;
}

/**
 * Complete hybrid communication configuration
 */
export interface HybridCommunicationConfig {
  defaultProvider: CommunicationProvider;
  resgrid?: ResgridConfig;
  socketio?: SocketIOConfig;
  ably?: AblyConfig;
  vonage?: VonageConfig;
  escalation: EscalationConfig;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Base interface for all communication providers
 */
export interface ICommunicationProvider {
  name: CommunicationProvider;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getHealthStatus(): ProviderHealthStatus;
}

/**
 * Real-time messaging provider interface
 */
export interface IRealtimeProvider extends ICommunicationProvider {
  subscribe(channel: string, callback: (message: RealtimeMessage) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  publish(channel: string, message: RealtimeMessage): Promise<void>;
  broadcast(message: RealtimeMessage): Promise<void>;
}

/**
 * Incident/dispatch provider interface (Resgrid)
 */
export interface IDispatchProvider extends ICommunicationProvider {
  createIncident(incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<Incident>;
  updateIncident(id: string, updates: Partial<Incident>): Promise<Incident>;
  getIncident(id: string): Promise<Incident | null>;
  listIncidents(filters?: IncidentFilters): Promise<Incident[]>;
  dispatchUnits(request: DispatchRequest): Promise<void>;
  updateUnitStatus(unitId: string, status: UnitStatus): Promise<void>;
  getUnits(filters?: UnitFilters): Promise<Unit[]>;
  syncUsers(): Promise<void>;
  syncResources(): Promise<void>;
}

/**
 * SMS/Voice provider interface (Vonage)
 */
export interface IEscalationProvider extends ICommunicationProvider {
  sendSMS(message: SMSMessage): Promise<SMSResult>;
  sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]>;
  initiateVoiceCall(request: VoiceCallRequest): Promise<VoiceCallResult>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
}

// ============================================================================
// Filter and Result Types
// ============================================================================

/**
 * Incident list filters
 */
export interface IncidentFilters {
  status?: IncidentStatus[];
  severity?: IncidentSeverity[];
  startDate?: Date;
  endDate?: Date;
  assignedUnitId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Unit list filters
 */
export interface UnitFilters {
  status?: UnitStatus[];
  type?: string[];
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
}

/**
 * SMS send result
 */
export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: DeliveryStatus;
}

/**
 * Voice call result
 */
export interface VoiceCallResult {
  success: boolean;
  callId?: string;
  error?: string;
  status?: string;
}

/**
 * Message delivery status
 */
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  provider: CommunicationProvider;
  connected: boolean;
  lastCheck: Date;
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Communication event types for the event bus
 */
export type CommunicationEventType =
  | 'message:received'
  | 'message:sent'
  | 'incident:created'
  | 'incident:updated'
  | 'incident:resolved'
  | 'unit:status_changed'
  | 'unit:dispatched'
  | 'escalation:sms_sent'
  | 'escalation:call_initiated'
  | 'provider:connected'
  | 'provider:disconnected'
  | 'provider:error';

/**
 * Communication event structure
 */
export interface CommunicationEvent {
  type: CommunicationEventType;
  provider: CommunicationProvider;
  timestamp: Date;
  data: unknown;
  error?: Error;
}

/**
 * Event handler callback type
 */
export type CommunicationEventHandler = (event: CommunicationEvent) => void | Promise<void>;
