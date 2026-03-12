"use client"

import { PageHeader } from "@/components/layout/page-header"
import { AdminDashboard } from "@/components/agents/admin-dashboard"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"

export default function AdminAgentsPage() {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/agents/admin', { method: 'POST', body: JSON.stringify({ action: 'hourly-update' }) })
      toast.success('Đã cập nhật analytics')
    } catch (error) {
      toast.error('Không thể cập nhật')
    } finally {
      setRefreshing(false)
    }
  }

  const handleExport = () => {
    toast.success('Đang chuẩn bị export... (TODO)')
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <PageHeader
        title="Admin Dashboard - Agents"
        description="Monitoring & Analytics cho hệ thống Agents"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6">
          <AdminDashboard />
        </div>
      </div>
    </div>
  )
}
