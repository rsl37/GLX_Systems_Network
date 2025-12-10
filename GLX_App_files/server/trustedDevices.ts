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

import { webcrypto } from 'node:crypto';
import { encryptPersonalData, decryptPersonalData } from './encryption.js';

/**
 * Trusted device information
 */
export interface TrustedDevice {
  deviceId: string;
  userId: number;
  deviceFingerprint: string;
  deviceName: string;
  ipAddress?: string;
  userAgent?: string;
  trustedUntil: number; // Timestamp when trust expires (7 days)
  createdAt: number;
  lastUsed: number;
}

/**
 * In-memory trusted devices store
 * For production, this should be in Redis or database
 */
const trustedDevicesStore = new Map<string, TrustedDevice>();

/**
 * Generate a unique device fingerprint from request data
 */
export function generateDeviceFingerprint(
  userAgent?: string,
  ipAddress?: string
): string {
  const data = `${userAgent || 'unknown'}-${ipAddress || 'unknown'}`;
  
  // Simple hash function for sync operation
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate device fingerprint synchronously
 */
export function generateDeviceFingerprintSync(
  userAgent?: string,
  ipAddress?: string
): string {
  const data = `${userAgent || 'unknown'}-${ipAddress || 'unknown'}`;
  
  // Simple hash function for sync operation
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Trust a device for 7 days to skip 2FA
 */
export function trustDevice(
  userId: number,
  userAgent?: string,
  ipAddress?: string
): string {
  const deviceFingerprint = generateDeviceFingerprintSync(userAgent, ipAddress);
  const deviceId = generateDeviceId();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  
  const device: TrustedDevice = {
    deviceId,
    userId,
    deviceFingerprint,
    deviceName: userAgent || 'Unknown Device',
    ipAddress,
    userAgent,
    trustedUntil: now + sevenDays,
    createdAt: now,
    lastUsed: now,
  };
  
  trustedDevicesStore.set(deviceId, device);
  
  // Clean up expired devices
  cleanupExpiredTrustedDevices();
  
  console.log('✅ Device trusted for 7 days:', deviceId);
  return deviceId;
}

/**
 * Check if a device is trusted
 */
export function isDeviceTrusted(
  userId: number,
  userAgent?: string,
  ipAddress?: string
): { trusted: boolean; deviceId?: string } {
  const deviceFingerprint = generateDeviceFingerprintSync(userAgent, ipAddress);
  const now = Date.now();
  
  // Find matching trusted device
  for (const [deviceId, device] of trustedDevicesStore.entries()) {
    if (
      device.userId === userId &&
      device.deviceFingerprint === deviceFingerprint &&
      device.trustedUntil > now
    ) {
      // Update last used time
      device.lastUsed = now;
      console.log('✅ Device is trusted:', deviceId);
      return { trusted: true, deviceId };
    }
  }
  
  console.log('⚠️ Device is not trusted');
  return { trusted: false };
}

/**
 * Revoke trust for a specific device
 */
export function revokeTrustedDevice(userId: number, deviceId: string): boolean {
  const device = trustedDevicesStore.get(deviceId);
  
  if (!device || device.userId !== userId) {
    return false;
  }
  
  trustedDevicesStore.delete(deviceId);
  console.log('✅ Device trust revoked:', deviceId);
  return true;
}

/**
 * Get all trusted devices for a user
 */
export function getUserTrustedDevices(userId: number): TrustedDevice[] {
  const devices: TrustedDevice[] = [];
  const now = Date.now();
  
  for (const device of trustedDevicesStore.values()) {
    if (device.userId === userId && device.trustedUntil > now) {
      devices.push(device);
    }
  }
  
  return devices;
}

/**
 * Revoke all trusted devices for a user
 */
export function revokeAllTrustedDevices(userId: number): number {
  let revokedCount = 0;
  
  for (const [deviceId, device] of trustedDevicesStore.entries()) {
    if (device.userId === userId) {
      trustedDevicesStore.delete(deviceId);
      revokedCount++;
    }
  }
  
  console.log(`✅ Revoked ${revokedCount} trusted devices for user:`, userId);
  return revokedCount;
}

/**
 * Clean up expired trusted devices
 */
export function cleanupExpiredTrustedDevices(): number {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [deviceId, device] of trustedDevicesStore.entries()) {
    if (device.trustedUntil <= now) {
      trustedDevicesStore.delete(deviceId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired trusted devices`);
  }
  
  return cleanedCount;
}

/**
 * Generate a unique device ID
 */
function generateDeviceId(): string {
  const randomBytes = webcrypto.getRandomValues(new Uint8Array(16));
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Auto-cleanup expired trusted devices every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredTrustedDevices();
  }, 60 * 60 * 1000);
}
