'use client';

import React, { useState, useCallback } from 'react';
import CircuitCanvas from '@/components/labtwin/circuit-canvas';
import ComponentPalette from '@/components/labtwin/component-palette';
import CodeEditor from '@/components/labtwin/code-editor';
import SerialMonitor from '@/components/labtwin/serial-monitor';
import { DiagramJSON, ComponentDef, EditorFile, SimulationState } from '@/lib/labtwin/types';
import { EXAMPLE_PROJECTS, ESP32_HTTP_SERVER } from '@/lib/labtwin/example-projects';

export default function LabtwinCircuitPage() {
  // Project state
  const [projectName, setProjectName] = useState('ESP32 HTTP Server');
  const [diagram, setDiagram] = useState<DiagramJSON>(ESP32_HTTP_SERVER.diagram);
  const [files, setFiles] = useState<EditorFile[]>(ESP32_HTTP_SERVER.files);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // UI state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'code' | 'serial'>('code');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Simulation state
  const [simulation, setSimulation] = useState<SimulationState>({
    running: false,
    paused: false,
    time: 0,
    pinStates: {},
    serialOutput: [],
  });

  const [pinStates, setPinStates] = useState<Record<string, Record<string, boolean>>>({});

  // Add component from palette
  const handleAddComponent = useCallback((component: ComponentDef) => {
    setDiagram(prev => ({
      ...prev,
      parts: [...prev.parts, component],
    }));
  }, []);

  // Update file content
  const handleFileChange = useCallback((index: number, content: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, content } : f));
  }, []);

  // Simulation controls
  const handleStart = useCallback(() => {
    setSimulation(prev => ({ ...prev, running: true, paused: false, serialOutput: [] }));
    const messages = [
      'Connecting to WiFi Wokwi-GUEST...',
      '....',
      'Connected!',
      'IP address: 192.168.1.100',
      'HTTP server started (port 80)',
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < messages.length) {
        setSimulation(prev => ({
          ...prev,
          serialOutput: [...prev.serialOutput, messages[i]],
          time: prev.time + 500,
        }));
        i++;
      }
    }, 800);

    const ledInterval = setInterval(() => {
      setPinStates(prev => ({
        ...prev,
        led1: { A: !prev.led1?.A },
        led2: { A: !prev.led2?.A },
      }));
    }, 2000);

    (window as any).__simIntervals = [interval, ledInterval];
  }, []);

  const handleStop = useCallback(() => {
    setSimulation(prev => ({ ...prev, running: false, paused: false, time: 0 }));
    setPinStates({});
    const intervals = (window as any).__simIntervals;
    if (intervals) {
      intervals.forEach((i: any) => clearInterval(i));
    }
  }, []);

  const handlePause = useCallback(() => {
    setSimulation(prev => ({ ...prev, paused: !prev.paused }));
  }, []);

  // Load example project
  const handleLoadProject = useCallback((projectId: string) => {
    const project = EXAMPLE_PROJECTS.find(p => p.id === projectId);
    if (project) {
      setProjectName(project.name);
      setDiagram(project.data.diagram);
      setFiles(project.data.files);
      setActiveFileIndex(0);
      setSelectedId(null);
      handleStop();
    }
  }, [handleStop]);

  // Export diagram
  const handleExport = useCallback(() => {
    const data = JSON.stringify(diagram, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [diagram]);

  // Delete selected component
  const handleDelete = useCallback(() => {
    if (selectedId) {
      setDiagram(prev => ({
        ...prev,
        parts: prev.parts.filter(p => p.id !== selectedId),
        connections: prev.connections.filter(c =>
          !c[0].startsWith(selectedId + ':') && !c[1].startsWith(selectedId + ':')
        ),
      }));
      setSelectedId(null);
    }
  }, [selectedId]);

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* ============================================ */}
      {/* Top bar - Wokwi style */}
      {/* ============================================ */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center text-xs font-bold">
              LT
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent tracking-wide">
              LABTWIN
            </span>
          </div>

          <span className="text-gray-600">|</span>

          {/* Project name - editable */}
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-gray-200 text-sm font-medium focus:outline-none hover:text-white border-b border-transparent hover:border-gray-500 focus:border-blue-500 px-1 py-0.5 min-w-[160px]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Example projects */}
          <select
            onChange={(e) => handleLoadProject(e.target.value)}
            className="bg-[#3c3c3c] text-gray-300 text-xs px-3 py-1.5 rounded border border-[#555] cursor-pointer hover:border-gray-400"
            defaultValue=""
          >
            <option value="" disabled>Ví Dụ Mẫu...</option>
            {EXAMPLE_PROJECTS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ============================================ */}
      {/* Main content: Code LEFT | Simulation RIGHT */}
      {/* Matches Wokwi layout exactly */}
      {/* ============================================ */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Code Editor + Serial Monitor */}
        <div className="flex flex-col border-r border-[#3c3c3c]" style={{ width: '45%' }}>
          {/* Editor tabs */}
          <div className="flex bg-[#252526] border-b border-[#3c3c3c] shrink-0">
            <button
              onClick={() => setActivePanel('code')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activePanel === 'code'
                  ? 'text-white bg-[#1e1e1e] border-t-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {files[activeFileIndex]?.name || 'code.ino'}
            </button>
            {files.length > 1 && files.map((f, i) => i !== activeFileIndex && (
              <button
                key={i}
                onClick={() => { setActiveFileIndex(i); setActivePanel('code'); }}
                className="px-4 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {f.name}
              </button>
            ))}
            <button
              onClick={() => setActivePanel('serial')}
              className={`px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 ml-auto ${
                activePanel === 'serial'
                  ? 'text-green-400 bg-[#1e1e1e] border-t-2 border-green-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Serial Monitor
              {simulation.running && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
            {activePanel === 'code' ? (
              <CodeEditor
                files={files}
                activeFileIndex={activeFileIndex}
                onFileChange={handleFileChange}
                onActiveFileChange={setActiveFileIndex}
              />
            ) : (
              <SerialMonitor
                output={simulation.serialOutput}
                isRunning={simulation.running}
              />
            )}
          </div>
        </div>

        {/* RIGHT: Simulation area (Canvas) */}
        <div className="flex-1 min-w-0 relative bg-[#1a1a2e]">
          {/* ============================================ */}
          {/* Floating toolbar - Wokwi style */}
          {/* Green Play | Blue "+" | Gray Menu */}
          {/* ============================================ */}
          <div className="absolute top-4 left-4 z-40 flex flex-col gap-3">
            {/* Simulation label */}
            <div className="bg-[#333]/80 backdrop-blur-sm px-3 py-1 rounded text-xs text-gray-300 font-medium w-fit">
              Simulation
            </div>

            {/* Toolbar buttons */}
            <div className="flex items-center gap-3">
              {/* Play / Stop button */}
              {!simulation.running ? (
                <button
                  onClick={handleStart}
                  className="w-12 h-12 rounded-full bg-[#4caf50] hover:bg-[#66bb6a] flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                  title="Start Simulation"
                >
                  <svg width="18" height="20" viewBox="0 0 18 20" fill="white">
                    <path d="M0 0 L18 10 L0 20 Z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="w-12 h-12 rounded-full bg-[#f44336] hover:bg-[#ef5350] flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                  title="Stop Simulation"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                    <rect width="16" height="16" rx="2" />
                  </svg>
                </button>
              )}

              {/* Add component button */}
              <button
                onClick={() => setShowAddDialog(!showAddDialog)}
                className="w-12 h-12 rounded-full bg-[#2196f3] hover:bg-[#42a5f5] flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                title="Add a new part"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                  <path d="M10 2 V18 M2 10 H18" strokeWidth="3" stroke="white" fill="none" strokeLinecap="round" />
                </svg>
              </button>

              {/* Menu button */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-12 h-12 rounded-full bg-[#757575] hover:bg-[#9e9e9e] flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                  title="More options"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                    <circle cx="10" cy="4" r="2" />
                    <circle cx="10" cy="10" r="2" />
                    <circle cx="10" cy="16" r="2" />
                  </svg>
                </button>

                {/* Menu dropdown */}
                {showMenu && (
                  <div className="absolute top-14 left-0 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl py-1 min-w-[180px] z-50">
                    <button
                      onClick={() => { handleExport(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3a3a3a] transition-colors"
                    >
                      📥 Export diagram.json
                    </button>
                    <button
                      onClick={() => { handleDelete(); setShowMenu(false); }}
                      disabled={!selectedId}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3a3a3a] transition-colors disabled:opacity-40"
                    >
                      🗑️ Delete selected
                    </button>
                    <div className="border-t border-[#444] my-1" />
                    <div className="px-4 py-2 text-xs text-gray-500">
                      Components: {diagram.parts.length} • Wires: {diagram.connections.length}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Simulation time indicator */}
            {simulation.running && (
              <div className="flex items-center gap-2 bg-[#333]/80 backdrop-blur-sm px-3 py-1 rounded text-xs w-fit">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-300 font-mono">{(simulation.time / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>

          {/* Component picker dialog (Wokwi-style modal) */}
          <ComponentPalette
            isOpen={showAddDialog}
            onClose={() => setShowAddDialog(false)}
            onAddComponent={handleAddComponent}
          />

          {/* ============================================ */}
          {/* Canvas */}
          {/* ============================================ */}
          <CircuitCanvas
            diagram={diagram}
            onDiagramChange={setDiagram}
            pinStates={pinStates}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {/* Bottom-right tools */}
          <div className="absolute bottom-4 right-4 z-40 flex items-center gap-2">
            {/* Rotate / Delete */}
            {selectedId && (
              <>
                <button
                  onClick={() => {
                    setDiagram(prev => ({
                      ...prev,
                      parts: prev.parts.map(p =>
                        p.id === selectedId
                          ? { ...p, rotate: ((p.rotate || 0) + 90) % 360 }
                          : p
                      ),
                    }));
                  }}
                  className="w-10 h-10 rounded-lg bg-[#333]/90 hover:bg-[#444] flex items-center justify-center text-gray-300 transition-colors"
                  title="Rotate"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 4v6h6M23 20v-6h-6" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-10 h-10 rounded-lg bg-[#333]/90 hover:bg-red-900/60 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Close dialog button (X) - like Wokwi */}
          {showAddDialog && (
            <button
              onClick={() => setShowAddDialog(false)}
              className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#007acc] text-white text-xs shrink-0">
        <div className="flex items-center gap-4">
          <span>Components: {diagram.parts.length}</span>
          <span>Wires: {diagram.connections.length}</span>
          {selectedId && <span>Selected: {selectedId}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>Labtwin Circuit Simulator v0.1</span>
          <span className="opacity-70">Compatible with Wokwi diagram.json</span>
        </div>
      </div>
    </div>
  );
}
