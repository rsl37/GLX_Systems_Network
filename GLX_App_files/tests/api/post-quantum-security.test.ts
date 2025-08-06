/*
<<<<<<< HEAD
 * Copyright (c) 2025 GALAX Civic Networking App
=======
 * Copyright (c) 2025 GLX Civic Networking App
>>>>>>> main
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
<<<<<<< HEAD
import { postQuantumCrypto } from '../../server/postQuantumCrypto.js';

describe('Post-Quantum Cryptography Security Baseline', () => {
  beforeAll(async () => {
    await postQuantumCrypto.initialize();
=======
import { 
  postQuantumCrypto, 
  initializePostQuantumSecurity, 
  getPostQuantumStatus,
  testPostQuantumOperations 
} from '../../server/postQuantumCrypto.js';

describe('Post-Quantum Cryptography Security Baseline', () => {
  beforeAll(async () => {
    await initializePostQuantumSecurity();
>>>>>>> main
  });

  describe('Initialization', () => {
    it('should initialize post-quantum cryptography successfully', async () => {
<<<<<<< HEAD
      const status = postQuantumCrypto.getStatus();

      expect(status.initialized).toBe(true);
      expect(status.algorithms.mlkem.status).toBe('ML-KEM-1024 (FIPS 203)');
      expect(status.algorithms.mldsa.status).toBe('ML-DSA-87 (FIPS 204)');
      expect(status.algorithms.slhdsa.status).toBe('SLH-DSA-256s (FIPS 205)');
    });

    it('should provide security level 5 protection', () => {
      const status = postQuantumCrypto.getStatus();

=======
      const status = getPostQuantumStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.algorithms.mlkem.nistsCompliant).toBe(true);
      expect(status.algorithms.mldsa.nistsCompliant).toBe(true);
      expect(status.algorithms.slhdsa.nistsCompliant).toBe(true);
    });

    it('should have correct security level (Level 5 - 256-bit equivalent)', () => {
      const status = getPostQuantumStatus();
      
>>>>>>> main
      expect(status.algorithms.mlkem.securityLevel).toBe(5);
      expect(status.algorithms.mldsa.securityLevel).toBe(5);
      expect(status.algorithms.slhdsa.securityLevel).toBe(5);
    });

    it('should be NIST compliant', () => {
<<<<<<< HEAD
      const status = postQuantumCrypto.getStatus();

      expect(status.algorithms.mlkem.nistsCompliant).toBe(true);
      expect(status.algorithms.mldsa.nistsCompliant).toBe(true);
      expect(status.algorithms.slhdsa.nistsCompliant).toBe(true);
=======
      const status = getPostQuantumStatus();
      
      expect(status.complianceStatus.fips203).toBe(true); // ML-KEM
      expect(status.complianceStatus.fips204).toBe(true); // ML-DSA
      expect(status.complianceStatus.fips205).toBe(true); // SLH-DSA
      expect(status.complianceStatus.quantumSafe).toBe(true);
      expect(status.complianceStatus.futureProof).toBe(true);
>>>>>>> main
    });
  });

  describe('ML-KEM (CRYSTALS-Kyber) Key Encapsulation', () => {
<<<<<<< HEAD
    it('should perform key encapsulation and decapsulation', async () => {
      const data = Buffer.from('Test secret message for encapsulation');
      const result = await postQuantumCrypto.encapsulate(data);

      expect(result.ciphertext).toBeDefined();
      expect(result.sharedSecret).toBeDefined();
      expect(Buffer.isBuffer(result.ciphertext)).toBe(true);
      expect(Buffer.isBuffer(result.sharedSecret)).toBe(true);
=======
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
>>>>>>> main
    });
  });

  describe('ML-DSA (CRYSTALS-Dilithium) Digital Signatures', () => {
<<<<<<< HEAD
    it('should sign and verify messages', async () => {
      const message = Buffer.from('GALAX Civic Platform - Test Message');
      const signature = await postQuantumCrypto.sign(message);

      expect(signature).toBeDefined();
      expect(Buffer.isBuffer(signature)).toBe(true);

      const isValid = await postQuantumCrypto.verify(message, signature);
      expect(isValid).toBe(true);
=======
    it('should have correct key sizes for ML-DSA-87', () => {
      const status = getPostQuantumStatus();
      
      expect(status.algorithms.mldsa.algorithm).toBe('ML-DSA-87');
      expect(status.algorithms.mldsa.publicKeySize).toBeGreaterThan(2500); // ML-DSA-87 public key size range
    });

    it('should perform digital signatures successfully', async () => {
      const testResults = await testPostQuantumOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.digitalSignatures).toBe(true);
>>>>>>> main
    });
  });

  describe('SLH-DSA (SPHINCS+) Backup Signatures', () => {
<<<<<<< HEAD
    it('should provide backup signature functionality', async () => {
      const message = Buffer.from('Backup signature test');
      const backupSig = await postQuantumCrypto.sign(message);

      expect(backupSig).toBeDefined();
      expect(Buffer.isBuffer(backupSig)).toBe(true);
=======
    it('should have correct key sizes for SLH-DSA-SHAKE-256s', () => {
      const status = getPostQuantumStatus();
      
      expect(status.algorithms.slhdsa.algorithm).toBe('SLH-DSA-SHAKE-256s');
      expect(status.algorithms.slhdsa.publicKeySize).toBeGreaterThan(0); // Actual key size from implementation
>>>>>>> main
    });
  });

  describe('Zero-Knowledge Proofs', () => {
<<<<<<< HEAD
    it('should generate and verify zero-knowledge proofs', async () => {
      const secret = 'test-secret-data';
      const zkResult = await postQuantumCrypto.generateZKProof(secret);

      expect(zkResult).toBeDefined();
      expect(zkResult.proof).toBeDefined();
      expect(zkResult.commitment).toBeDefined();
      expect(Buffer.isBuffer(zkResult.proof)).toBe(true);
=======
    it('should support zero-knowledge proof generation', async () => {
      const testResults = await testPostQuantumOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.zeroKnowledgeProofs).toBe(true);
    });

    it('should be enabled in features', () => {
      const status = getPostQuantumStatus();
      
      expect(status.features.zeroKnowledgeProofs).toBe(true);
>>>>>>> main
    });
  });

  describe('Hybrid Classical + Post-Quantum Cryptography', () => {
<<<<<<< HEAD
    it('should combine classical and post-quantum methods', async () => {
      const data = Buffer.from('Hybrid encryption test data');
      const result = await postQuantumCrypto.hybridEncrypt(data);

      expect(result.encrypted).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(Buffer.isBuffer(result.encrypted)).toBe(true);
=======
    it('should support hybrid cryptography for transition security', async () => {
      const testResults = await testPostQuantumOperations();
      
      expect(testResults.success).toBe(true);
      expect(testResults.results.hybridCryptography).toBe(true);
    });

    it('should be enabled in features', () => {
      const status = getPostQuantumStatus();
      
      expect(status.features.hybridCryptography).toBe(true);
      expect(status.features.secureStorage).toBe(true);
>>>>>>> main
    });
  });

  describe('Performance Characteristics', () => {
<<<<<<< HEAD
    it('should maintain acceptable performance levels', async () => {
      const start = Date.now();
      await postQuantumCrypto.testOperations();
      const duration = Date.now() - start;

      // Should complete within reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
=======
    it('should be lightweight implementation', () => {
      const status = getPostQuantumStatus();
      
      expect(status.performance.implementationSize).toBe('37KB');
      expect(status.performance.keyGenerationTime).toBe('~20ms');
      expect(status.performance.memoryFootprint).toBe('Lightweight');
>>>>>>> main
    });
  });

  describe('Comprehensive Test Suite', () => {
<<<<<<< HEAD
    it('should pass all cryptographic operations', async () => {
      const testResults = await postQuantumCrypto.testOperations();

      expect(testResults.success).toBe(true);
      expect(testResults.results).toBeDefined();

      // Check all operations passed
      expect(testResults.results.encapsulation.success).toBe(true);
      expect(testResults.results.signature.success).toBe(true);
      expect(testResults.results.hybridEncryption.success).toBe(true);
      expect(testResults.results.zkProof.success).toBe(true);
=======
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
>>>>>>> main
    });
  });

  describe('Future-Proofing and Regulatory Compliance', () => {
    it('should be quantum-safe and future-proof', () => {
<<<<<<< HEAD
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
=======
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

  describe('Integration with GLX Security System', () => {
    it('should integrate with security manager', () => {
      const status = getPostQuantumStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.features.keyEncapsulation).toBe(true);
      expect(status.features.digitalSignatures).toBe(true);
    });
  });
});
>>>>>>> main
