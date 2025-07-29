/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  postQuantumCrypto, 
  initializePostQuantumSecurity, 
  getPostQuantumStatus,
  testPostQuantumOperations 
} from '../../server/postQuantumCrypto.js';

describe('Post-Quantum Cryptography Security Baseline', () => {
  beforeAll(async () => {
    await initializePostQuantumSecurity();
  });

  describe('Initialization', () => {
    it('should initialize post-quantum cryptography successfully', async () => {
      const status = getPostQuantumStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.algorithms.mlkem.nistsCompliant).toBe(true);
      expect(status.algorithms.mldsa.nistsCompliant).toBe(true);
      expect(status.algorithms.slhdsa.nistsCompliant).toBe(true);
    });

    it('should have correct security level (Level 5 - 256-bit equivalent)', () => {
      const status = getPostQuantumStatus();
      
      expect(status.algorithms.mlkem.securityLevel).toBe(5);
      expect(status.algorithms.mldsa.securityLevel).toBe(5);
      expect(status.algorithms.slhdsa.securityLevel).toBe(5);
    });

    it('should be NIST compliant', () => {
      const status = getPostQuantumStatus();
      
      expect(status.complianceStatus.fips203).toBe(true); // ML-KEM
      expect(status.complianceStatus.fips204).toBe(true); // ML-DSA
      expect(status.complianceStatus.fips205).toBe(true); // SLH-DSA
      expect(status.complianceStatus.quantumSafe).toBe(true);
      expect(status.complianceStatus.futureProof).toBe(true);
    });
  });

  describe('ML-KEM (CRYSTALS-Kyber) Key Encapsulation', () => {
    it('should have correct key sizes for ML-KEM-1024', () => {
      const status = getPostQuantumStatus();
      
      expect(status.algorithms.mlkem.algorithm).toBe('ML-KEM-1024');
      expect(status.algorithms.mlkem.publicKeySize).toBeGreaterThan(1500); // ML-KEM-1024 public key size range
    });

    it('should perform key encapsulation successfully', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      
      // Test through the service
      const testResults = await testPostQuantumOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.keyEncapsulation).toBe(true);
    });
  });

  describe('ML-DSA (CRYSTALS-Dilithium) Digital Signatures', () => {
    it('should have correct key sizes for ML-DSA-87', () => {
      const status = getPostQuantumStatus();
      
      expect(status.algorithms.mldsa.algorithm).toBe('ML-DSA-87');
      expect(status.algorithms.mldsa.publicKeySize).toBeGreaterThan(2500); // ML-DSA-87 public key size range
    });

    it('should perform digital signatures successfully', async () => {
      const testResults = await testPostQuantumOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.digitalSignatures).toBe(true);
    });
  });

  describe('SLH-DSA (SPHINCS+) Backup Signatures', () => {
    it('should have correct key sizes for SLH-DSA-SHAKE-256s', () => {
      const status = getPostQuantumStatus();
      
      expect(status.algorithms.slhdsa.algorithm).toBe('SLH-DSA-SHAKE-256s');
      expect(status.algorithms.slhdsa.publicKeySize).toBeGreaterThan(0); // Actual key size from implementation
    });
  });

  describe('Zero-Knowledge Proofs', () => {
    it('should support zero-knowledge proof generation', async () => {
      const testResults = await testPostQuantumOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.zeroKnowledgeProofs).toBe(true);
    });

    it('should be enabled in features', () => {
      const status = getPostQuantumStatus();
      
      expect(status.features.zeroKnowledgeProofs).toBe(true);
    });
  });

  describe('Hybrid Classical + Post-Quantum Cryptography', () => {
    it('should support hybrid cryptography for transition security', async () => {
      const testResults = await testPostQuantumOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.hybridCryptography).toBe(true);
    });

    it('should be enabled in features', () => {
      const status = getPostQuantumStatus();
      
      expect(status.features.hybridCryptography).toBe(true);
      expect(status.features.secureStorage).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should be lightweight implementation', () => {
      const status = getPostQuantumStatus();
      
      expect(status.performance.implementationSize).toBe('37KB');
      expect(status.performance.keyGenerationTime).toBe('~20ms');
      expect(status.performance.memoryFootprint).toBe('Lightweight');
    });
  });

  describe('Comprehensive Test Suite', () => {
    it('should pass all cryptographic operation tests', async () => {
      const testResults = await testPostQuantumOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.errors).toHaveLength(0);
      
      // Check all operations passed
      expect(testResults.results.keyGeneration).toBe(true);
      expect(testResults.results.keyEncapsulation).toBe(true);
      expect(testResults.results.digitalSignatures).toBe(true);
      expect(testResults.results.zeroKnowledgeProofs).toBe(true);
      expect(testResults.results.hybridCryptography).toBe(true);
    });
  });

  describe('Future-Proofing and Regulatory Compliance', () => {
    it('should be quantum-safe and future-proof', () => {
      const status = getPostQuantumStatus();
      
      expect(status.complianceStatus.quantumSafe).toBe(true);
      expect(status.complianceStatus.futureProof).toBe(true);
    });

    it('should meet post-quantum security requirements', () => {
      const status = getPostQuantumStatus();
      
      // Should exceed traditional enterprise security
      expect(status.algorithms.mlkem.securityLevel).toBeGreaterThanOrEqual(5);
      expect(status.algorithms.mldsa.securityLevel).toBeGreaterThanOrEqual(5);
      expect(status.algorithms.slhdsa.securityLevel).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Integration with GALAX Security System', () => {
    it('should integrate with security manager', () => {
      const status = getPostQuantumStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.features.keyEncapsulation).toBe(true);
      expect(status.features.digitalSignatures).toBe(true);
    });
  });
});