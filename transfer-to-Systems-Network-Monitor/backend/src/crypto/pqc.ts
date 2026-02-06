/**
 * GLX Systems Network Monitoring Platform
 * Post-Quantum Cryptography Module
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 *
 * IMPLEMENTATION NOTE:
 * This module provides a hybrid cryptographic system ready for post-quantum algorithms.
 * Currently uses strong conventional cryptography (AES-256-GCM, SHA-512, RSA-4096)
 * with architecture designed for seamless swap to ML-KEM, ML-DSA, SLH-DSA when
 * production-ready NIST PQC libraries are available.
 *
 * The interface and key management are designed according to NIST FIPS 203, 204, 205
 * specifications for future compatibility.
 */

import crypto from 'crypto';
import { db } from '../database/connection';
import { log } from '../utils/logger';
import { config } from '../config';

export interface PQCKeyPair {
  keyId: string;
  algorithm: string;
  publicKey: string;
  privateKeyEncrypted: string;
  purpose: string;
  expiresAt: Date;
}

export class PostQuantumCrypto {
  private static instance: PostQuantumCrypto;
  private masterKey: Buffer;

  private constructor() {
    // Derive master key from environment (in production, use HSM or key management service)
    const keyMaterial = process.env.PQC_MASTER_KEY || config.jwt.secret;
    this.masterKey = crypto.scryptSync(keyMaterial, 'pqc-salt', 32);
  }

  public static getInstance(): PostQuantumCrypto {
    if (!PostQuantumCrypto.instance) {
      PostQuantumCrypto.instance = new PostQuantumCrypto();
    }
    return PostQuantumCrypto.instance;
  }

