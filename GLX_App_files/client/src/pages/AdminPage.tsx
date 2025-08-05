/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Activity,
  Zap,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SecurityStatus {
  antimalware: {
    enabled: boolean;
    lastScan: string;
    threatsDetected: number;
    quarantinedFiles: number;
  };
  antivirus: {
    enabled: boolean;
    definitionsCount: number;
    lastUpdate: string;
    totalScans: number;
    virusesDetected: number;
  };
  antiHacking: {
    enabled: boolean;
    attackPatternsActive: number;
    suspiciousIPs: number;
    blockedIPs: number;
    ddosProtectionActive: boolean;
    botDetectionActive: boolean;
    honeypotActive: boolean;
  };
  overall: {
    securityLevel: 'low' | 'medium' | 'high' | 'maximum' | 'quantum-safe';
    protectionScore: number;
    lastUpdate: string;
  };
  postQuantum?: {
    enabled: boolean;
    algorithms: string[];
    securityLevel: number;
    protectionScore: number;
    compliance: string;
  };
}

interface PostQuantumStatus {
  initialized: boolean;
  securityLevel: number;
  algorithms: {
    mlkem: string;
    mldsa: string;
    slhdsa: string;
  };
  hybridMode: boolean;
  zeroKnowledgeProofs: boolean;
  keySizes: {
    mlkemPublic: number;
    mldsaPublic: number;
    slhdsaPublic: number;
  } | null;
  complianceLevel: string;
  protectionScore: number;
  lastInitialized: string | null;
}

export function AdminPage() {
  const { user } = useAuth();
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [postQuantumStatus, setPostQuantumStatus] = useState<PostQuantumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingPQ, setTestingPQ] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadSecurityStatus();
    loadPostQuantumStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      const response = await fetch('/api/admin/security/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSecurityStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to load security status:', error);
    }
  };

  const loadPostQuantumStatus = async () => {
    try {
      const response = await fetch('/api/admin/security/post-quantum/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setPostQuantumStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to load post-quantum status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testPostQuantumOperations = async () => {
    setTestingPQ(true);
    try {
      const response = await fetch('/api/admin/security/post-quantum/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setTestResults(data.data);
      }
    } catch (error) {
      console.error('Failed to test post-quantum operations:', error);
    } finally {
      setTestingPQ(false);
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'quantum-safe': return 'from-purple-500 to-pink-500';
      case 'maximum': return 'from-green-500 to-emerald-500';
      case 'high': return 'from-blue-500 to-cyan-500';
      case 'medium': return 'from-yellow-500 to-orange-500';
      case 'low': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getSecurityLevelBadge = (level: string) => {
    switch (level) {
      case 'quantum-safe': return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">QUANTUM-SAFE</Badge>;
      case 'maximum': return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">MAXIMUM</Badge>;
      case 'high': return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">HIGH</Badge>;
      case 'medium': return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">MEDIUM</Badge>;
      case 'low': return <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white">LOW</Badge>;
      default: return <Badge variant="secondary">UNKNOWN</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Security Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Security Administration
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Monitor and manage the comprehensive security protection for the GLX Civic Platform.
          </p>
        </motion.div>

        {/* Overall Security Status */}
        {securityStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <span>Overall Security Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Security Level</h3>
                    <p className="text-gray-600">Current protection level</p>
                  </div>
                  {getSecurityLevelBadge(securityStatus.overall.securityLevel)}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Protection Score</span>
                    <span className="font-semibold">{securityStatus.overall.protectionScore}/130</span>
                  </div>
                  <Progress
                    value={(securityStatus.overall.protectionScore / 130) * 100}
                    className="h-3"
                  />
                  <p className="text-sm text-gray-500">
                    {securityStatus.overall.protectionScore >= 130 ? 'Quantum-safe protection active' :
                     securityStatus.overall.protectionScore >= 100 ? 'Maximum traditional protection' :
                     'Standard protection active'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Post-Quantum Security Status */}
        {postQuantumStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-purple-600" />
                  <span>Post-Quantum Cryptography</span>
                  {postQuantumStatus.initialized && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      QUANTUM-SAFE
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  NIST-compliant post-quantum algorithms for future-proof security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center space-x-2">
                      <CheckCircle className={`h-4 w-4 ${postQuantumStatus.initialized ? 'text-green-500' : 'text-gray-400'}`} />
                      <span>Status</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Initialized:</span>
                        <span className={postQuantumStatus.initialized ? 'text-green-600' : 'text-red-600'}>
                          {postQuantumStatus.initialized ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Security Level:</span>
                        <span className="font-semibold">{postQuantumStatus.securityLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protection Score:</span>
                        <span className="font-semibold text-purple-600">{postQuantumStatus.protectionScore}/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-blue-500" />
                      <span>Algorithms</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>ML-KEM:</span>
                        <span>{postQuantumStatus.algorithms.mlkem}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ML-DSA:</span>
                        <span>{postQuantumStatus.algorithms.mldsa}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SLH-DSA:</span>
                        <span>{postQuantumStatus.algorithms.slhdsa}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Features</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      {postQuantumStatus.hybridMode ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>Hybrid Mode</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {postQuantumStatus.zeroKnowledgeProofs ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>Zero-Knowledge Proofs</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button
                    onClick={testPostQuantumOperations}
                    disabled={testingPQ}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {testingPQ ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Testing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4" />
                        <span>Test Operations</span>
                      </div>
                    )}
                  </Button>
                </div>

                {testResults && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-semibold mb-2">Test Results</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Overall Success:</span>
                        <span className={testResults.success ? 'text-green-600' : 'text-red-600'}>
                          {testResults.success ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      {testResults.results && Object.entries(testResults.results).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span className={value.success ? 'text-green-600' : 'text-red-600'}>
                            {value.success ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Traditional Security Systems */}
        {securityStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Antimalware */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShieldAlert className="h-5 w-5 text-orange-600" />
                  <span>Antimalware</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  {securityStatus.antimalware.enabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Status: {securityStatus.antimalware.enabled ? 'Active' : 'Disabled'}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Threats Detected:</span>
                    <span className="font-semibold">{securityStatus.antimalware.threatsDetected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quarantined Files:</span>
                    <span className="font-semibold">{securityStatus.antimalware.quarantinedFiles}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Antivirus */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span>Antivirus</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  {securityStatus.antivirus.enabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Status: {securityStatus.antivirus.enabled ? 'Active' : 'Disabled'}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Definitions:</span>
                    <span className="font-semibold">{securityStatus.antivirus.definitionsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Scans:</span>
                    <span className="font-semibold">{securityStatus.antivirus.totalScans}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Viruses Detected:</span>
                    <span className="font-semibold">{securityStatus.antivirus.virusesDetected}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anti-Hacking */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-red-600" />
                  <span>Anti-Hacking</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  {securityStatus.antiHacking.enabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Status: {securityStatus.antiHacking.enabled ? 'Active' : 'Disabled'}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Suspicious IPs:</span>
                    <span className="font-semibold">{securityStatus.antiHacking.suspiciousIPs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Blocked IPs:</span>
                    <span className="font-semibold">{securityStatus.antiHacking.blockedIPs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DDoS Protection:</span>
                    <span className={securityStatus.antiHacking.ddosProtectionActive ? 'text-green-600' : 'text-red-600'}>
                      {securityStatus.antiHacking.ddosProtectionActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;