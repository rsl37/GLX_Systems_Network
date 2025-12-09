/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Licensed under PolyForm Shield License 1.0.0
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
 * Communication Factory
 *
 * Provides a unified interface for managing hybrid communication providers.
 * Supports modular switching between Socket.io, Ably,
 * Resgrid, and Vonage based on configuration.
 */

import type {
  CommunicationProvider,
  HybridCommunicationConfig,
  IRealtimeProvider,
  IDispatchProvider,
  IEscalationProvider,
  RealtimeMessage,
  Incident,
  SMSMessage,
  SMSResult,
  VoiceCallRequest,
  VoiceCallResult,
  ProviderHealthStatus,
  CommunicationEvent,
  CommunicationEventHandler,
  CommunicationEventType,
  DispatchRequest,
  IncidentFilters,
  UnitFilters,
  Unit,
  UnitStatus,
} from './types.js';

import { ResgridProvider, resgridProvider } from './resgrid.js';
import { SocketIOProvider, socketIOProvider } from './socketio.js';
import { AblyProvider, ablyProvider } from './globalMessaging.js';
import { VonageProvider, vonageProvider } from './vonage.js';

// ============================================================================
// Communication Manager
// ============================================================================

/**
 * Central manager for all communication providers
 */
export class CommunicationManager {
  private config: HybridCommunicationConfig | null = null;
  private initialized = false;

  // Provider instances
  private realtimeProvider: IRealtimeProvider | null = null;
  private dispatchProvider: IDispatchProvider | null = null;
  private escalationProvider: IEscalationProvider | null = null;

  // Event handling
  private eventHandlers = new Map<CommunicationEventType, Set<CommunicationEventHandler>>();

  /**
   * Initialize the communication manager with configuration
   */
  async initialize(config: HybridCommunicationConfig): Promise<void> {
    this.config = config;
    console.log('🔧 Initializing Communication Manager...');

    // Initialize providers based on configuration
    await this.initializeProviders();

    this.initialized = true;
    console.log('✅ Communication Manager initialized');
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): HybridCommunicationConfig | null {
    return this.config;
  }

  // ============================================================================
  // Provider Initialization
  // ============================================================================

  private async initializeProviders(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not set');
    }

    // Initialize real-time provider based on default
    await this.initializeRealtimeProvider();

    // Initialize dispatch provider (Resgrid)
    if (this.config.resgrid) {
      await this.initializeDispatchProvider();
    }

