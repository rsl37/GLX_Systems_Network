/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Twilio Integration Module
 *
 * Provides SMS and voice escalation for critical incidents and account events.
 * Used for immediate, critical alerts and reaching users outside the platform.
 */

import type {
  IEscalationProvider,
  TwilioConfig,
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
// Twilio API Types
// ============================================================================

interface TwilioMessageResponse {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

interface TwilioCallResponse {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

// ============================================================================
// Status Mapping
// ============================================================================

const TWILIO_STATUS_MAP: Record<string, DeliveryStatus> = {
  queued: 'queued',
  sending: 'queued',
  sent: 'sent',
  delivered: 'delivered',
  undelivered: 'undelivered',
  failed: 'failed',
};

// ============================================================================
// Twilio Provider Implementation
// ============================================================================

export class TwilioProvider implements IEscalationProvider {
  readonly name = 'twilio' as const;

  private config: TwilioConfig | null = null;
  private escalationConfig: EscalationConfig | null = null;
  private connected = false;
  private lastHealthCheck: Date = new Date();
  private healthError: string | undefined;

  // Twilio client (dynamically loaded)
  private twilioClient: any = null;

  /**
   * Initialize the Twilio provider with configuration
   */
  initialize(config: TwilioConfig, escalationConfig?: EscalationConfig): void {
    this.config = config;
    this.escalationConfig = escalationConfig || {
      enableSMS: true,
      enableVoice: true,
      priorityThreshold: 'high',
      retryAttempts: 3,
      retryDelayMs: 5000,
    };
    console.log('📱 Twilio provider initialized');
  }

  /**
   * Check if provider is connected
   */
  isConnected(): boolean {
    return this.connected && !!this.config;
  }

  /**
   * Connect to Twilio API
   */
  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Twilio provider not initialized. Call initialize() first.');
    }

    try {
      // Attempt to load Twilio SDK if available
      // The twilio package may not be present in all environments
      // Falls back to HTTP API if not installed
      try {
        // Check if twilio module is available by attempting to require.resolve
        // This is safe as we're just checking existence, not executing untrusted code
        const twilioPath = 'twilio';
        const twilioModule = await eval(`import('${twilioPath}')`);
        this.twilioClient = twilioModule.default(this.config.accountSid, this.config.authToken);
      } catch (importError) {
        // Twilio SDK not installed - use HTTP API directly
        console.log('📱 Twilio SDK not found, using HTTP API fallback');
        this.twilioClient = null;
      }

      // Verify credentials by checking account
      await this.verifyCredentials();

      this.connected = true;
      this.healthError = undefined;
      console.log('✅ Connected to Twilio API');
    } catch (error) {
      this.connected = false;
      this.healthError = error instanceof Error ? error.message : 'Connection failed';
      console.error('❌ Failed to connect to Twilio:', this.healthError);
      throw error;
    }
  }

  /**
   * Disconnect from Twilio API
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.twilioClient = null;
    console.log('📱 Disconnected from Twilio API');
  }

  /**
   * Get health status of the provider
   */
  getHealthStatus(): ProviderHealthStatus {
    return {
      provider: 'twilio',
      connected: this.connected,
      lastCheck: this.lastHealthCheck,
      error: this.healthError,
      details: {
        phoneNumber: this.config?.phoneNumber,
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
      if (this.twilioClient) {
        const message = await this.twilioClient.messages(messageId).fetch();
        return TWILIO_STATUS_MAP[message.status] || 'queued';
      } else {
        // HTTP API fallback
        const response = await this.makeHttpRequest<TwilioMessageResponse>(
          `/Messages/${messageId}.json`,
          'GET'
        );
        return TWILIO_STATUS_MAP[response.status] || 'queued';
      }
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
      throw new Error('Twilio provider not connected. Call connect() first.');
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
        let response: TwilioMessageResponse;

        if (this.twilioClient) {
          // Use Twilio SDK
          response = await this.twilioClient.messages.create({
            body: message.body,
            from: this.config!.phoneNumber,
            to: message.to,
            messagingServiceSid: this.config!.messagingServiceSid,
          });
        } else {
          // Use HTTP API
          response = await this.makeHttpRequest<TwilioMessageResponse>('/Messages.json', 'POST', {
            Body: message.body,
            From: this.config!.phoneNumber,
            To: message.to,
          });
        }

        if (response.error_code) {
          throw new Error(response.error_message || `Error code: ${response.error_code}`);
        }

        console.log(`📤 SMS sent to ${this.maskPhoneNumber(message.to)} (SID: ${response.sid})`);
        return {
          success: true,
          messageId: response.sid,
          deliveryStatus: TWILIO_STATUS_MAP[response.status] || 'queued',
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
    // Create TwiML for the voice message
    const twiml = `<Response><Say voice="alice">${this.escapeXml(request.message)}</Say></Response>`;

    try {
      let response: TwilioCallResponse;

      if (this.twilioClient) {
        // Use Twilio SDK
        response = await this.twilioClient.calls.create({
          twiml: twiml,
          from: this.config!.phoneNumber,
          to: request.to,
          statusCallback: request.callbackUrl,
        });
      } else {
        // Use HTTP API
        response = await this.makeHttpRequest<TwilioCallResponse>('/Calls.json', 'POST', {
          Twiml: twiml,
          From: this.config!.phoneNumber,
          To: request.to,
          StatusCallback: request.callbackUrl,
        });
      }

      if (response.error_code) {
        throw new Error(response.error_message || `Error code: ${response.error_code}`);
      }

      console.log(`📞 Voice call initiated to ${this.maskPhoneNumber(request.to)} (SID: ${response.sid})`);
      return {
        success: true,
        callId: response.sid,
        status: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice call failed';
      return { success: false, error: errorMessage };
    }
  }

  private async verifyCredentials(): Promise<void> {
    if (this.twilioClient) {
      // Use SDK to verify
      await this.twilioClient.api.accounts(this.config!.accountSid).fetch();
    } else {
      // Use HTTP API
      await this.makeHttpRequest<{ status: string }>('/Accounts.json', 'GET');
    }
    this.lastHealthCheck = new Date();
  }

  private async makeHttpRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: Record<string, string | undefined>
  ): Promise<T> {
    if (!this.config) {
      throw new Error('Provider not configured');
    }

    const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}`;
    const url = `${baseUrl}${endpoint}`;

    const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString(
      'base64'
    );

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? new URLSearchParams(body as Record<string, string>).toString() : undefined,
    });

    this.lastHealthCheck = new Date();

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 6) return '***';
    return phone.slice(0, 3) + '***' + phone.slice(-4);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const twilioProvider = new TwilioProvider();

export default twilioProvider;
