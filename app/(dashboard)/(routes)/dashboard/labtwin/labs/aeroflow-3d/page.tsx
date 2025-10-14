"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Wind, Play, Pause, RotateCcw, Download, 
  Settings, Zap, Info, BookOpen, Waves, Loader2 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AeroFlowParticleViewer } from "@/components/simulations/aeroflow-particle-viewer"
import toast from "react-hot-toast"

const API_ENDPOINT = "http://localhost:8008"

interface SimulationResult {
  step: number
  time: number
  particles: any[]
  forces: {
    drag: number
    lift: number
    drag_coefficient: number
    lift_coefficient: number
  }
  particle_count: number
}

export default function AeroFlow3DPage() {
  const [simulationData, setSimulationData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showVectors, setShowVectors] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>('sphere_flow')
  const [presets, setPresets] = useState<any[]>([])

  // Load presets on mount
  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/presets`)
      const data = await response.json()
      setPresets(data.presets || [])
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  const runSimulation = async (presetId?: string) => {
    setLoading(true)
    setCurrentFrame(0)
    setIsPlaying(false)

    try {
      // Get preset config
      const preset = presets.find(p => p.id === (presetId || selectedPreset))
      if (!preset) {
        throw new Error('Preset not found')
      }

      toast.loading('Starting 3D simulation...', { id: 'sim' })

      const response = await fetch(`${API_ENDPOINT}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset.config)
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      setSimulationData(result)
      
      toast.success(
        `Simulation complete! ${result.results.length} frames, ${result.stats.avg_fps.toFixed(1)} FPS`,
        { id: 'sim' }
      )

    } catch (error: any) {
      console.error('Simulation error:', error)
      toast.error(
        `Failed to run simulation: ${error.message}. Make sure Python API is running on port 8008.`,
        { id: 'sim' }
      )
    } finally {
      setLoading(false)
    }
  }

  const handlePresetClick = (presetId: string) => {
    setSelectedPreset(presetId)
    runSimulation(presetId)
  }

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !simulationData) return

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1
        if (next >= simulationData.results.length) {
          setIsPlaying(false)
          return prev
        }
        return next
      })
    }, 100 / playbackSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, playbackSpeed, simulationData])

  const frames = simulationData?.results || []
  const currentFrameData = frames[currentFrame] || { particles: [], forces: {} }
  const forces = currentFrameData.forces || { drag_coefficient: 0, lift_coefficient: 0 }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard/labtwin/labs" 
            className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Labs
          </Link>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-xl">
              <Waves className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">
                AeroFlow XR - 3D Fluid Dynamics
              </h1>
              <p className="text-blue-200 text-lg mb-3">
                GPU-accelerated 3D Navier-Stokes simulation with particle visualization
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Taichi GPU
                </Badge>
                <Badge variant="outline" className="border-blue-300 text-blue-200">
                  64×32×32 Grid
                </Badge>
                <Badge variant="outline" className="border-blue-300 text-blue-200">
                  3D Particles
                </Badge>
                <Badge variant="outline" className="border-purple-300 text-purple-200">
                  MVP Version
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="simulation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="simulation" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Simulation
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="theory" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Theory
            </TabsTrigger>
          </TabsList>

          {/* Simulation Tab */}
          <TabsContent value="simulation" className="space-y-6">
            {/* Presets */}
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Choose Scenario
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Select a preset configuration to start simulation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => handlePresetClick(preset.id)}
                      disabled={loading}
                    >
                      <span className="text-2xl">{preset.icon}</span>
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {preset.description}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 3D Viewer */}
            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-[600px] bg-slate-900 rounded-lg">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                      <p className="text-white">Running 3D simulation on GPU...</p>
                      <p className="text-slate-400 text-sm mt-2">This may take 5-10 seconds</p>
                    </div>
                  </div>
                ) : simulationData ? (
                  <div className="relative">
                    <AeroFlowParticleViewer
                      particles={currentFrameData.particles}
                      gridSize={simulationData.grid_size}
                      obstacle={simulationData.config.obstacle}
                      showVectors={showVectors}
                      showStats={showStats}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] bg-slate-900 rounded-lg">
                    <div className="text-center">
                      <Wind className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Select a preset to start simulation</p>
                    </div>
                  </div>
                )}

                {/* Playback Controls */}
                {simulationData && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setIsPlaying(!isPlaying)}
                        variant={isPlaying ? "destructive" : "default"}
                        size="sm"
                      >
                        {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                        {isPlaying ? 'Pause' : 'Play'}
                      </Button>
                      
                      <Button onClick={() => setCurrentFrame(0)} variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      
                      <div className="ml-auto text-sm text-slate-300">
                        Frame: {currentFrame + 1} / {frames.length}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Timeline</Label>
                      <Slider
                        value={[currentFrame]}
                        onValueChange={(values) => {
                          setCurrentFrame(values[0])
                          setIsPlaying(false)
                        }}
                        min={0}
                        max={frames.length - 1}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Speed */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Playback Speed</Label>
                        <span className="text-sm text-slate-400">{playbackSpeed}x</span>
                      </div>
                      <Slider
                        value={[playbackSpeed]}
                        onValueChange={(values) => setPlaybackSpeed(values[0])}
                        min={0.5}
                        max={3}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Forces Display */}
            {simulationData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Wind className="h-5 w-5 text-blue-400" />
                      Drag Force
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-blue-400">
                      {forces.drag_coefficient?.toFixed(4) || '0.0000'}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">
                      Drag Coefficient (Cd)
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5 text-purple-400" />
                      Lift Force
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-purple-400">
                      {forces.lift_coefficient?.toFixed(4) || '0.0000'}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">
                      Lift Coefficient (Cl)
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Visualization Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vectors" className="text-slate-300">Show Velocity Vectors</Label>
                  <Switch
                    id="vectors"
                    checked={showVectors}
                    onCheckedChange={setShowVectors}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="stats" className="text-slate-300">Show Performance Stats</Label>
                  <Switch
                    id="stats"
                    checked={showStats}
                    onCheckedChange={setShowStats}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-900/20 border-blue-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 space-y-2 text-sm">
                <div>
                  <strong>Grid Size:</strong> 64×32×32 voxels (65,536 total)
                </div>
                <div>
                  <strong>Solver:</strong> 3D Navier-Stokes with Taichi GPU
                </div>
                <div>
                  <strong>Visualization:</strong> Particle-based (800-1000 particles/frame)
                </div>
                <div>
                  <strong>Expected Performance:</strong> 10-20 FPS on GPU, 1-5 FPS on CPU
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">3D Navier-Stokes Equations</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 space-y-4">
                <div className="bg-slate-900 p-4 rounded-lg font-mono text-sm">
                  <div>∂u/∂t + (u·∇)u = -∇p + ν∇²u + f</div>
                  <div className="mt-2">∇·u = 0  (incompressibility)</div>
                </div>
                
                <div className="space-y-3 text-sm">
                  <h4 className="font-semibold text-white">Components:</h4>
                  <ul className="space-y-2">
                    <li><strong>u</strong> = (u, v, w): 3D velocity field</li>
                    <li><strong>p</strong>: Pressure field</li>
                    <li><strong>ν</strong>: Kinematic viscosity</li>
                    <li><strong>f</strong>: External forces (gravity, etc.)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Technology Stack</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold text-white mb-2">Backend (Python)</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Taichi</strong>: GPU-accelerated physics engine</li>
                    <li><strong>FastAPI</strong>: REST API server (port 8008)</li>
                    <li><strong>NumPy</strong>: Numerical computation</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-2">Frontend (Next.js)</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Three.js</strong>: 3D WebGL rendering</li>
                    <li><strong>React Three Fiber</strong>: React wrapper for Three.js</li>
                    <li><strong>Particle System</strong>: 800-1000 particles per frame</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

