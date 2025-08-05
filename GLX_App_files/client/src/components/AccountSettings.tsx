/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Phone,
  Wallet,
  Key,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Plus,
  Edit
} from 'lucide-react';
import { CountryCodeSelector } from '@/components/CountryCodeSelector';
import { Country } from '@/data/countries';
import { PrivacySettings } from './PrivacySettings';

interface AccountSettingsProps {
  trigger?: React.ReactNode;
}

export function AccountSettings({ trigger }: AccountSettingsProps) {
  const { user, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for different tabs
  const [emailForm, setEmailForm] = useState({
    email: user?.email || '',
    currentPassword: ''
  });

  const [phoneForm, setPhoneForm] = useState({
    phone: user?.phone?.replace(/^\+\d+/, '') || '',
    countryCode: user?.phone?.match(/^\+\d+/)?.[0] || '+1',
    currentPassword: ''
  });

  const [walletForm, setWalletForm] = useState({
    walletAddress: user?.wallet_address || ''
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    showEmail: false,
    showPhone: false,
    showWallet: false,
    walletDisplayMode: 'hidden' as 'hidden' | 'public' | 'tip-button'
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletForm({ walletAddress: accounts[0] });
        }
      } else {
        setError('MetaMask not detected. Please install MetaMask to connect a wallet.');
      }
    } catch (err) {
      setError('Failed to connect wallet');
    }
  };

  const handleUpdateEmail = async () => {
    if (!emailForm.email.trim()) {
      setError('Email address is required');
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailForm.email,
          currentPassword: emailForm.currentPassword
        })
      });

      if (response.ok) {
        setSuccess('Email address updated successfully');
        await refreshUser();
        setEmailForm({ ...emailForm, currentPassword: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to update email address');
      }
    } catch (error) {
      setError('Failed to update email address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!phoneForm.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      const fullPhone = `${phoneForm.countryCode}${phoneForm.phone.replace(/^[\+\s0]+/, '').replace(/\s/g, '')}`;

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: fullPhone,
          currentPassword: phoneForm.currentPassword
        })
      });

      if (response.ok) {
        setSuccess('Phone number updated successfully');
        await refreshUser();
        setPhoneForm({ ...phoneForm, currentPassword: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to update phone number');
      }
    } catch (error) {
      setError('Failed to update phone number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateWallet = async () => {
    if (!walletForm.walletAddress.trim()) {
      setError('Wallet address is required');
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet_address: walletForm.walletAddress
        })
      });

      if (response.ok) {
        setSuccess('Wallet address updated successfully');
        await refreshUser();
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to update wallet address');
      }
    } catch (error) {
      setError('Failed to update wallet address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setSuccess('Password updated successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to update password');
      }
    } catch (error) {
      setError('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrivacySettings = async (newSettings: typeof privacySettings) => {
    setIsLoading(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/privacy-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        setPrivacySettings(newSettings);
        setSuccess('Privacy settings updated successfully');
        await refreshUser();
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to update privacy settings');
      }
    } catch (error) {
      setError('Failed to update privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveEmail = async () => {
    if (!user?.phone && !user?.wallet_address) {
      setError('Cannot remove email - you need at least one authentication method');
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: null })
      });

      if (response.ok) {
        setSuccess('Email address removed successfully');
        await refreshUser();
        setEmailForm({ email: '', currentPassword: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to remove email address');
      }
    } catch (error) {
      setError('Failed to remove email address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhone = async () => {
    if (!user?.email && !user?.wallet_address) {
      setError('Cannot remove phone - you need at least one authentication method');
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: null })
      });

      if (response.ok) {
        setSuccess('Phone number removed successfully');
        await refreshUser();
        setPhoneForm({ phone: '', countryCode: '+1', currentPassword: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to remove phone number');
      }
    } catch (error) {
      setError('Failed to remove phone number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveWallet = async () => {
    if (!user?.email && !user?.phone) {
      setError('Cannot remove wallet - you need at least one authentication method');
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet_address: null })
      });

      if (response.ok) {
        setSuccess('Wallet address removed successfully');
        await refreshUser();
        setWalletForm({ walletAddress: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to remove wallet address');
      }
    } catch (error) {
      setError('Failed to remove wallet address');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Account Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Settings
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Password
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Address Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium">Current Status:</span>
                  {user?.email ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.email}</Badge>
                      {user.email_verified ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Verified
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary">
                      <Plus className="h-3 w-3 mr-1" />
                      No email address
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    {user?.email ? 'New Email Address' : 'Add Email Address'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>

                {user?.email && (
                  <div className="space-y-2">
                    <Label htmlFor="email-password">Current Password (required)</Label>
                    <Input
                      id="email-password"
                      type="password"
                      value={emailForm.currentPassword}
                      onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateEmail}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {user?.email ? 'Update Email' : 'Add Email'}
                  </Button>

                  {user?.email && (
                    <Button
                      variant="destructive"
                      onClick={handleRemoveEmail}
                      disabled={isLoading}
                    >
                      Remove Email
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phone" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Phone Number Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium">Current Status:</span>
                  {user?.phone ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.phone}</Badge>
                      {user.phone_verified ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Verified
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary">
                      <Plus className="h-3 w-3 mr-1" />
                      No phone number
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {user?.phone ? 'New Phone Number' : 'Add Phone Number'}
                  </Label>
                  <div className="flex gap-2">
                    <CountryCodeSelector
                      value={phoneForm.countryCode}
                      onChange={(dialCode: string, country: Country) =>
                        setPhoneForm({ ...phoneForm, countryCode: dialCode })
                      }
                      className="flex-shrink-0"
                    />
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneForm.phone}
                      onChange={(e) => setPhoneForm({ ...phoneForm, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="flex-1"
                    />
                  </div>
                </div>

                {user?.phone && (
                  <div className="space-y-2">
                    <Label htmlFor="phone-password">Current Password (required)</Label>
                    <Input
                      id="phone-password"
                      type="password"
                      value={phoneForm.currentPassword}
                      onChange={(e) => setPhoneForm({ ...phoneForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdatePhone}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {user?.phone ? 'Update Phone' : 'Add Phone'}
                  </Button>

                  {user?.phone && (
                    <Button
                      variant="destructive"
                      onClick={handleRemovePhone}
                      disabled={isLoading}
                    >
                      Remove Phone
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Address Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium">Current Status:</span>
                  {user?.wallet_address ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Plus className="h-3 w-3 mr-1" />
                      No wallet connected
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet">
                    {user?.wallet_address ? 'New Wallet Address' : 'Add Wallet Address'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="wallet"
                      value={walletForm.walletAddress}
                      onChange={(e) => setWalletForm({ walletAddress: e.target.value })}
                      placeholder="Enter wallet address or connect MetaMask"
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={connectWallet}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateWallet}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {user?.wallet_address ? 'Update Wallet' : 'Add Wallet'}
                  </Button>

                  {user?.wallet_address && (
                    <Button
                      variant="destructive"
                      onClick={handleRemoveWallet}
                      disabled={isLoading}
                    >
                      Remove Wallet
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Password Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button
                  onClick={handleUpdatePassword}
                  disabled={isLoading}
                  className="w-full"
                >
                  Update Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <PrivacySettings
              userPrivacySettings={privacySettings}
              onUpdatePrivacySettings={handleUpdatePrivacySettings}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}