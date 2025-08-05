/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Eye,
  EyeOff,
  Mail,
  Phone,
  Wallet,
  AlertTriangle,
  DollarSign,
  Shield,
  CheckCircle
} from 'lucide-react';

interface PrivacySettingsProps {
  userPrivacySettings: {
    showEmail: boolean;
    showPhone: boolean;
    showWallet: boolean;
    walletDisplayMode: 'hidden' | 'public' | 'tip-button';
  };
  onUpdatePrivacySettings: (settings: any) => Promise<void>;
}

export function PrivacySettings({ userPrivacySettings, onUpdatePrivacySettings }: PrivacySettingsProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  const [pendingWalletSetting, setPendingWalletSetting] = useState<'public' | 'tip-button' | null>(null);

  const handleEmailToggle = async (checked: boolean) => {
    setIsLoading(true);
    await onUpdatePrivacySettings({
      ...userPrivacySettings,
      showEmail: checked
    });
    setIsLoading(false);
  };

  const handlePhoneToggle = async (checked: boolean) => {
    setIsLoading(true);
    await onUpdatePrivacySettings({
      ...userPrivacySettings,
      showPhone: checked
    });
    setIsLoading(false);
  };

  const handleWalletToggle = async (checked: boolean) => {
    if (checked && user?.wallet_address && userPrivacySettings.walletDisplayMode === 'hidden') {
      // Show warning dialog to choose display mode
      setShowWalletWarning(true);
    } else {
      setIsLoading(true);
      await onUpdatePrivacySettings({
        ...userPrivacySettings,
        showWallet: checked,
        walletDisplayMode: checked ? userPrivacySettings.walletDisplayMode || 'tip-button' : 'hidden'
      });
      setIsLoading(false);
    }
  };

  const handleWalletModeSelection = async (mode: 'public' | 'tip-button') => {
    setIsLoading(true);
    await onUpdatePrivacySettings({
      ...userPrivacySettings,
      showWallet: true,
      walletDisplayMode: mode
    });
    setShowWalletWarning(false);
    setPendingWalletSetting(null);
    setIsLoading(false);
  };

  const handleCancelWalletWarning = () => {
    setShowWalletWarning(false);
    setPendingWalletSetting(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Control what information is visible on your public profile. Your authentication methods remain secure regardless of these settings.
            </AlertDescription>
          </Alert>

          {/* Email Privacy */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-base font-medium">Email Address</Label>
                <p className="text-sm text-gray-600">
                  {user?.email ? `Show ${user.email} on your profile` : 'No email address added'}
                </p>
              </div>
            </div>
            <Switch
              checked={userPrivacySettings.showEmail}
              onCheckedChange={handleEmailToggle}
              disabled={!user?.email || isLoading}
            />
          </div>

          {/* Phone Privacy */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-base font-medium">Phone Number</Label>
                <p className="text-sm text-gray-600">
                  {user?.phone ? `Show ${user.phone} on your profile` : 'No phone number added'}
                </p>
              </div>
            </div>
            <Switch
              checked={userPrivacySettings.showPhone}
              onCheckedChange={handlePhoneToggle}
              disabled={!user?.phone || isLoading}
            />
          </div>

          {/* Wallet Privacy */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-base font-medium">Wallet Address</Label>
                <p className="text-sm text-gray-600">
                  {user?.wallet_address ? (
                    userPrivacySettings.walletDisplayMode === 'public' ?
                      'Show full wallet address on your profile' :
                    userPrivacySettings.walletDisplayMode === 'tip-button' ?
                      'Show "Wallet Verified" badge with tip button' :
                      'Keep wallet address private'
                  ) : 'No wallet address added'}
                </p>
              </div>
            </div>
            <Switch
              checked={userPrivacySettings.showWallet}
              onCheckedChange={handleWalletToggle}
              disabled={!user?.wallet_address || isLoading}
            />
          </div>

          {/* Current wallet display mode info */}
          {user?.wallet_address && userPrivacySettings.showWallet && (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Current display mode: <strong>
                      {userPrivacySettings.walletDisplayMode === 'public' ? 'Full Address' : 'Tip Button Only'}
                    </strong>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWalletWarning(true)}
                  >
                    Change Mode
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Wallet Display Warning Dialog */}
      <Dialog open={showWalletWarning} onOpenChange={setShowWalletWarning}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Wallet Address Display Options
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Warning:</strong> Displaying your wallet address publicly may expose your transaction history and holdings to anyone who views your profile.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="p-4 border-2 border-blue-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                   onClick={() => setPendingWalletSetting('tip-button')}>
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                    pendingWalletSetting === 'tip-button' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {pendingWalletSetting === 'tip-button' && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                      <strong>Tip Button Only (Recommended)</strong>
                    </div>
                    <p className="text-sm text-gray-600">
                      Show a "Wallet Verified" badge and tip button without revealing your actual wallet address.
                      This keeps your privacy while allowing people to send you tips.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-2 border-red-200 rounded-lg cursor-pointer hover:border-red-400 transition-colors"
                   onClick={() => setPendingWalletSetting('public')}>
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                    pendingWalletSetting === 'public' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                  }`}>
                    {pendingWalletSetting === 'public' && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-red-500" />
                      <strong>Show Full Address</strong>
                    </div>
                    <p className="text-sm text-gray-600">
                      Display your complete wallet address on your profile. Anyone can see your transaction history and token balances.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelWalletWarning}>
              Cancel
            </Button>
            <Button
              onClick={() => pendingWalletSetting && handleWalletModeSelection(pendingWalletSetting)}
              disabled={!pendingWalletSetting || isLoading}
              className={pendingWalletSetting === 'public' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isLoading ? 'Saving...' : 'Confirm Selection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}