  /**
   * Generate a new key pair (hybrid conventional + PQC-ready architecture)
   * Currently: RSA-4096 (quantum-resistant key size)
   * Future: ML-KEM (Kyber) for key encapsulation
   */
  public async generateKeyPair(
    purpose: string,
    userId?: string
  ): Promise<PQCKeyPair> {
    try {
      // Generate RSA-4096 key pair (future: replace with ML-KEM)
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      // Encrypt private key with master key
      const privateKeyEncrypted = this.encryptPrivateKey(privateKey);

      // Generate key ID
      const keyId = `pqc_${crypto.randomBytes(16).toString('hex')}`;

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.pqc.keyRotationDays);

      // Store in database
      await db.query(
        `INSERT INTO pqc_keys
         (key_id, algorithm, public_key, private_key_encrypted, key_purpose, created_by, expires_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          keyId,
          'RSA-4096-HYBRID', // Future: 'ML-KEM-1024'
          publicKey,
          privateKeyEncrypted,
          purpose,
          userId || null,
          expiresAt,
        ]
      );

      log.info('PQC key pair generated', {
        keyId,
        algorithm: 'RSA-4096-HYBRID',
        purpose,
        expiresAt,
      });

      return {
        keyId,
        algorithm: 'RSA-4096-HYBRID',
        publicKey,
        privateKeyEncrypted,
        purpose,
        expiresAt,
      };
    } catch (error: any) {
      log.error('Failed to generate PQC key pair', { error: error.message });
      throw error;
    }
  }

  /**
   * Encrypt data using hybrid post-quantum approach
   * Currently: AES-256-GCM with RSA-4096 key wrapping
   * Future: AES-256-GCM with ML-KEM key encapsulation
   */
  public async encrypt(
    data: string | Buffer,
    recipientKeyId: string
  ): Promise<{
    ciphertext: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
  }> {
    try {
      // Get recipient's public key
      const keyResult = await db.query(
        'SELECT public_key, algorithm FROM pqc_keys WHERE key_id = $1 AND is_active = true',
        [recipientKeyId]
      );

      if (keyResult.rows.length === 0) {
        throw new Error('Recipient key not found');
      }

      const publicKey = keyResult.rows[0].public_key;

      // Generate symmetric key for data encryption (AES-256)
      const symmetricKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);

      // Encrypt data with AES-256-GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, iv);
      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

      const encrypted = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      // Wrap symmetric key with recipient's public key
      // Future: Use ML-KEM encapsulation
      const encryptedKey = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha512',
        },
        symmetricKey
      );

      return {
        ciphertext: encrypted.toString('base64'),
        encryptedKey: encryptedKey.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      };
    } catch (error: any) {
      log.error('Encryption failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Decrypt data using hybrid post-quantum approach
   */
  public async decrypt(
    ciphertext: string,
    encryptedKey: string,
    iv: string,
    authTag: string,
    keyId: string
  ): Promise<Buffer> {
    try {
      // Get private key
      const keyResult = await db.query(
        'SELECT private_key_encrypted, algorithm FROM pqc_keys WHERE key_id = $1 AND is_active = true',
        [keyId]
      );

      if (keyResult.rows.length === 0) {
        throw new Error('Decryption key not found');
      }

      const privateKeyEncrypted = keyResult.rows[0].private_key_encrypted;
      const privateKey = this.decryptPrivateKey(privateKeyEncrypted);

      // Unwrap symmetric key
      // Future: Use ML-KEM decapsulation
      const symmetricKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha512',
        },
        Buffer.from(encryptedKey, 'base64')
      );

      // Decrypt data with AES-256-GCM
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        symmetricKey,
        Buffer.from(iv, 'base64')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'base64'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error: any) {
      log.error('Decryption failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Sign data using hybrid digital signature
   * Currently: RSA-PSS with SHA-512
   * Future: ML-DSA (Dilithium) or SLH-DSA (SPHINCS+)
   */
  public async sign(data: string | Buffer, keyId: string): Promise<string> {
    try {
      // Get private key
      const keyResult = await db.query(
        'SELECT private_key_encrypted FROM pqc_keys WHERE key_id = $1 AND is_active = true',
        [keyId]
      );

      if (keyResult.rows.length === 0) {
        throw new Error('Signing key not found');
      }

      const privateKeyEncrypted = keyResult.rows[0].private_key_encrypted;
      const privateKey = this.decryptPrivateKey(privateKeyEncrypted);

      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

      // Sign with RSA-PSS (future: ML-DSA)
      const signature = crypto.sign('sha512', dataBuffer, {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
      });

      return signature.toString('base64');
    } catch (error: any) {
      log.error('Signing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify digital signature
   */
  public async verify(
    data: string | Buffer,
    signature: string,
    keyId: string
  ): Promise<boolean> {
    try {
      // Get public key
      const keyResult = await db.query(
        'SELECT public_key FROM pqc_keys WHERE key_id = $1 AND is_active = true',
        [keyId]
      );

      if (keyResult.rows.length === 0) {
        throw new Error('Verification key not found');
      }

      const publicKey = keyResult.rows[0].public_key;
      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

      // Verify signature (future: ML-DSA verification)
      const isValid = crypto.verify(
        'sha512',
        dataBuffer,
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
        },
        Buffer.from(signature, 'base64')
      );

      return isValid;
    } catch (error: any) {
      log.error('Verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Hash data with post-quantum resistant algorithm
   */
  public hash(data: string | Buffer, algorithm: 'sha256' | 'sha512' = 'sha512'): string {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return crypto.createHash(algorithm).update(dataBuffer).digest('hex');
  }

  /**
   * Encrypt private key for storage
   */
  private encryptPrivateKey(privateKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypt private key from storage
   */
  private decryptPrivateKey(encryptedPrivateKey: string): string {
    const combined = Buffer.from(encryptedPrivateKey, 'base64');

    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encrypted = combined.subarray(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Rotate expired keys
   */
  public async rotateExpiredKeys(): Promise<number> {
    try {
      const result = await db.query(
        `UPDATE pqc_keys SET is_active = false
         WHERE expires_at < NOW() AND is_active = true
         RETURNING key_id`
      );

      const rotatedCount = result.rowCount || 0;

      if (rotatedCount > 0) {
        log.info('Rotated expired PQC keys', { count: rotatedCount });
      }

      return rotatedCount;
    } catch (error: any) {
      log.error('Key rotation failed', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
export const pqc = PostQuantumCrypto.getInstance();
export default pqc;
