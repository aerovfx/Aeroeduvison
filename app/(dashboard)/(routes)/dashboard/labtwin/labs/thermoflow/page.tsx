'use client';

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Play, RotateCcw, Activity, Loader2 } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

export default function ThermoFlowPage() {
  const { t } = useLanguage();
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  
  // Lab configuration
  const config = {
    name: "ThermoFlow",
    title: "Nhiệt động lực học",
    description: "Dòng nhiệt, truyền nhiệt, chu trình nhiệt động",
    category: "Nhiệt học",
    level: "Nâng cao",
    xp: 250,
    port: 8006
  };

  useEffect(() => {
    // Backend check disabled - use offline mode by default
    const ENABLE_BACKEND_CHECK = false;
    
    if (!ENABLE_BACKEND_CHECK) {
      setBackendStatus('offline');
      return;
    }

    // Check backend status
    const checkBackend = async () => {
      try {
        const response = await fetch(`http://localhost:8006/api/health`);
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const runSimulation = async () => {
    setLoading(true);
    try {
      // TODO: Implement simulation logic
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Flame className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Nhiệt động lực học</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          Dòng nhiệt, truyền nhiệt, chu trình nhiệt động
        </p>
        
        {/* Backend Status */}
        <div className="flex items-center justify-center space-x-2">
          <Badge 
            variant={backendStatus === 'online' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            <Activity className="h-3 w-3" />
            <span>
              {backendStatus === 'online' ? 'Backend Online' : 
               backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}
            </span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            Port 8006
          </span>
        </div>
      </div>

      {/* Main Simulation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Simulation Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Flame className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Ready to Simulate</h3>
            <p className="text-muted-foreground mb-4">
              Click the button below to start the simulation
            </p>
            <Button 
              onClick={runSimulation}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              <span>{loading ? 'Running...' : 'Start Simulation'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About This Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl mb-2">📚</div>
              <h4 className="font-semibold">{t('achievements.level')}</h4>
              <p className="text-sm text-muted-foreground">{config['level']}</p>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl mb-2">⭐</div>
              <h4 className="font-semibold">XP Reward</h4>
              <p className="text-sm text-muted-foreground">+{config['xp']} XP</p>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl mb-2">🔬</div>
              <h4 className="font-semibold">Category</h4>
              <p className="text-sm text-muted-foreground">{config['category']}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}