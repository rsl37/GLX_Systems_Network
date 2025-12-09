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
 * Resgrid Integration Module
 *
 * Provides integration with Resgrid for incident/dispatch workflows,
 * unit management, and crisis coordination.
 *
 * Documentation: https://resgrid.com/api
 */

import crypto from 'crypto';
import type {
  IDispatchProvider,
  ResgridConfig,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  Unit,
  UnitStatus,
  UnitFilters,
  IncidentFilters,
  DispatchRequest,
  ProviderHealthStatus,
} from './types.js';

// ============================================================================
// Resgrid API Response Types
// ============================================================================

interface ResgridApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ResgridIncident {
  CallId: string;
  Name: string;
  Nature: string;
  Priority: number;
  State: number;
  Address: string;
  GeoLocationData?: string;
  LoggedOn: string;
  ClosedOn?: string;
  Notes?: string;
  DispatchedUnits?: string[];
}

interface ResgridUnit {
  UnitId: string;
  Name: string;
  Type: string;
  State: number;
  Latitude?: number;
  Longitude?: number;
  Members?: string[];
  Timestamp: string;
}

interface ResgridUser {
  UserId: string;
  Name: string;
  Email: string;
  PhoneNumber?: string;
}

// ============================================================================
// Status Mapping
// ============================================================================

const RESGRID_INCIDENT_STATUS_MAP: Record<number, IncidentStatus> = {
  0: 'pending',
  1: 'dispatched',
  2: 'en_route',
  3: 'on_scene',
  4: 'resolved',
  5: 'cancelled',
};

const INCIDENT_STATUS_TO_RESGRID: Record<IncidentStatus, number> = {
  pending: 0,
  dispatched: 1,
  en_route: 2,
  on_scene: 3,
  resolved: 4,
  cancelled: 5,
};

const RESGRID_UNIT_STATUS_MAP: Record<number, UnitStatus> = {
  0: 'available',
  1: 'busy',
  2: 'en_route',
  3: 'on_scene',
  4: 'returning',
  5: 'off_duty',
};

const UNIT_STATUS_TO_RESGRID: Record<UnitStatus, number> = {
  available: 0,
  busy: 1,
  en_route: 2,
  on_scene: 3,
  returning: 4,
  off_duty: 5,
};

const RESGRID_PRIORITY_MAP: Record<number, IncidentSeverity> = {
  1: 'low',
  2: 'medium',
  3: 'high',
  4: 'critical',
};

const SEVERITY_TO_RESGRID: Record<IncidentSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// ============================================================================
// Resgrid Provider Implementation
// ============================================================================

export class ResgridProvider implements IDispatchProvider {
  readonly name = 'resgrid' as const;

  private config: ResgridConfig | null = null;
  private connected = false;
  private lastHealthCheck: Date = new Date();
  private healthError: string | undefined;

  /**
   * Initialize the Resgrid provider with configuration
   */
  initialize(config: ResgridConfig): void {
    this.config = config;
    console.log('📟 Resgrid provider initialized');
  }

  /**
   * Check if provider is connected
   */
  isConnected(): boolean {
    return this.connected && !!this.config;
  }

