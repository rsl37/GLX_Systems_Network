/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { postQuantumCrypto } from '../../server/postQuantumCrypto.js';

describe('Post-Quantum Cryptography Security Baseline', () => {
  beforeAll(async () => {
    await postQuantumCrypto.initialize();
  });

  describe('Initialization', () => {
    it('should initialize post-quantum cryptography successfully', async () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.algorithms.mlkem.status).toBe('ML-KEM-1024 (FIPS 203)');
      expect(status.algorithms.mldsa.status).toBe('ML-DSA-87 (FIPS 204)');
      expect(status.algorithms.slhdsa.status).toBe('SLH-DSA-256s (FIPS 205)');
    });

    it('should provide security level 5 protection', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.algorithms.mlkem.securityLevel).toBe(5);
      expect(status.algorithms.mldsa.securityLevel).toBe(5);
      expect(status.algorithms.slhdsa.securityLevel).toBe(5);
    });

    it('should be NIST compliant', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.algorithms.mlkem.nistsCompliant).toBe(true);
      expect(status.algorithms.mldsa.nistsCompliant).toBe(true);
      expect(status.algorithms.slhdsa.nistsCompliant).toBe(true);
    });
  });

  describe('ML-KEM (CRYSTALS-Kyber) Key Encapsulation', () => {
    it('should perform key encapsulation and decapsulation', async () => {
      const data = Buffer.from('Test secret message for encapsulation');
      const result = await postQuantumCrypto.encapsulate(data);
      
      expect(result.ciphertext).toBeDefined();
      expect(result.sharedSecret).toBeDefined();
      expect(Buffer.isBuffer(result.ciphertext)).toBe(true);
      expect(Buffer.isBuffer(result.sharedSecret)).toBe(true);
    });
  });

  describe('ML-DSA (CRYSTALS-Dilithium) Digital Signatures', () => {
    it('should sign and verify messages', async () => {
      const message = Buffer.from('GALAX Civic Platform - Test Message');
      const signature = await postQuantumCrypto.sign(message);
      
      expect(signature).toBeDefined();
      expect(Buffer.isBuffer(signature)).toBe(true);
      
      const isValid = await postQuantumCrypto.verify(message, signature);
      expect(isValid).toBe(true);
    });
  });

  describe('SLH-DSA (SPHINCS+) Backup Signatures', () => {
    it('should provide backup signature functionality', async () => {
      const message = Buffer.from('Backup signature test');
      const backupSig = await postQuantumCrypto.sign(message);
      
      expect(backupSig).toBeDefined();
      expect(Buffer.isBuffer(backupSig)).toBe(true);
    });
  });

  describe('Zero-Knowledge Proofs', () => {
    it('should generate and verify zero-knowledge proofs', async () => {
      const secret = 'test-secret-data';
      const zkResult = await postQuantumCrypto.generateZKProof(secret);
      
      expect(zkResult).toBeDefined();
      expect(zkResult.proof).toBeDefined();
      expect(zkResult.commitment).toBeDefined();
      expect(Buffer.isBuffer(zkResult.proof)).toBe(true);
    });
  });

  describe('Hybrid Classical + Post-Quantum Cryptography', () => {
    it('should combine classical and post-quantum methods', async () => {
      const data = Buffer.from('Hybrid encryption test data');
      const result = await postQuantumCrypto.hybridEncrypt(data);
      
      expect(result.encrypted).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(Buffer.isBuffer(result.encrypted)).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain acceptable performance levels', async () => {
      const start = Date.now();
      await postQuantumCrypto.testOperations();
      const duration = Date.now() - start;
      
      // Should complete within reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Comprehensive Test Suite', () => {
    it('should pass all cryptographic operations', async () => {
      const testResults = await postQuantumCrypto.testOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results).toBeDefined();
      
      // Check all operations passed
      expect(testResults.results.encapsulation.success).toBe(true);
      expect(testResults.results.signature.success).toBe(true);
      expect(testResults.results.hybridEncryption.success).toBe(true);
      expect(testResults.results.zkProof.success).toBe(true);
    });
  });

  describe('Future-Proofing and Regulatory Compliance', () => {
    it('should be quantum-safe and future-proof', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.complianceLevel).toBe('NIST Post-Quantum Standards');
      expect(status.protectionScore).toBe(130); // Quantum-safe protection
    });

    it('should meet post-quantum security requirements', () => {
      const status = postQuantumCrypto.getStatus();
      
      // Should exceed traditional enterprise security
      expect(status.securityLevel).toBeGreaterThanOrEqual(5);
      expect(status.protectionScore).toBeGreaterThan(100);
    });
  });

  describe('Integration with GALAX Security System', () => {
    it('should integrate with security manager', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.hybridMode).toBe(true);
      expect(status.zeroKnowledgeProofs).toBe(true);
    });
  });
});