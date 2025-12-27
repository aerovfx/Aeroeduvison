'use client';

import { Settings, Bell, Shield, Database } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-600 to-blue-600 bg-clip-text text-transparent mb-8">
        System Settings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { icon: Bell, title: t('dashboard.notifications'), desc: 'Configure alert preferences' },
          { icon: Shield, title: t('settings.security'), desc: 'Manage access controls' },
          { icon: Database, title: 'Data Management', desc: 'Backup and export options' },
          { icon: Settings, title: 'General', desc: 'System configuration' }
        ].map((setting, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-pointer">
            <setting.icon className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">{setting.title}</h3>
            <p className="text-sm text-gray-600">{setting.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

