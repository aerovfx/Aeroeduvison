import React, { useState } from 'react';
import { Save, Eye, EyeOff, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabsProps {
  name: string;
  label: string;
}

const TABS: TabsProps[] = [
  { name: 'system', label: 'Hệ thống' },
  { name: 'security', label: 'Bảo mật' },
  { name: 'email', label: 'Email' },
  { name: 'ai', label: 'AI & Models' },
  { name: 'backup', label: 'Backup' },
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('system');
  const [saveMessage, setSaveMessage] = useState('');

  // System Tab State
  const [systemSettings, setSystemSettings] = useState({
    schoolName: 'AeroEduVision Academy',
    maxStudents: 5000,
    maintenanceMode: false,
    language: 'vi',
  });

  // Security Tab State
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    twoFactorAuth: true,
    minPasswordLength: 8,
    requireSpecialChars: true,
    ipWhitelist: '192.168.1.0/24\n10.0.0.0/8',
  });

  // Email Tab State
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'admin@aeroedu.com',
    fromEmail: 'noreply@aeroedu.com',
  });

  // AI Tab State
  const [aiSettings, setAiSettings] = useState({
    apiKey: 'sk-1234567890abcdefghij',
    secondaryApiKey: 'sk-0987654321zyxwvutsrq',
    selectedModel: 'gpt-4',
    rateLimit: 1000,
  });

  // Backup Tab State
  const [backupSettings, setBackupSettings] = useState({
    lastBackup: '2024-04-08 14:30:00',
    autoBackupEnabled: true,
    backupSchedule: 'daily',
    retentionDays: 30,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecondaryApiKey, setShowSecondaryApiKey] = useState(false);

  const handleSaveSettings = () => {
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    const visible = key.slice(0, 10);
    const masked = '*'.repeat(Math.max(0, key.length - 14));
    const end = key.slice(-4);
    return `${visible}${masked}${end}`;
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">System Settings</h1>
        <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
      </div>

      {/* Toast Notification */}
      {saveMessage && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg z-50 animate-fade-in">
          <Check className="w-5 h-5" />
          {saveMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                'flex-1 px-6 py-4 font-medium text-center transition-colors border-b-2 -mb-px',
                activeTab === tab.name
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-600'
                  : 'bg-background text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">School Name</label>
                <input
                  type="text"
                  value={systemSettings.schoolName}
                  onChange={(e) => setSystemSettings({ ...systemSettings, schoolName: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Max Students: {systemSettings.maxStudents}</label>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={systemSettings.maxStudents}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maxStudents: parseInt(e.target.value) })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground mb-1">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">Put the system in maintenance mode</p>
                </div>
                <button
                  onClick={() => setSystemSettings({ ...systemSettings, maintenanceMode: !systemSettings.maintenanceMode })}
                  className={cn(
                    'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                    systemSettings.maintenanceMode ? 'bg-red-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                      systemSettings.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                <select
                  value={systemSettings.language}
                  onChange={(e) => setSystemSettings({ ...systemSettings, language: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="vi">Vietnamese (Tiếng Việt)</option>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground mb-1">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                </div>
                <button
                  onClick={() => setSecuritySettings({ ...securitySettings, twoFactorAuth: !securitySettings.twoFactorAuth })}
                  className={cn(
                    'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                    securitySettings.twoFactorAuth ? 'bg-green-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                      securitySettings.twoFactorAuth ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Minimum Password Length</label>
                <input
                  type="number"
                  value={securitySettings.minPasswordLength}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, minPasswordLength: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground mb-1">Require Special Characters</p>
                  <p className="text-sm text-muted-foreground">Enforce special characters in passwords</p>
                </div>
                <button
                  onClick={() => setSecuritySettings({ ...securitySettings, requireSpecialChars: !securitySettings.requireSpecialChars })}
                  className={cn(
                    'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                    securitySettings.requireSpecialChars ? 'bg-green-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                      securitySettings.requireSpecialChars ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">IP Whitelist</label>
                <textarea
                  value={securitySettings.ipWhitelist}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter one IP or CIDR block per line"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">SMTP Port</label>
                  <input
                    type="number"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">SMTP User (Masked)</label>
                <input
                  type="text"
                  value={emailSettings.smtpUser}
                  disabled
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">From Email Address</label>
                <input
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Test Email</button>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          )}

          {/* AI & Models Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">API Key (Masked)</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={showApiKey ? aiSettings.apiKey : maskApiKey(aiSettings.apiKey)}
                      disabled
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground cursor-not-allowed"
                    />
                  </div>
                  <button onClick={() => setShowApiKey(!showApiKey)} className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors">
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Secondary API Key (Masked)</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showSecondaryApiKey ? 'text' : 'password'}
                      value={showSecondaryApiKey ? aiSettings.secondaryApiKey : maskApiKey(aiSettings.secondaryApiKey)}
                      disabled
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground cursor-not-allowed"
                    />
                  </div>
                  <button onClick={() => setShowSecondaryApiKey(!showSecondaryApiKey)} className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors">
                    {showSecondaryApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Model</label>
                <select
                  value={aiSettings.selectedModel}
                  onChange={(e) => setAiSettings({ ...aiSettings, selectedModel: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                  <option value="gemini">Gemini Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Rate Limit (requests/hour)</label>
                <input
                  type="number"
                  value={aiSettings.rateLimit}
                  onChange={(e) => setAiSettings({ ...aiSettings, rateLimit: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          )}

          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">Last Backup:</span> {backupSettings.lastBackup}
                </p>
              </div>

              <button className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                <Save className="w-5 h-5" />
                Backup Now
              </button>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground mb-1">Auto Backup</p>
                  <p className="text-sm text-muted-foreground">Enable automatic backups</p>
                </div>
                <button
                  onClick={() => setBackupSettings({ ...backupSettings, autoBackupEnabled: !backupSettings.autoBackupEnabled })}
                  className={cn(
                    'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                    backupSettings.autoBackupEnabled ? 'bg-green-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                      backupSettings.autoBackupEnabled ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {backupSettings.autoBackupEnabled && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Backup Schedule</label>
                  <select
                    value={backupSettings.backupSchedule}
                    onChange={(e) => setBackupSettings({ ...backupSettings, backupSchedule: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Retention Period (days)</label>
                <input
                  type="number"
                  value={backupSettings.retentionDays}
                  onChange={(e) => setBackupSettings({ ...backupSettings, retentionDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">Restore from Backup</button>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
