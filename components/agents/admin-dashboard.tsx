"use client"

import { useState, useEffect } from "react"
import { 
  Activity, Users, DollarSign, Clock, AlertTriangle, 
  CheckCircle, TrendingUp, Server, Bot, Zap 
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"

interface SystemOverview {
  totalAgents: number
  activeAgents: number
  totalUsers: number
  todayInteractions: number
  todayCost: number
  systemHealth: {
    status: 'healthy' | 'degraded' | 'down'
    uptime: number
    apiLatency: number
    errorRate: number
    activeUsers: number
    queueDepth: number
  }
}

interface AgentUsage {
  agentId: string
  totalInteractions: number
  uniqueUsers: number
  avgResponseTime: number
  totalCost: number
  satisfaction: number
}

export function AdminDashboard() {
  const [overview, setOverview] = useState<SystemOverview | null>(null)
  const [agentUsage, setAgentUsage] = useState<AgentUsage[]>([])
  const [alerts, setAlerts] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [overviewRes, usageRes, alertsRes] = await Promise.all([
        fetch('/api/agents/admin'),
        fetch('/api/agents/admin?metric=usage'),
        fetch('/api/agents/admin?metric=alerts'),
      ])

      const overviewData = await overviewRes.json()
      const usageData = await usageRes.json()
      const alertsData = await alertsRes.json()

      if (overviewData.success) setOverview(overviewData.data.overview)
      if (usageData.success) setAgentUsage(usageData.data.usage)
      if (alertsData.success) setAlerts(alertsData.data.alerts)
    } catch (error) {
      toast.error("Không thể tải dashboard")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Health Banner */}
      {overview && (
        <Card className={
          overview.systemHealth.status === 'healthy' ? 'border-green-300 bg-green-50' :
          overview.systemHealth.status === 'degraded' ? 'border-yellow-300 bg-yellow-50' :
          'border-red-300 bg-red-50'
        }>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {overview.systemHealth.status === 'healthy' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : overview.systemHealth.status === 'degraded' ? (
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <div className="font-semibold text-lg">
                  Hệ thống {
                    overview.systemHealth.status === 'healthy' ? 'Hoạt động tốt' :
                    overview.systemHealth.status === 'degraded' ? 'Suy giảm' :
                    'Ngừng hoạt động'
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Uptime: {overview.systemHealth.uptime}% • 
                  Latency: {overview.systemHealth.apiLatency}ms • 
                  Active: {overview.systemHealth.activeUsers} users
                </div>
              </div>
            </div>
            <Badge className={
              overview.systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
              overview.systemHealth.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }>
              {overview.systemHealth.status.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Agents</span>
            </div>
            <div className="text-2xl font-bold">{overview?.totalAgents}</div>
            <div className="text-xs text-green-600 flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              {overview?.activeAgents} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Users</span>
            </div>
            <div className="text-2xl font-bold">{overview?.totalUsers}</div>
            <div className="text-xs text-muted-foreground">Total students</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Interactions</span>
            </div>
            <div className="text-2xl font-bold">{overview?.todayInteractions}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cost</span>
            </div>
            <div className="text-2xl font-bold">${overview?.todayCost.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Usage Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Agent Usage
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium">Agent</th>
                  <th className="text-right py-2 px-3 text-sm font-medium">Interactions</th>
                  <th className="text-right py-2 px-3 text-sm font-medium">Users</th>
                  <th className="text-right py-2 px-3 text-sm font-medium">Avg Response</th>
                  <th className="text-right py-2 px-3 text-sm font-medium">Cost</th>
                  <th className="text-right py-2 px-3 text-sm font-medium">Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {agentUsage.map((agent) => (
                  <tr key={agent.agentId} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-3">
                      <Badge variant="outline">{agent.agentId}</Badge>
                    </td>
                    <td className="text-right py-3 px-3">{agent.totalInteractions.toLocaleString()}</td>
                    <td className="text-right py-3 px-3">{agent.uniqueUsers}</td>
                    <td className="text-right py-3 px-3">{agent.avgResponseTime}s</td>
                    <td className="text-right py-3 px-3">${agent.totalCost.toFixed(2)}</td>
                    <td className="text-right py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        {agent.satisfaction}/5
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </h3>
            <div className="space-y-3">
              {alerts.recentAlerts.map((alert: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    alert.type === 'critical' ? 'bg-red-50' :
                    alert.type === 'warning' ? 'bg-yellow-50' :
                    'bg-blue-50'
                  }`}
                >
                  {alert.type === 'critical' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{alert.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.timestamp).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <Badge variant="outline" className={
                    alert.type === 'critical' ? 'border-red-300 text-red-700' :
                    alert.type === 'warning' ? 'border-yellow-300 text-yellow-700' :
                    'border-blue-300 text-blue-700'
                  }>
                    {alert.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
