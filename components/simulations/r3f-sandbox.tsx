'use client';
/**
 * R3F Sandbox — CodeSandbox-style 3D playground wrapper
 * Built on React Three Fiber v9 Canvas API
 *
 * Canvas props used (per https://r3f.docs.pmnd.rs/api/canvas):
 *   gl        — WebGL renderer config (antialias, alpha, powerPreference)
 *   camera    — { position, fov } or custom THREE.Camera
 *   shadows   — enable shadow maps (PCFSoftShadowMap)
 *   dpr       — device pixel ratio [min, max]
 *   flat      — disable tone mapping for raw colors
 *   frameloop — 'always' | 'demand' | 'never'
 *   fallback  — DOM node shown when WebGL unavailable
 *   onCreated — callback after renderer init
 */

import {
  Suspense, useRef, useState, useCallback, ReactNode,
  useMemo, useEffect,
} from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls, Stage, Grid, Environment, Html,
  Float, MeshDistortMaterial, Sparkles, ContactShadows,
  Sphere, Box, Torus, Cylinder, Cone,
} from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import {
  Maximize2, Minimize2, Play, Pause, Eye, EyeOff,
  Grid3x3, Settings, Code2, Monitor, Copy, Check,
  ChevronRight, ChevronLeft, RotateCcw, Zap, Box as BoxIcon,
  Sun, Layers, FileCode, Terminal, ExternalLink, RefreshCw, Save, Plus, Trash2,
} from 'lucide-react';
import * as THREE from 'three';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════
export interface SandboxFile {
  name: string;
  language: string;
  code: string;
  active?: boolean;
}

export interface R3FSandboxProps {
  /** Scene content rendered inside Canvas */
  children: ReactNode;
  /** Title shown in header bar */
  title?: string;
  description?: string;
  /** Source files displayed in code panel */
  files?: SandboxFile[];
  /** Camera position — default [0, 0, 5] per R3F Canvas API */
  cameraPosition?: [number, number, number];
  /** Camera field of view — default 75 per R3F Canvas API */
  cameraFov?: number;
  /** Environment preset */
  environment?: 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby';
  envBackground?: boolean;
  envBlur?: number;
  /** Grid display */
  showGrid?: boolean;
  gridPosition?: [number, number, number];
  /** Fog */
  fog?: { color: string; near: number; far: number };
  /** OrbitControls */
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
  /** Stage wrapper (lighting + shadows) */
  useStage?: boolean;
  stageIntensity?: number;
  /** Post-processing */
  bloom?: boolean;
  bloomThreshold?: number;
  contactShadows?: boolean;
  sparkles?: boolean;
  /** Canvas flat mode — disables automatic tone mapping */
  flat?: boolean;
  /** frameloop: 'always' | 'demand' | 'never' */
  frameloop?: 'always' | 'demand' | 'never';
  /** Layout height */
  height?: string;
  /** Show code panel by default */
  defaultShowCode?: boolean;
  /** Extra settings controls */
  controlsPanel?: ReactNode;
  /** Dependencies list for sidebar */
  dependencies?: Record<string, string>;
  /** Enable code editing */
  editable?: boolean;
  /** Callback when a file is modified */
  onFileChange?: (index: number, code: string) => void;
  /** Callback to add a new file */
  onAddFile?: (name: string, language: string) => void;
  /** Callback to delete a file */
  onDeleteFile?: (index: number) => void;
  /** Callback to save project */
  onSave?: () => void;
}

