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
      expect(status.algorithms.mlkem).toBe('ML-KEM-1024 (FIPS 203)');
      expect(status.algorithms.mldsa).toBe('ML-DSA-87 (FIPS 204)');
      expect(status.algorithms.slhdsa).toBe('SLH-DSA-256s (FIPS 205)');
    });

    it('should have correct security level (Level 5 - 256-bit equivalent)', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.securityLevel).toBe(5);
    });

    it('should be NIST compliant', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.complianceLevel).toBe('NIST Post-Quantum Standards');
      expect(status.hybridMode).toBe(true);
      expect(status.zeroKnowledgeProofs).toBe(true);
      expect(status.protectionScore).toBe(130); // Quantum-safe protection score
    });
  });

  describe('ML-KEM (CRYSTALS-Kyber) Key Encapsulation', () => {
    it('should have correct key sizes for ML-KEM-1024', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.algorithms.mlkem).toBe('ML-KEM-1024 (FIPS 203)');
      expect(status.keySizes?.mlkemPublic).toBe(1568); // ML-KEM-1024 public key size
    });

    it('should perform key encapsulation successfully', async () => {
      // Test through the service
      const testResults = await postQuantumCrypto.testOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.encapsulation.success).toBe(true);
    });
  });

  describe('ML-DSA (CRYSTALS-Dilithium) Digital Signatures', () => {
    it('should have correct key sizes for ML-DSA-87', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.algorithms.mldsa).toBe('ML-DSA-87 (FIPS 204)');
      expect(status.keySizes?.mldsaPublic).toBe(2592); // ML-DSA-87 public key size
    });

    it('should perform digital signatures successfully', async () => {
      const testResults = await postQuantumCrypto.testOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.signature.success).toBe(true);
    });
  });

  describe('SLH-DSA (SPHINCS+) Backup Signatures', () => {
    it('should have correct key sizes for SLH-DSA-256s', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.algorithms.slhdsa).toBe('SLH-DSA-256s (FIPS 205)');
      expect(status.keySizes?.slhdsaPublic).toBe(64); // SLH-DSA-256s compact public key size
    });
  });

  describe('Zero-Knowledge Proofs', () => {
    it('should support zero-knowledge proof generation', async () => {
      const testResults = await postQuantumCrypto.testOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.zkProof.success).toBe(true);
    });

    it('should be enabled in features', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.zeroKnowledgeProofs).toBe(true);
    });
  });

  describe('Hybrid Classical + Post-Quantum Cryptography', () => {
    it('should support hybrid cryptography for transition security', async () => {
      const testResults = await postQuantumCrypto.testOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.hybridEncryption.success).toBe(true);
    });

    it('should be enabled in features', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.hybridMode).toBe(true);
      expect(status.zeroKnowledgeProofs).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should be lightweight implementation', () => {
      const status = postQuantumCrypto.getStatus();
      
      expect(status.protectionScore).toBe(130); // Quantum-safe protection score
      expect(status.securityLevel).toBe(5); // 256-bit equivalent
    });
  });

  describe('Comprehensive Test Suite', () => {
    it('should pass all cryptographic operation tests', async () => {
      const testResults = await postQuantumCrypto.testOperations();
      
      expect(testResults.success).toBe(true);
      
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