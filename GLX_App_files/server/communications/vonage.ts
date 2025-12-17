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
 * Vonage Integration Module
 *
 * Provides SMS and voice escalation for critical incidents and account events.
 * Used for immediate, critical alerts and reaching users outside the platform.
 */

import type {
  IEscalationProvider,
  VonageConfig,
  SMSMessage,
  SMSResult,
  VoiceCallRequest,
  VoiceCallResult,
  DeliveryStatus,
  ProviderHealthStatus,
  EscalationConfig,
  MessagePriority,
} from './types.js';

// ============================================================================
// Vonage API Types
// ============================================================================

interface VonageMessageResponse {
  message_uuid: string;
  status?: string;
  error_text?: string;
}

interface VonageCallResponse {
  uuid: string;
  status: string;
  error_text?: string;
}

// ============================================================================
// Status Mapping
// ============================================================================

const VONAGE_STATUS_MAP: Record<string, DeliveryStatus> = {
  submitted: 'queued',
  delivered: 'delivered',
  expired: 'undelivered',
  failed: 'failed',
  rejected: 'failed',
  accepted: 'sent',
};

// ============================================================================
// Vonage Provider Implementation
// ============================================================================

export class VonageProvider implements IEscalationProvider {
  readonly name = 'vonage' as const;

  private config: VonageConfig | null = null;
  private escalationConfig: EscalationConfig | null = null;
  private connected = false;
  private lastHealthCheck: Date = new Date();
  private healthError: string | undefined;

  // Vonage client (dynamically loaded)
  private vonageClient: any = null;

  /**
   * Initialize the Vonage provider with configuration
   */
  initialize(config: VonageConfig, escalationConfig?: EscalationConfig): void {
    this.config = config;
    this.escalationConfig = escalationConfig || {
      enableSMS: true,
      enableVoice: true,
      priorityThreshold: 'high',
      retryAttempts: 3,
      retryDelayMs: 5000,
    };
    console.log('📱 Vonage provider initialized');
  }

  /**
   * Check if provider is connected
   */
  isConnected(): boolean {
    return this.connected && !!this.config;
  }