    // Initialize escalation provider (Vonage)
    if (this.config.vonage) {
      await this.initializeEscalationProvider();
    }
  }

  private async initializeRealtimeProvider(): Promise<void> {
    if (!this.config) return;

    switch (this.config.defaultProvider) {
      case 'socketio':
        if (this.config.socketio?.enabled) {
          socketIOProvider.initialize(this.config.socketio);
          this.realtimeProvider = socketIOProvider;
          console.log('📡 Using Socket.io for real-time messaging');
        }
        break;

      case 'ably':
        if (this.config.ably) {
          ablyProvider.initialize(this.config.ably);
          await ablyProvider.connect();
          this.realtimeProvider = ablyProvider;
          console.log('📡 Using Ably for real-time messaging');
        }
        break;

      case 'socketio':
      default:
        // Socket.io is the default real-time messaging provider
        console.log('📡 Using Socket.io for real-time messaging (default)');
        break;
    }
  }

  private async initializeDispatchProvider(): Promise<void> {
    if (!this.config?.resgrid) return;

    resgridProvider.initialize(this.config.resgrid);

    try {
      await resgridProvider.connect();
      this.dispatchProvider = resgridProvider;
      console.log('📟 Resgrid dispatch provider connected');
    } catch (error) {
      console.warn('⚠️ Resgrid connection failed, dispatch features limited:', error);
    }
  }

  private async initializeEscalationProvider(): Promise<void> {
    if (!this.config?.vonage) return;

    vonageProvider.initialize(this.config.vonage, this.config.escalation);

    try {
      await vonageProvider.connect();
      this.escalationProvider = vonageProvider;
      console.log('📱 Vonage escalation provider connected');
    } catch (error) {
      console.warn('⚠️ Vonage connection failed, SMS/voice escalation limited:', error);
    }
  }

  // ============================================================================
  // Real-time Messaging Methods
  // ============================================================================

  /**
   * Get the active real-time provider
   */
  getRealtimeProvider(): IRealtimeProvider | null {
    return this.realtimeProvider;
  }

  /**
   * Subscribe to a channel for real-time messages
   */
  async subscribeToChannel(
    channel: string,
    callback: (message: RealtimeMessage) => void
  ): Promise<void> {
    if (this.realtimeProvider) {
      await this.realtimeProvider.subscribe(channel, callback);
    } else {
      console.warn('⚠️ No real-time provider available for subscription');
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribeFromChannel(channel: string): Promise<void> {
    if (this.realtimeProvider) {
      await this.realtimeProvider.unsubscribe(channel);
    }
  }

  /**
   * Publish a message to a channel
   */
  async publishToChannel(channel: string, message: RealtimeMessage): Promise<void> {
    if (this.realtimeProvider) {
      await this.realtimeProvider.publish(channel, message);
      this.emitEvent('message:sent', this.realtimeProvider.name, message);
    } else {
      console.warn('⚠️ No real-time provider available for publishing');
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  async broadcast(message: RealtimeMessage): Promise<void> {
    if (this.realtimeProvider) {
      await this.realtimeProvider.broadcast(message);
      this.emitEvent('message:sent', this.realtimeProvider.name, message);
    }
  }

  // ============================================================================
  // Dispatch Methods (Resgrid)
  // ============================================================================

  /**
   * Get the dispatch provider
   */
  getDispatchProvider(): IDispatchProvider | null {
    return this.dispatchProvider;
  }

  /**
   * Create a new incident
   */
  async createIncident(
    incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Incident | null> {
    if (!this.dispatchProvider) {
      console.warn('⚠️ No dispatch provider available');
      return null;
    }

    try {
      const created = await this.dispatchProvider.createIncident(incident);
      this.emitEvent('incident:created', 'resgrid', created);
      return created;
    } catch (error) {
      console.error('❌ Failed to create incident:', error);
      return null;
    }
  }

  /**
   * Update an incident
   */
  async updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | null> {
    if (!this.dispatchProvider) {
      return null;
    }

    try {
      const updated = await this.dispatchProvider.updateIncident(id, updates);
      this.emitEvent('incident:updated', 'resgrid', updated);

      if (updates.status === 'resolved') {
        this.emitEvent('incident:resolved', 'resgrid', updated);
      }

      return updated;
    } catch (error) {
      console.error('❌ Failed to update incident:', error);
      return null;
    }
  }

  /**
   * Get incident by ID
   */
  async getIncident(id: string): Promise<Incident | null> {
    if (!this.dispatchProvider) {
      return null;
    }

    return this.dispatchProvider.getIncident(id);
  }

  /**
   * List incidents with optional filters
   */
  async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    if (!this.dispatchProvider) {
      return [];
    }

    return this.dispatchProvider.listIncidents(filters);
  }

  /**
   * Dispatch units to an incident
   */
  async dispatchUnits(request: DispatchRequest): Promise<boolean> {
    if (!this.dispatchProvider) {
      return false;
    }

    try {
      await this.dispatchProvider.dispatchUnits(request);
      this.emitEvent('unit:dispatched', 'resgrid', request);
      return true;
    } catch (error) {
      console.error('❌ Failed to dispatch units:', error);
      return false;
    }
  }

  /**
   * Update unit status
   */
  async updateUnitStatus(unitId: string, status: UnitStatus): Promise<boolean> {
    if (!this.dispatchProvider) {
      return false;
    }

    try {
      await this.dispatchProvider.updateUnitStatus(unitId, status);
      this.emitEvent('unit:status_changed', 'resgrid', { unitId, status });
      return true;
    } catch (error) {
      console.error('❌ Failed to update unit status:', error);
      return false;
    }
  }

  /**
   * Get units with optional filters
   */
  async getUnits(filters?: UnitFilters): Promise<Unit[]> {
    if (!this.dispatchProvider) {
      return [];
    }

    return this.dispatchProvider.getUnits(filters);
  }

  // ============================================================================
  // Escalation Methods (Vonage)
  // ============================================================================

  /**
   * Get the escalation provider
   */
  getEscalationProvider(): IEscalationProvider | null {
    return this.escalationProvider;
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    if (!this.escalationProvider) {
      return { success: false, error: 'No escalation provider available' };
    }

    const result = await this.escalationProvider.sendSMS(message);
    if (result.success) {
      this.emitEvent('escalation:sms_sent', 'vonage', { message, result });
    }
    return result;
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
    if (!this.escalationProvider) {
      return messages.map(() => ({ success: false, error: 'No escalation provider available' }));
    }

    return this.escalationProvider.sendBulkSMS(messages);
  }

  /**
   * Initiate voice call
   */
  async initiateVoiceCall(request: VoiceCallRequest): Promise<VoiceCallResult> {
    if (!this.escalationProvider) {
      return { success: false, error: 'No escalation provider available' };
    }

    const result = await this.escalationProvider.initiateVoiceCall(request);
    if (result.success) {
      this.emitEvent('escalation:call_initiated', 'vonage', { request, result });
    }
    return result;
  }

  // ============================================================================
  // Health & Status Methods
  // ============================================================================

  /**
   * Get health status of all providers
   */
  getHealthStatus(): ProviderHealthStatus[] {
    const statuses: ProviderHealthStatus[] = [];

    if (this.realtimeProvider) {
      statuses.push(this.realtimeProvider.getHealthStatus());
    }

    if (this.dispatchProvider) {
      statuses.push(this.dispatchProvider.getHealthStatus());
    }

    if (this.escalationProvider) {
      statuses.push(this.escalationProvider.getHealthStatus());
    }

    return statuses;
  }

  /**
   * Check if all configured providers are healthy
   */
  isHealthy(): boolean {
    const statuses = this.getHealthStatus();
    return statuses.length === 0 || statuses.every(s => s.connected);
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Register an event handler
   */
  on(eventType: CommunicationEventType, handler: CommunicationEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Remove an event handler
   */
  off(eventType: CommunicationEventType, handler: CommunicationEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emitEvent(
    type: CommunicationEventType,
    provider: CommunicationProvider,
    data: unknown
  ): void {
    const event: CommunicationEvent = {
      type,
      provider,
      timestamp: new Date(),
      data,
    };

    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`❌ Event handler error for ${type}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // Shutdown
  // ============================================================================

  /**
   * Gracefully shutdown all providers
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Communication Manager...');

    if (this.realtimeProvider) {
      await this.realtimeProvider.disconnect();
    }

    if (this.dispatchProvider) {
      await this.dispatchProvider.disconnect();
    }

    if (this.escalationProvider) {
      await this.escalationProvider.disconnect();
    }

    this.eventHandlers.clear();
    this.initialized = false;

    console.log('✅ Communication Manager shutdown complete');
  }
}

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Load communication configuration from environment variables
 */
export function loadConfigFromEnv(): HybridCommunicationConfig {
  return {
    defaultProvider: (process.env.COMM_DEFAULT_PROVIDER as CommunicationProvider) || 'socketio',

    resgrid: process.env.RESGRID_API_KEY
      ? {
          apiKey: process.env.RESGRID_API_KEY,
          apiUrl: process.env.RESGRID_API_URL || 'https://api.resgrid.com/api/v1',
          departmentId: process.env.RESGRID_DEPARTMENT_ID || '',
          webhookSecret: process.env.RESGRID_WEBHOOK_SECRET,
        }
      : undefined,

    socketio: {
      enabled: process.env.SOCKETIO_ENABLED === 'true',
      port: process.env.SOCKETIO_PORT ? parseInt(process.env.SOCKETIO_PORT, 10) : undefined,
      path: process.env.SOCKETIO_PATH || '/socket.io',
      corsOrigins: process.env.SOCKETIO_CORS_ORIGINS?.split(',') || [],
      pingTimeout: process.env.SOCKETIO_PING_TIMEOUT
        ? parseInt(process.env.SOCKETIO_PING_TIMEOUT, 10)
        : 60000,
      pingInterval: process.env.SOCKETIO_PING_INTERVAL
        ? parseInt(process.env.SOCKETIO_PING_INTERVAL, 10)
        : 25000,
    },

    ably: process.env.ABLY_API_KEY
      ? {
          apiKey: process.env.ABLY_API_KEY,
          clientId: process.env.ABLY_CLIENT_ID,
        }
      : undefined,

    vonage: process.env.VONAGE_API_KEY
      ? {
          apiKey: process.env.VONAGE_API_KEY,
          apiSecret: process.env.VONAGE_API_SECRET || '',
          fromNumber: process.env.VONAGE_FROM_NUMBER || '',
          applicationId: process.env.VONAGE_APPLICATION_ID,
          privateKey: process.env.VONAGE_PRIVATE_KEY,
        }
      : undefined,

    escalation: {
      enableSMS: process.env.ESCALATION_ENABLE_SMS !== 'false',
      enableVoice: process.env.ESCALATION_ENABLE_VOICE !== 'false',
      priorityThreshold:
        (process.env.ESCALATION_PRIORITY_THRESHOLD as 'low' | 'normal' | 'high' | 'critical') ||
        'high',
      retryAttempts: process.env.ESCALATION_RETRY_ATTEMPTS
        ? parseInt(process.env.ESCALATION_RETRY_ATTEMPTS, 10)
        : 3,
      retryDelayMs: process.env.ESCALATION_RETRY_DELAY
        ? parseInt(process.env.ESCALATION_RETRY_DELAY, 10)
        : 5000,
    },
  };
}

// Export singleton instance
export const communicationManager = new CommunicationManager();

// Export all provider instances for direct access if needed
export {
  resgridProvider,
  socketIOProvider,
  ablyProvider,
  vonageProvider,
};

export default communicationManager;
