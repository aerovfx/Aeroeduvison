'use client';

import { Shield, Users, Key, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminOperationsPage() {
  const { t } = useLanguage();
  
  const users = [
    { name: 'Alice Johnson', email: 'alice@example.com', role: 'STUDENT', status: 'active', lastActive: '5 min ago' },
    { name: 'Ms. Sarah', email: 'sarah@example.com', role: 'TEACHER', status: 'active', lastActive: '10 min ago' },
    { name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', status: 'active', lastActive: '1 min ago' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-8">
        Admin Operations Panel
      </h1>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          User Management
        </h2>
        <div className="space-y-3">
          {users.map((user, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {user.role}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {user.status}
                </span>
                <span className="text-sm text-gray-500">{user.lastActive}</span>
              
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

