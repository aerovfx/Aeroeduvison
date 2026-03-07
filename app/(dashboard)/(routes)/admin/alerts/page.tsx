'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertTriangle, Heart, Activity, Users, BookOpen, Server,
  CheckCircle, Clock, XCircle, Eye, ChevronDown, Filter,
  Play, Pause, MoreVertical, MessageSquare, Send
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'emotion' | 'engagement' | 'risk' | 'teacher' | 'content' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  title: string;
  description: string;
  explainability: string;
  suggestedActions: string[];
  assignedTo?: string;
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'snoozed';
  slaDeadline: string;
  createdAt: string;
  resolvedAt?: string;
}

export default function AdminAlertsPage() {
  const { t } = useLanguage();
  
  const [selectedTab, setSelectedTab] = useState<'all' | 'emotion' | 'engagement' | 'risk' | 'teacher'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tabCounts, setTabCounts] = useState<any>({});

  // Fetch alerts from API
  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        type: selectedTab === 'all' ? 'all' : selectedTab,
        severity: selectedSeverity,
        status: selectedStatus
      });
      
      console.log('[Admin Alerts] Fetching alerts with params:', params.toString());
      
      const response = await fetch(`/api/admin/alerts?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Admin Alerts] API error response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch alerts');
      }
      
      const data = await response.json();
      console.log('✅ [Admin Alerts] Fetched:', data.alerts.length, 'alerts');
      console.log('[Admin Alerts] Tab counts:', data.metadata.byType);
      
      setAlerts(data.alerts);
      setTabCounts(data.metadata.byType);
      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ [Admin Alerts] Error:', error);
      console.error('❌ [Admin Alerts] Error message:', error.message);
      
      // Show user-friendly error
      toast.error(`Failed to load alerts: ${error.message || 'Please check server logs'}`);
      
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedTab, selectedSeverity, selectedStatus]);

  const tabs = [
    { key: 'all', label: 'All Alerts', count: alerts.length },
    { key: 'emotion', label: 'Emotion', count: tabCounts.emotion || 0 },
    { key: 'engagement', label: t('vision.engagement'), count: tabCounts.engagement || 0 },
    { key: 'risk', label: 'Risk', count: tabCounts.risk || 0 },
    { key: 'teacher', label: t('emotion.teacher'), count: tabCounts.teacher || 0 }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-400 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      default: return 'bg-blue-100 border-blue-400 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-purple-100 text-purple-700';
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'snoozed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emotion': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'engagement': return <Activity className="w-5 h-5 text-blue-500" />;
      case 'risk': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'teacher': return <Users className="w-5 h-5 text-green-500" />;
      case 'content': return <BookOpen className="w-5 h-5 text-purple-500" />;
      case 'system': return <Server className="w-5 h-5 text-gray-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleViewDetail = (alert: Alert) => {
    setSelectedAlert(alert);
    setShowDetail(true);
  };

  const handleAction = (action: string, alertId: string) => {
    console.log(`🚀 [Admin] Executing action: ${action} on alert: ${alertId}`);
    alert(`Action: ${action}\nAlert: ${alertId}\n\nThis would trigger the corresponding API endpoint.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Alerts & Workflow Inbox
        </h1>
        <p className="text-gray-600">AI-generated alerts and recommended actions</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                selectedTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                selectedTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        
              </div>

        {/* Filters */}
        <div className="p-4 flex items-center gap-4 border-b">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="snoozed">Snoozed</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading alerts...</p>
        </div>
      )}

      {/* Alerts List */}
      {!isLoading && (
        <div className="space-y-4">
          {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all ${
              alert.severity === 'critical' ? 'border-red-200' :
              alert.severity === 'high' ? 'border-orange-200' :
              'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`p-3 rounded-lg ${getSeverityColor(alert.severity)}`}>
                {getTypeIcon(alert.type)}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{alert.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                        {alert.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {alert.studentName && (
                      <p className="text-sm text-gray-600">
                        Student: <span className="font-medium text-gray-900">{alert.studentName}</span>
                      </p>
                    )}
                    {alert.teacherName && (
                      <p className="text-sm text-gray-600">
                        Teacher: <span className="font-medium text-gray-900">{alert.teacherName}</span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewDetail(alert)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </button>
                </div>

                <p className="text-gray-700 mb-3">{alert.description}</p>

                {/* Explainability */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">💡 Why am I seeing this?</p>
                  <p className="text-sm text-blue-800">{alert.explainability}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {alert.suggestedActions.slice(0, 3).map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAction(action, alert.id)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        {action}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {alert.assignedTo && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {alert.assignedTo}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      SLA: {alert.slaDeadline}
                    </span>
                    <span>{alert.createdAt}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}

      {!isLoading && alerts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">All clear!</h3>
          <p className="text-gray-600">No alerts matching your filters</p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Alert Details</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {getTypeIcon(selectedAlert.type)}
                  <h3 className="text-xl font-bold text-gray-900">{selectedAlert.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getSeverityColor(selectedAlert.severity)}`}>
                    {selectedAlert.severity.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAlert.status)}`}>
                    {selectedAlert.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedAlert.description}</p>
              </div>

              {/* Explainability */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">AI Explanation</h4>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800">{selectedAlert.explainability}</p>
                </div>
              </div>

              {/* Suggested Actions */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Suggested Actions</h4>
                <div className="space-y-2">
                  {selectedAlert.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAction(action, selectedAlert.id)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center justify-between group"
                    >
                      <span className="font-medium">{action}</span>
                      <Play className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="font-medium text-gray-900">{selectedAlert.createdAt}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">SLA Deadline</p>
                  <p className="font-medium text-gray-900">{selectedAlert.slaDeadline}</p>
                </div>
                {selectedAlert.assignedTo && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                    <p className="font-medium text-gray-900">{selectedAlert.assignedTo}</p>
                  </div>
                )}
                {selectedAlert.resolvedAt && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Resolved</p>
                    <p className="font-medium text-gray-900">{selectedAlert.resolvedAt}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleAction('Auto-Resolve', selectedAlert.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Run Auto-Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

