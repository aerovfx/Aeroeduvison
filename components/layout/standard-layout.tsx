"use client"

import { ReactNode, useState } from "react"
import { 
  Bell, Settings, Search, Filter, Plus, 
  BarChart3, Activity, Heart, Users, TrendingUp,
  AlertTriangle, Brain, Trophy, Zap, Target, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface StandardLayoutProps {
  title: string
  description?: string
  children: ReactNode
  stats?: StatCard[]
  views?: ViewOption[]
  filters?: FilterOption[]
  timeRanges?: TimeRange[]
  actions?: ActionButton[]
  selectedView?: string
  selectedTimeRange?: string
  selectedFilter?: string
  searchQuery?: string
  onViewChange?: (view: string) => void
  onTimeRangeChange?: (range: string) => void
  onFilterChange?: (filter: string) => void
  onSearchChange?: (query: string) => void
  onActionClick?: (action: string) => void
}

interface StatCard {
  icon: ReactNode
  value: string | number
  label: string
  color?: string
  trend?: string
}

interface ViewOption {
  id: string
  icon: ReactNode
  label: string
}

interface FilterOption {
  id: string
  label: string
  count?: number
}

interface TimeRange {
  id: string
  label: string
}

interface ActionButton {
  icon: ReactNode
  label: string
  onClick: () => void
  badge?: number
}

export function StandardLayout({
  title,
  description,
  children,
  stats = [],
  views = [],
  filters = [],
  timeRanges = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'week', label: 'Tuần này' },
    { id: 'month', label: 'Tháng này' },
  ],
  actions = [],
  selectedView = '',
  selectedTimeRange = 'week',
  selectedFilter = 'all',
  searchQuery = '',
  onViewChange,
  onTimeRangeChange,
  onFilterChange,
  onSearchChange,
  onActionClick,
}: StandardLayoutProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto">
          {/* Title & Actions */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {actions.map((action, i) => (
                <Button
                  key={i}
                  onClick={action.onClick}
                  className="gap-2"
                >
                  {action.icon}
                  {action.label}
                  {action.badge !== undefined && (
                    <Badge variant="destructive" className="ml-1">
                      {action.badge}
                    </Badge>
                  )}
                </Button>
              ))}
              
              <Button variant="outline" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter */}
            {filters.length > 0 && (
              <select
                value={selectedFilter}
                onChange={(e) => onFilterChange?.(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {filters.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label} {filter.count !== undefined && `(${filter.count})`}
                  </option>
                ))}
              </select>
            )}

            {/* View Toggle */}
            {views.length > 0 && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {views.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => onViewChange?.(view.id)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      selectedView === view.id
                        ? 'bg-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {view.icon}
                  </button>
                ))}
              </div>
            )}

            {/* Time Range */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              {timeRanges.map((range) => (
                <button
                  key={range.id}
                  onClick={() => onTimeRangeChange?.(range.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedTimeRange === range.id
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats.length > 0 && (
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <Card key={i} className="border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 ${stat.color || 'text-gray-500'}`}>
                      {stat.icon}
                    </div>
                    {stat.trend && (
                      <span className={`text-xs ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.trend}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Preset icons for common stats
export const StatIcons = {
  Users: <Users className="w-8 h-8 text-blue-500" />,
  Trophy: <Trophy className="w-8 h-8 text-yellow-500" />,
  Brain: <Brain className="w-8 h-8 text-purple-500" />,
  Alert: <AlertTriangle className="w-8 h-8 text-red-500" />,
  Trending: <TrendingUp className="w-8 h-8 text-green-500" />,
  Zap: <Zap className="w-8 h-8 text-blue-500" />,
  Target: <Target className="w-8 h-8 text-purple-500" />,
  Clock: <Clock className="w-8 h-8 text-orange-500" />,
}

// Preset views
export const StandardViews = {
  Overview: { id: 'overview', icon: <BarChart3 className="w-4 h-4" />, label: 'Tổng quan' },
  Heatmap: { id: 'heatmap', icon: <Activity className="w-4 h-4" />, label: 'Heatmap' },
  Emotions: { id: 'emotions', icon: <Heart className="w-4 h-4" />, label: 'Cảm xúc' },
}