  /**
   * Connect to Vonage API
   */
  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Vonage provider not initialized. Call initialize() first.');
    }

    try {
      // Attempt to load Vonage SDK if available
      // The @vonage/server-sdk package may not be present in all environments
      // Falls back to HTTP API if not installed
      try {
        // Use dynamic import to avoid TypeScript errors
        const vonagePath = '@vonage/server-sdk';
        const vonageModule = await eval(`import('${vonagePath}')`);
        const { Vonage } = vonageModule;
        this.vonageClient = new Vonage({
          apiKey: this.config.apiKey,
          apiSecret: this.config.apiSecret,
          applicationId: this.config.applicationId,
          privateKey: this.config.privateKey,
        });
      } catch (importError) {
        // Vonage SDK not installed - use HTTP API directly
        console.log('📱 Vonage SDK not found, using HTTP API fallback');
        this.vonageClient = null;
      }

      // Verify credentials by checking account
      await this.verifyCredentials();

      this.connected = true;
      this.healthError = undefined;
      console.log('✅ Connected to Vonage API');
    } catch (error) {
      this.connected = false;
      this.healthError = error instanceof Error ? error.message : 'Connection failed';
      console.error('❌ Failed to connect to Vonage:', this.healthError);
      throw error;
    }
  }

  /**
   * Disconnect from Vonage API
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.vonageClient = null;
    console.log('📱 Disconnected from Vonage API');
  }

  /**
   * Get health status of the provider
   */
  getHealthStatus(): ProviderHealthStatus {
    return {
      provider: 'vonage',
      connected: this.connected,
      lastCheck: this.lastHealthCheck,
      error: this.healthError,
      details: {
        phoneNumber: this.config?.fromNumber,
        smsEnabled: this.escalationConfig?.enableSMS,
        voiceEnabled: this.escalationConfig?.enableVoice,
        priorityThreshold: this.escalationConfig?.priorityThreshold,
      },
    };
  }

  // ============================================================================
  // SMS Methods
  // ============================================================================

  /**
   * Send an SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    this.ensureConnected();

    // Check if SMS is enabled for this priority
    if (!this.shouldEscalate(message.priority)) {
      console.log(`⚠️ SMS not sent - priority ${message.priority} below threshold`);
      return {
        success: false,
        error: `Priority ${message.priority} below escalation threshold`,
      };
    }

    try {
      const result = await this.sendSMSWithRetry(message);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'SMS send failed';
      console.error('❌ SMS send error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send multiple SMS messages in bulk
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
    const results: SMSResult[] = [];

    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(msg => this.sendSMS(msg)));
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < messages.length) {
        await this.delay(1000);
      }
    }

    console.log(`📤 Bulk SMS complete: ${results.filter(r => r.success).length}/${messages.length} sent`);
    return results;
  }

  // ============================================================================
  // Voice Methods
  // ============================================================================

  /**
   * Initiate a voice call
   */
  async initiateVoiceCall(request: VoiceCallRequest): Promise<VoiceCallResult> {
    this.ensureConnected();

    // Check if voice is enabled for this priority
    if (!this.shouldEscalate(request.priority)) {
      console.log(`⚠️ Voice call not initiated - priority ${request.priority} below threshold`);
      return {
        success: false,
        error: `Priority ${request.priority} below escalation threshold`,
      };
    }

    try {
      const result = await this.makeVoiceCall(request);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice call failed';
      console.error('❌ Voice call error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get delivery status of a message
   */
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    this.ensureConnected();

    try {
      // Use HTTP API to check status
      const response = await this.makeHttpRequest<{ status: string }>(
        `/messages/${messageId}`,
        'GET'
      );
      return VONAGE_STATUS_MAP[response.status] || 'queued';
    } catch (error) {
      console.error('❌ Failed to get delivery status:', error);
      return 'failed';
    }
  }

  // ============================================================================
  // Escalation Helpers
  // ============================================================================

  /**
   * Send critical incident alert to multiple recipients
   */
  async sendIncidentAlert(
    recipients: string[],
    incidentId: string,
    severity: string,
    description: string
  ): Promise<SMSResult[]> {
    const message: Omit<SMSMessage, 'to'> = {
      body: `🚨 GLX INCIDENT ALERT\n\nIncident: ${incidentId}\nSeverity: ${severity.toUpperCase()}\n\n${description}\n\nRespond immediately.`,
      priority: severity === 'critical' ? 'emergency' : 'critical',
      incidentId,
    };

    const messages: SMSMessage[] = recipients.map(to => ({
      ...message,
      to,
    }));

    return this.sendBulkSMS(messages);
  }

  /**
   * Send account security alert
   */
  async sendSecurityAlert(
    phoneNumber: string,
    alertType: string,
    details: string
  ): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phoneNumber,
      body: `🔒 GLX Security Alert\n\n${alertType}\n\n${details}\n\nIf this wasn't you, secure your account immediately.`,
      priority: 'high',
    };

    return this.sendSMS(message);
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    const message: SMSMessage = {
      to: phoneNumber,
      body: `Your GLX verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share this code with anyone.`,
      priority: 'normal',
    };

    // Override priority check for verification codes
    return this.sendSMSWithRetry(message);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Vonage provider not connected. Call connect() first.');
    }
  }

  private shouldEscalate(priority: MessagePriority): boolean {
    if (!this.escalationConfig) return true;

    const priorityOrder: MessagePriority[] = ['low', 'normal', 'high', 'critical', 'emergency'];
    const messagePriorityIndex = priorityOrder.indexOf(priority);
    const thresholdIndex = priorityOrder.indexOf(this.escalationConfig.priorityThreshold);

    return messagePriorityIndex >= thresholdIndex;
  }

  private async sendSMSWithRetry(message: SMSMessage): Promise<SMSResult> {
    const maxAttempts = this.escalationConfig?.retryAttempts || 3;
    const retryDelay = this.escalationConfig?.retryDelayMs || 5000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let response: VonageMessageResponse;

        if (this.vonageClient) {
          // Use Vonage SDK
          const result = await this.vonageClient.sms.send({
            to: message.to,
            from: this.config!.fromNumber,
            text: message.body,
          });
          response = {
            message_uuid: result.messages?.[0]?.['message-id'] || result['message-id'] || '',
            status: result.messages?.[0]?.status || 'submitted',
          };
        } else {
          // Use HTTP API
          response = await this.makeHttpRequest<VonageMessageResponse>('/sms/json', 'POST', {
            api_key: this.config!.apiKey,
            api_secret: this.config!.apiSecret,
            to: message.to,
            from: this.config!.fromNumber,
            text: message.body,
          });
        }

        if (response.error_text) {
          throw new Error(response.error_text);
        }

        console.log(`📤 SMS sent to ${this.maskPhoneNumber(message.to)} (UUID: ${response.message_uuid})`);
        return {
          success: true,
          messageId: response.message_uuid,
          deliveryStatus: VONAGE_STATUS_MAP[response.status || 'submitted'] || 'queued',
        };
      } catch (error) {
        console.warn(`⚠️ SMS attempt ${attempt}/${maxAttempts} failed:`, error);

        if (attempt < maxAttempts) {
          await this.delay(retryDelay);
        } else {
          throw error;
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    return { success: false, error: 'Max retries exceeded' };
  }

  private async makeVoiceCall(request: VoiceCallRequest): Promise<VoiceCallResult> {
    // Create NCCO (Nexmo Call Control Object) for the voice message
    const ncco = [
      {
        action: 'talk',
        text: request.message,
        voiceName: 'Amy', // Vonage voice
      },
    ];

    try {
      let response: VonageCallResponse;

      if (this.vonageClient) {
        // Use Vonage SDK
        const result = await this.vonageClient.voice.createOutboundCall({
          to: [{ type: 'phone', number: request.to }],
          from: { type: 'phone', number: this.config!.fromNumber },
          ncco: ncco,
          event_url: request.callbackUrl ? [request.callbackUrl] : undefined,
        });
        response = {
          uuid: result.uuid,
          status: result.status || 'started',
        };
      } else {
        // Use HTTP API
        response = await this.makeHttpRequest<VonageCallResponse>('/calls', 'POST', {
          to: [{ type: 'phone', number: request.to }],
          from: { type: 'phone', number: this.config!.fromNumber },
          ncco: ncco,
          event_url: request.callbackUrl ? [request.callbackUrl] : undefined,
        });
      }

      if (response.error_text) {
        throw new Error(response.error_text);
      }

      console.log(`📞 Voice call initiated to ${this.maskPhoneNumber(request.to)} (UUID: ${response.uuid})`);
      return {
        success: true,
        callId: response.uuid,
        status: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice call failed';
      return { success: false, error: errorMessage };
    }
  }

  private async verifyCredentials(): Promise<void> {
    // Verify by checking account balance (simple API call)
    await this.makeHttpRequest<{ value: number }>('/account/get-balance', 'GET', {
      api_key: this.config!.apiKey,
      api_secret: this.config!.apiSecret,
    });
    this.lastHealthCheck = new Date();
  }

  private async makeHttpRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: Record<string, unknown>
  ): Promise<T> {
    if (!this.config) {
      throw new Error('Provider not configured');
    }

    const baseUrl = 'https://rest.nexmo.com';
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add basic auth if using API key/secret
    if (this.config.apiKey && this.config.apiSecret) {
      const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    this.lastHealthCheck = new Date();

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vonage API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 6) return '***';
    return phone.slice(0, 3) + '***' + phone.slice(-4);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const vonageProvider = new VonageProvider();

export default vonageProvider;