// ═══════════════════════════════════════════════
// SYNTAX HIGHLIGHTER (zero-dep)
// ═══════════════════════════════════════════════
function highlightJSX(code: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  html = html.replace(/(\/\/.*$)/gm, '<span class="syn-comment">$1</span>');
  html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="syn-comment">$1</span>');
  // Strings
  html = html.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="syn-string">$1</span>');
  html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="syn-string">$1</span>');
  html = html.replace(/(`(?:[^`\\]|\\.)*`)/g, '<span class="syn-string">$1</span>');
  // Keywords
  html = html.replace(
    /\b(import|from|export|default|function|return|const|let|var|if|else|new|this|typeof|void|null|undefined|true|false|class|extends|async|await)\b/g,
    '<span class="syn-keyword">$1</span>',
  );
  // JSX tags
  html = html.replace(/(&lt;\/?)([\w.]+)/g, '$1<span class="syn-tag">$2</span>');
  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="syn-number">$1</span>');
  // JSX attributes
  html = html.replace(/\s([\w-]+)(=)/g, ' <span class="syn-attr">$1</span>$2');
  // Braces
  html = html.replace(/(\{|\})/g, '<span class="syn-brace">$1</span>');
  return html;
}

// ═══════════════════════════════════════════════
// CODE EDITOR PANEL (VS Code–like)
// ═══════════════════════════════════════════════
function CodePanel({
  files,
  dependencies,
  editable = false,
  onFileChange,
  onAddFile,
  onDeleteFile,
}: {
  files: SandboxFile[];
  dependencies?: Record<string, string>;
  editable?: boolean;
  onFileChange?: (index: number, code: string) => void;
  onAddFile?: (name: string, language: string) => void;
  onDeleteFile?: (index: number) => void;
}) {
  const [activeFile, setActiveFile] = useState(
    files.findIndex(f => f.active) >= 0 ? files.findIndex(f => f.active) : 0,
  );
  const [copied, setCopied] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);

  const copyCode = () => {
    navigator.clipboard?.writeText(files[activeFile]?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentFile = files[activeFile];
  const highlighted = useMemo(() => highlightJSX(currentFile?.code || ''), [currentFile]);
  const lines = (currentFile?.code || '').split('\n');

  return (
    <div className="flex h-full bg-[#1e1e2e] text-white/80 text-[13px] font-mono overflow-hidden">
      {/* Sidebar — file explorer */}
      {showExplorer && (
        <div className="w-[180px] border-r border-white/[0.06] flex flex-col shrink-0">
          <div className="px-3 py-2 text-[0.6rem] uppercase tracking-wider text-white/25 font-semibold border-b border-white/[0.04]">
            Explorer
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <div className="px-2 py-1 text-[0.55rem] uppercase tracking-wider text-white/20 font-semibold flex items-center gap-1">
              <ChevronRight className="h-2.5 w-2.5" /> src
            </div>
            {files.map((f, i) => (
              <div key={f.name} className="flex items-center group">
                <button
                  onClick={() => setActiveFile(i)}
                  className={`flex-1 text-left px-4 py-1 text-[0.7rem] flex items-center gap-1.5 transition-all ${
                    i === activeFile
                      ? 'bg-white/[0.06] text-white/90'
                      : 'text-white/40 hover:bg-white/[0.03] hover:text-white/60'
                  }`}
                >
                  <FileCode
                    className="h-3 w-3 shrink-0"
                    style={{
                      color:
                        f.language === 'jsx' || f.language === 'tsx'
                          ? '#61dafb'
                          : f.language === 'css'
                            ? '#42a5f5'
                            : f.language === 'markdown'
                              ? '#9ca3af'
                              : '#e6db74',
                    }}
                  />
                  {f.name}
                </button>
                {editable && onDeleteFile && files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(i);
                    }}
                    className="px-1 text-white/0 group-hover:text-white/30 hover:!text-red-400 transition text-[0.6rem]"
                    title="Delete file"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {editable && onAddFile && (
              <button
                onClick={() => {
                  const name = prompt('File name (e.g. src/Component.js):');
                  if (name) {
                    const ext = name.split('.').pop()?.toLowerCase() || 'js';
                    const lang = ext === 'tsx' || ext === 'ts' ? 'tsx' : ext === 'css' ? 'css' : ext === 'json' ? 'json' : ext === 'html' ? 'html' : 'js';
                    onAddFile(name, lang);
                  }
                }}
                className="w-full text-left px-4 py-1 text-[0.65rem] text-white/25 hover:text-white/50 hover:bg-white/[0.03] flex items-center gap-1.5 transition-all"
              >
                <span className="text-white/30">+</span> New file
              </button>
            )}
          </div>
          {dependencies && (
            <div className="border-t border-white/[0.04] px-3 py-2">
              <div className="text-[0.55rem] uppercase tracking-wider text-white/20 font-semibold mb-1.5">
                Dependencies
              </div>
              <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                {Object.entries(dependencies).map(([name, version]) => (
                  <div key={name} className="flex items-center justify-between text-[0.6rem]">
                    <span className="text-white/35 truncate">{name}</span>
                    <span className="text-white/15 shrink-0 ml-1">{version}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center border-b border-white/[0.06] bg-[#181825] shrink-0">
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className="p-2 text-white/25 hover:text-white/50 transition border-r border-white/[0.04]"
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
          {files.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setActiveFile(i)}
              className={`px-3 py-1.5 text-[0.7rem] flex items-center gap-1.5 border-r border-white/[0.04] transition-all ${
                i === activeFile
                  ? 'bg-[#1e1e2e] text-white/80 border-b-2 border-b-cyan-400'
                  : 'bg-[#181825] text-white/30 hover:text-white/50'
              }`}
            >
              <FileCode className="h-3 w-3" style={{ color: '#61dafb' }} />
              {f.name}
            </button>
          ))}
          <div className="flex-1" />
          {editable && (
            <button
              onClick={() => {
                onFileChange?.(activeFile, currentFile?.code || '');
              }}
              className="p-2 text-white/25 hover:text-white/50 transition mr-1"
              title="Save (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={copyCode}
            className="p-2 text-white/25 hover:text-white/50 transition mr-1"
            title="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Code content */}
        <div className="flex-1 overflow-auto relative">
          <div className="flex min-h-full">
            <div className="sticky left-0 bg-[#1e1e2e] shrink-0 select-none border-r border-white/[0.04] z-10">
              {lines.map((_, i) => (
                <div key={i} className="px-3 text-right text-white/15 leading-[22px] text-[12px]">
                  {i + 1}
                </div>
              ))}
            </div>
            {editable ? (
              <textarea
                value={currentFile?.code || ''}
                onChange={(e) => onFileChange?.(activeFile, e.target.value)}
                className="flex-1 p-3 leading-[22px] text-[13px] bg-transparent text-white/85 resize-none outline-none font-mono whitespace-pre overflow-x-auto"
                spellCheck={false}
                style={{ tabSize: 2 }}
              />
            ) : (
              <pre className="flex-1 p-3 leading-[22px] text-[13px] overflow-x-auto">
                <code dangerouslySetInnerHTML={{ __html: highlighted }} />
              </pre>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#181825] border-t border-white/[0.04] text-[0.55rem] text-white/20 shrink-0">
          <div className="flex items-center gap-3">
            <span>{currentFile?.language?.toUpperCase() || 'TSX'}</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Ln {lines.length}, Col 1</span>
            <span>Spaces: 2</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// LOADING FALLBACK (inside Canvas)
// ═══════════════════════════════════════════════
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 border-2 border-white/10 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-xs text-white/40 font-mono">Loading 3D scene...</span>
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════════
// MAIN SANDBOX COMPONENT
// ═══════════════════════════════════════════════
export default function R3FSandbox({
  children,
  title = 'R3F Sandbox',
  description,
  files = [],
  cameraPosition = [0, 0, 5],
  cameraFov = 75,
  environment = 'city',
  envBackground = true,
  envBlur = 0.8,
  showGrid: initialGrid = true,
  gridPosition = [0, -1.85, 0] as [number, number, number],
  fog,
  autoRotate = true,
  autoRotateSpeed = 0.4,
  enableZoom = true,
  useStage = true,
  stageIntensity = 0.5,
  bloom = true,
  bloomThreshold = 2,
  contactShadows = false,
  sparkles = false,
  flat = true,
  frameloop = 'always',
  height = '600px',
  defaultShowCode = true,
  controlsPanel,
  dependencies,
  editable = false,
  onFileChange,
  onAddFile,
  onDeleteFile,
  onSave,
}: R3FSandboxProps) {
  const [showCode, setShowCode] = useState(defaultShowCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showGridState, setShowGridState] = useState(initialGrid);
  const [showBg, setShowBg] = useState(envBackground);
  const [currentEnv, setCurrentEnv] = useState(environment);
  const [showSettings, setShowSettings] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.45);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut handler for Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };
    if (editable && onSave) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [editable, onSave]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Splitter drag handler
  const handleSplitterDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplitter) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.7, ratio)));
    };
    const handleUp = () => setIsDraggingSplitter(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingSplitter]);

  const envPresets: typeof environment[] = [
    'city', 'sunset', 'dawn', 'night', 'warehouse', 'forest', 'studio', 'park', 'lobby',
  ];

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#11111b] flex flex-col select-none"
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* ── TOP TOOLBAR ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-white/[0.06] shrink-0 z-30">
        <div className="flex items-center gap-2">
          {/* macOS-style traffic lights */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="w-px h-4 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <BoxIcon className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-white/70">{title}</span>
            {description && (
              <span className="text-[0.55rem] text-white/25 ml-1 hidden sm:inline">— {description}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Code / Preview toggle */}
          <div className="flex bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06] mr-1">
            <button
              onClick={() => setShowCode(true)}
              className={`px-2 py-1 rounded-md text-[0.6rem] font-medium transition-all flex items-center gap-1 ${
                showCode ? 'bg-white/[0.08] text-white/80 shadow-sm' : 'text-white/25 hover:text-white/40'
              }`}
            >
              <Code2 className="h-3 w-3" /> Code
            </button>
            <button
              onClick={() => setShowCode(false)}
              className={`px-2 py-1 rounded-md text-[0.6rem] font-medium transition-all flex items-center gap-1 ${
                !showCode ? 'bg-white/[0.08] text-white/80 shadow-sm' : 'text-white/25 hover:text-white/40'
              }`}
            >
              <Monitor className="h-3 w-3" /> Preview
            </button>
          </div>
          <div className="w-px h-4 bg-white/[0.06]" />

          {/* Toolbar buttons */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            title={isPlaying ? 'Pause animation' : 'Play animation'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setShowGridState(!showGridState)}
            className={`p-1.5 rounded-lg transition-all ${
              showGridState ? 'text-cyan-400/60 bg-cyan-400/5' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
            }`}
            title="Toggle grid"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowBg(!showBg)}
            className={`p-1.5 rounded-lg transition-all ${
              showBg ? 'text-amber-400/60 bg-amber-400/5' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
            }`}
            title="Toggle environment background"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-all ${
              showSettings ? 'text-white/70 bg-white/[0.06]' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
            }`}
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-white/[0.06]" />
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* ── SETTINGS DROPDOWN ── */}
      {showSettings && (
        <div className="absolute top-10 right-3 z-40 w-60 p-3 rounded-xl bg-[#1e1e2e]/95 backdrop-blur-xl border border-white/[0.08] space-y-3 shadow-2xl">
          <div>
            <label className="text-[0.55rem] text-white/25 uppercase tracking-wider font-semibold">
              Environment Preset
            </label>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {envPresets.map(ep => (
                <button
                  key={ep}
                  onClick={() => setCurrentEnv(ep)}
                  className={`px-2 py-0.5 rounded-md text-[0.55rem] transition-all ${
                    currentEnv === ep
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/25'
                      : 'bg-white/[0.04] text-white/30 border border-white/[0.04] hover:text-white/50'
                  }`}
                >
                  {ep}
                </button>
              ))}
            </div>
          </div>
          {controlsPanel && (
            <div className="border-t border-white/[0.06] pt-2">{controlsPanel}</div>
          )}
        </div>
      )}

      {/* ── MAIN SPLIT AREA ── */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Code panel */}
        {showCode && files.length > 0 && (
          <>
            <div style={{ width: `${splitRatio * 100}%` }} className="shrink-0 min-w-0">
              <CodePanel
                files={files}
                dependencies={dependencies}
                editable={editable}
                onFileChange={onFileChange}
                onAddFile={onAddFile}
                onDeleteFile={onDeleteFile}
              />
            </div>
            <div
              className="w-[3px] shrink-0 cursor-col-resize bg-white/[0.04] hover:bg-cyan-400/30 active:bg-cyan-400/50 transition-colors relative z-20"
              onMouseDown={handleSplitterDown}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-white/10" />
            </div>
          </>
        )}

        {/* ── 3D CANVAS ── */}
        <div className="flex-1 relative min-w-0">
          <Canvas
            /** R3F Canvas API props */
            flat={flat}
            shadows
            dpr={[1, 2]}
            frameloop={isPlaying ? frameloop : 'demand'}
            camera={{ position: cameraPosition, fov: cameraFov }}
            style={{ background: '#11111b' }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              // R3F v9 defaults: ACESFilmic toneMapping, sRGB outputColorSpace
            }}
            fallback={
              <div className="flex items-center justify-center h-full bg-[#11111b] text-white/40 text-sm">
                WebGL is not supported on this browser
              </div>
            }
            onCreated={(state) => {
              state.gl.setClearColor('#11111b');
            }}
          >
            <Suspense fallback={<LoadingFallback />}>
              {fog && <fog attach="fog" args={[fog.color, fog.near, fog.far]} />}

              {useStage ? (
                <Stage
                  intensity={stageIntensity}
                  environment={currentEnv}
                  shadows={{ type: 'accumulative', bias: -0.001, intensity: Math.PI }}
                  adjustCamera={false}
                >
                  {children}
                </Stage>
              ) : (
                <>
                  <ambientLight intensity={0.4} />
                  <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                  <pointLight position={[-10, 5, -10]} intensity={0.5} color="#8b5cf6" />
                  {children}
                </>
              )}

              {showGridState && (
                <Grid
                  renderOrder={-1}
                  position={gridPosition}
                  infiniteGrid
                  cellSize={0.6}
                  cellThickness={0.6}
                  sectionSize={3.3}
                  sectionThickness={1.5}
                  sectionColor={new THREE.Color(0.5, 0.5, 10)}
                  fadeDistance={30}
                />
              )}

              {contactShadows && (
                <ContactShadows
                  position={[0, -1.84, 0]}
                  opacity={0.4}
                  scale={20}
                  blur={2}
                  far={4}
                />
              )}

              {sparkles && (
                <Sparkles count={100} scale={10} size={2} speed={0.4} color="#06b6d4" />
              )}

              <OrbitControls
                makeDefault
                autoRotate={autoRotate && isPlaying}
                autoRotateSpeed={autoRotateSpeed}
                enableZoom={enableZoom}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 1.6}
              />

              {bloom && (
                <EffectComposer enableNormalPass={false}>
                  <Bloom luminanceThreshold={bloomThreshold} mipmapBlur />
                  <ToneMapping />
                </EffectComposer>
              )}

              <Environment background={showBg} preset={currentEnv} blur={envBlur} />
            </Suspense>
          </Canvas>

          {/* Preview status overlay */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
            <div className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-[0.5rem] text-white/20 font-mono">
                {isPlaying ? 'Running' : 'Paused'}
              </span>
            </div>
            <span className="text-[0.5rem] text-white/10 font-mono hidden sm:block">
              Orbit: Left click · Zoom: Scroll · Pan: Right click
            </span>
          </div>
        </div>
      </div>

      {/* Cursor override while dragging splitter */}
      {isDraggingSplitter && <div className="fixed inset-0 z-50 cursor-col-resize" />}

      {/* ── SYNTAX HIGHLIGHT STYLES ── */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <style dangerouslySetInnerHTML={{ __html: `
        .syn-keyword { color: #c678dd; }
        .syn-string  { color: #98c379; }
        .syn-comment { color: #5c6370; font-style: italic; }
        .syn-tag     { color: #e06c75; }
        .syn-attr    { color: #d19a66; }
        .syn-number  { color: #d19a66; }
        .syn-brace   { color: #56b6c2; }
      ` }} />
    </div>
  );
}

// ═══════════════════════════════════════════════
// RE-EXPORTS for convenience
// ═══════════════════════════════════════════════
export {
  Float,
  MeshDistortMaterial,
  Sparkles as SparklesEffect,
  Sphere,
  Box,
  Torus,
  Cylinder,
  Cone,
};