  /**
   * Connect to Resgrid API
   */
  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Resgrid provider not initialized. Call initialize() first.');
    }

    try {
      // Test connection by making a health check request
      const response = await this.makeRequest<{ status: string }>('/health');

      if (response.success) {
        this.connected = true;
        this.healthError = undefined;
        console.log('✅ Connected to Resgrid API');
      } else {
        throw new Error(response.error || 'Failed to connect to Resgrid');
      }
    } catch (error) {
      this.connected = false;
      this.healthError = error instanceof Error ? error.message : 'Connection failed';
      console.error('❌ Failed to connect to Resgrid:', this.healthError);
      throw error;
    }
  }

  /**
   * Disconnect from Resgrid API
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('📟 Disconnected from Resgrid API');
  }

  /**
   * Get health status of the provider
   */
  getHealthStatus(): ProviderHealthStatus {
    return {
      provider: 'resgrid',
      connected: this.connected,
      lastCheck: this.lastHealthCheck,
      error: this.healthError,
      details: {
        departmentId: this.config?.departmentId,
        apiUrl: this.config?.apiUrl,
      },
    };
  }

  // ============================================================================
  // Incident Management
  // ============================================================================

  /**
   * Create a new incident
   */
  async createIncident(
    incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Incident> {
    this.ensureConnected();

    const resgridIncident = {
      Name: incident.title,
      Nature: incident.description,
      Priority: SEVERITY_TO_RESGRID[incident.severity],
      Address: incident.location.address || '',
      GeoLocationData: `${incident.location.latitude},${incident.location.longitude}`,
      Type: incident.type,
    };

    const response = await this.makeRequest<ResgridIncident>('/calls', 'POST', resgridIncident);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create incident');
    }

    return this.mapResgridIncident(response.data);
  }

  /**
   * Update an existing incident
   */
  async updateIncident(id: string, updates: Partial<Incident>): Promise<Incident> {
    this.ensureConnected();

    const resgridUpdates: Record<string, unknown> = {};

    if (updates.title) resgridUpdates.Name = updates.title;
    if (updates.description) resgridUpdates.Nature = updates.description;
    if (updates.severity) resgridUpdates.Priority = SEVERITY_TO_RESGRID[updates.severity];
    if (updates.status) resgridUpdates.State = INCIDENT_STATUS_TO_RESGRID[updates.status];
    if (updates.location?.address) resgridUpdates.Address = updates.location.address;
    if (updates.location) {
      resgridUpdates.GeoLocationData = `${updates.location.latitude},${updates.location.longitude}`;
    }

    const response = await this.makeRequest<ResgridIncident>(
      `/calls/${id}`,
      'PUT',
      resgridUpdates
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update incident');
    }

    return this.mapResgridIncident(response.data);
  }

  /**
   * Get an incident by ID
   */
  async getIncident(id: string): Promise<Incident | null> {
    this.ensureConnected();

    const response = await this.makeRequest<ResgridIncident>(`/calls/${id}`);

    if (!response.success) {
      if (response.error?.includes('not found')) {
        return null;
      }
      throw new Error(response.error || 'Failed to get incident');
    }

    return response.data ? this.mapResgridIncident(response.data) : null;
  }

  /**
   * List incidents with optional filters
   */
  async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    this.ensureConnected();

    const queryParams = new URLSearchParams();

    if (filters?.status?.length) {
      queryParams.set('states', filters.status.map(s => INCIDENT_STATUS_TO_RESGRID[s]).join(','));
    }
    if (filters?.severity?.length) {
      queryParams.set(
        'priorities',
        filters.severity.map(s => SEVERITY_TO_RESGRID[s]).join(',')
      );
    }
    if (filters?.startDate) {
      queryParams.set('start', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      queryParams.set('end', filters.endDate.toISOString());
    }
    if (filters?.limit) {
      queryParams.set('limit', filters.limit.toString());
    }
    if (filters?.offset) {
      queryParams.set('offset', filters.offset.toString());
    }

    const url = `/calls${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await this.makeRequest<ResgridIncident[]>(url);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to list incidents');
    }

    return response.data.map(incident => this.mapResgridIncident(incident));
  }

  // ============================================================================
  // Unit/Resource Management
  // ============================================================================

  /**
   * Dispatch units to an incident
   */
  async dispatchUnits(request: DispatchRequest): Promise<void> {
    this.ensureConnected();

    const dispatchData = {
      CallId: request.incidentId,
      UnitIds: request.unitIds,
      Instructions: request.instructions,
    };

    const response = await this.makeRequest('/dispatch', 'POST', dispatchData);

    if (!response.success) {
      throw new Error(response.error || 'Failed to dispatch units');
    }

    console.log(`🚨 Dispatched ${request.unitIds.length} units to incident ${request.incidentId}`);
  }

  /**
   * Update a unit's status
   */
  async updateUnitStatus(unitId: string, status: UnitStatus): Promise<void> {
    this.ensureConnected();

    const response = await this.makeRequest(`/units/${unitId}/status`, 'PUT', {
      State: UNIT_STATUS_TO_RESGRID[status],
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to update unit status');
    }

    console.log(`📍 Updated unit ${unitId} status to ${status}`);
  }

  /**
   * Get units with optional filters
   */
  async getUnits(filters?: UnitFilters): Promise<Unit[]> {
    this.ensureConnected();

    const queryParams = new URLSearchParams();

    if (filters?.status?.length) {
      queryParams.set('states', filters.status.map(s => UNIT_STATUS_TO_RESGRID[s]).join(','));
    }
    if (filters?.type?.length) {
      queryParams.set('types', filters.type.join(','));
    }
    if (filters?.nearLocation) {
      queryParams.set('lat', filters.nearLocation.latitude.toString());
      queryParams.set('lon', filters.nearLocation.longitude.toString());
      queryParams.set('radius', filters.nearLocation.radiusKm.toString());
    }

    const url = `/units${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await this.makeRequest<ResgridUnit[]>(url);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get units');
    }

    return response.data.map(unit => this.mapResgridUnit(unit));
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Sync users from GLX to Resgrid
   */
  async syncUsers(): Promise<void> {
    this.ensureConnected();

    console.log('🔄 Syncing users with Resgrid...');

    // This would fetch GLX users and sync them to Resgrid
    // Implementation depends on specific sync requirements

    const response = await this.makeRequest('/personnel/sync', 'POST');

    if (!response.success) {
      console.warn('⚠️ User sync incomplete:', response.error);
    } else {
      console.log('✅ Users synced with Resgrid');
    }
  }

  /**
   * Sync resources/units from GLX to Resgrid
   */
  async syncResources(): Promise<void> {
    this.ensureConnected();

    console.log('🔄 Syncing resources with Resgrid...');

    const response = await this.makeRequest('/units/sync', 'POST');

    if (!response.success) {
      console.warn('⚠️ Resource sync incomplete:', response.error);
    } else {
      console.log('✅ Resources synced with Resgrid');
    }
  }

  // ============================================================================
  // Webhook Handling
  // ============================================================================

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config?.webhookSecret) {
      console.warn('⚠️ Webhook secret not configured');
      return false;
    }

    // Implement proper HMAC verification
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Process incoming webhook event
   */
  async processWebhook(
    eventType: string,
    payload: unknown
  ): Promise<{ incident?: Incident; unit?: Unit }> {
    console.log(`📨 Processing Resgrid webhook: ${eventType}`);

    switch (eventType) {
      case 'call.created':
      case 'call.updated':
      case 'call.closed':
        return { incident: this.mapResgridIncident(payload as ResgridIncident) };

      case 'unit.status_changed':
        return { unit: this.mapResgridUnit(payload as ResgridUnit) };

      default:
        console.log(`ℹ️ Unhandled webhook event type: ${eventType}`);
        return {};
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Resgrid provider not connected. Call connect() first.');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<ResgridApiResponse<T>> {
    if (!this.config) {
      return { success: false, error: 'Provider not configured' };
    }

    try {
      const url = `${this.config.apiUrl}${endpoint}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Department-Id': this.config.departmentId,
      };

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      this.lastHealthCheck = new Date();

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API error: ${response.status} - ${errorText}`,
        };
      }

      const data = (await response.json()) as T;
      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      this.healthError = errorMessage;
      return { success: false, error: errorMessage };
    }
  }

  private mapResgridIncident(data: ResgridIncident): Incident {
    const [lat, lon] = (data.GeoLocationData || '0,0').split(',').map(Number);

    return {
      id: data.CallId,
      externalId: data.CallId,
      title: data.Name,
      description: data.Nature,
      severity: RESGRID_PRIORITY_MAP[data.Priority] || 'medium',
      status: RESGRID_INCIDENT_STATUS_MAP[data.State] || 'pending',
      location: {
        latitude: lat,
        longitude: lon,
        address: data.Address,
      },
      type: 'general',
      reportedBy: 0, // Would need to be mapped from Resgrid user
      assignedUnits: data.DispatchedUnits || [],
      createdAt: new Date(data.LoggedOn),
      updatedAt: new Date(data.LoggedOn),
      resolvedAt: data.ClosedOn ? new Date(data.ClosedOn) : undefined,
      notes: data.Notes ? [data.Notes] : undefined,
    };
  }

  private mapResgridUnit(data: ResgridUnit): Unit {
    return {
      id: data.UnitId,
      externalId: data.UnitId,
      name: data.Name,
      type: data.Type,
      status: RESGRID_UNIT_STATUS_MAP[data.State] || 'available',
      location:
        data.Latitude && data.Longitude
          ? {
              latitude: data.Latitude,
              longitude: data.Longitude,
            }
          : undefined,
      members: (data.Members || []).map(m => parseInt(m, 10)).filter(n => !isNaN(n)),
      capabilities: [],
      lastUpdate: new Date(data.Timestamp),
    };
  }
}

// Export singleton instance
export const resgridProvider = new ResgridProvider();

export default resgridProvider;
