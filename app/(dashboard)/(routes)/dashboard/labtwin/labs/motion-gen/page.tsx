'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { BentoCard, MetricCard, VisionButton } from '@/components/ui/vision-tracker';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MotionGenSimulator() {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
  const [robotConfig, setRobotConfig] = useState({
    joint1: 0,
    joint2: 45,
    joint3: -90,
    joint4: 0,
    joint5: 45,
    joint6: 0
  });
  const [keyframes, setKeyframes] = useState([
    { time: 0, config: { joint1: 0, joint2: 45, joint3: -90, joint4: 0, joint5: 45, joint6: 0 } },
    { time: 2, config: { joint1: 45, joint2: 30, joint3: -60, joint4: 0, joint5: 90, joint6: 0 } },
    { time: 4, config: { joint1: -45, joint2: 60, joint3: -120, joint4: 0, joint5: 45, joint6: 90 } }
  ]);
  const [showChart, setShowChart] = useState(true);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const robotPartsRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Create robot arm
    createRobotArm(scene);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Mouse interaction for camera
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !cameraRef.current) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      const rotationSpeed = 0.005;
      const radius = Math.sqrt(
        cameraRef.current.position.x ** 2 + cameraRef.current.position.z ** 2
      );

      const angle = Math.atan2(cameraRef.current.position.z, cameraRef.current.position.x);
      const newAngle = angle + deltaX * rotationSpeed;

      cameraRef.current.position.x = radius * Math.cos(newAngle);
      cameraRef.current.position.z = radius * Math.sin(newAngle);
      cameraRef.current.position.y += -deltaY * 0.02;

      cameraRef.current.lookAt(0, 2, 0);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    canvasRef.current.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('mousedown', onMouseDown);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Create robot arm
  const createRobotArm = (scene: THREE.Scene) => {
    const parts: any[] = [];

    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.8, 1, 0.3, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      metalness: 0.7,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    scene.add(base);
    parts.push({ mesh: base, axis: 'y' });

    // Link 1
    const link1Group = new THREE.Group();
    const link1Geometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
    const linkMaterial = new THREE.MeshStandardMaterial({
      color: 0x48bb78,
      metalness: 0.5,
      roughness: 0.4
    });
    const link1 = new THREE.Mesh(link1Geometry, linkMaterial);
    link1.position.y = 1;
    link1Group.add(link1);
    link1Group.position.y = 0.3;
    base.add(link1Group);
    parts.push({ mesh: link1Group, axis: 'y', parent: base });

    // Joint 2
    const joint2Group = new THREE.Group();
    const link2Geometry = new THREE.BoxGeometry(0.4, 2.5, 0.4);
    const link2 = new THREE.Mesh(link2Geometry, linkMaterial);
    link2.position.y = 1.25;
    link2.position.z = 0;
    joint2Group.add(link2);
    joint2Group.position.y = 2;
    link1Group.add(joint2Group);
    parts.push({ mesh: joint2Group, axis: 'z', parent: link1Group });

    // Joint 3
    const joint3Group = new THREE.Group();
    const link3Geometry = new THREE.BoxGeometry(0.35, 2, 0.35);
    const link3 = new THREE.Mesh(link3Geometry, linkMaterial);
    link3.position.y = 1;
    joint3Group.add(link3);
    joint3Group.position.y = 2.5;
    joint2Group.add(joint3Group);
    parts.push({ mesh: joint3Group, axis: 'z', parent: joint2Group });

    // Joint 4
    const joint4Group = new THREE.Group();
    const link4Geometry = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 16);
    const link4 = new THREE.Mesh(link4Geometry, linkMaterial);
    link4.rotation.z = Math.PI / 2;
    link4.position.x = 0.75;
    joint4Group.add(link4);
    joint4Group.position.y = 2;
    joint3Group.add(joint4Group);
    parts.push({ mesh: joint4Group, axis: 'x', parent: joint3Group });

    // Joint 5
    const joint5Group = new THREE.Group();
    const link5Geometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const link5 = new THREE.Mesh(link5Geometry, linkMaterial);
    link5.position.y = 0.4;
    joint5Group.add(link5);
    joint5Group.position.x = 1.5;
    joint4Group.add(joint5Group);
    parts.push({ mesh: joint5Group, axis: 'z', parent: joint4Group });

    // End effector
    const joint6Group = new THREE.Group();
    const effectorGeometry = new THREE.ConeGeometry(0.25, 0.6, 4);
    const effectorMaterial = new THREE.MeshStandardMaterial({
      color: 0x3182ce,
      metalness: 0.8,
      roughness: 0.2
    });
    const effector = new THREE.Mesh(effectorGeometry, effectorMaterial);
    effector.rotation.x = Math.PI;
    effector.position.y = 1.1;
    joint6Group.add(effector);
    joint6Group.position.y = 0.8;
    joint5Group.add(joint6Group);
    parts.push({ mesh: joint6Group, axis: 'y', parent: joint5Group });

    // Motion path visualization
    const pathGeometry = new THREE.BufferGeometry();
    const pathMaterial = new THREE.LineBasicMaterial({
      color: 0x4a9eff,
      linewidth: 2
    });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    scene.add(pathLine);

    robotPartsRef.current = parts;
  };

  // Update robot position
  useEffect(() => {
    if (robotPartsRef.current.length === 0) return;

    const parts = robotPartsRef.current;
    const config = robotConfig;

    // Apply rotations
    parts[0].mesh.rotation.y = (config.joint1 * Math.PI) / 180;
    parts[1].mesh.rotation.y = (config.joint1 * Math.PI) / 180;
    parts[2].mesh.rotation.z = (config.joint2 * Math.PI) / 180;
    parts[3].mesh.rotation.z = (config.joint3 * Math.PI) / 180;
    parts[4].mesh.rotation.x = (config.joint4 * Math.PI) / 180;
    parts[5].mesh.rotation.z = (config.joint5 * Math.PI) / 180;
    parts[6].mesh.rotation.y = (config.joint6 * Math.PI) / 180;
  }, [robotConfig]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying) return;

    const duration = keyframes[keyframes.length - 1].time;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const time = elapsed % duration;
      setCurrentTime(time);

      // Interpolate between keyframes
      let prevKeyframe = keyframes[0];
      let nextKeyframe = keyframes[1];

      for (let i = 0; i < keyframes.length - 1; i++) {
        if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
          prevKeyframe = keyframes[i];
          nextKeyframe = keyframes[i + 1];
          break;
        }
      }

      const t = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
      const interpolated: any = {};

      Object.keys(prevKeyframe.config).forEach(key => {
        interpolated[key] = prevKeyframe.config[key as keyof typeof prevKeyframe.config] +
          (nextKeyframe.config[key as keyof typeof nextKeyframe.config] - prevKeyframe.config[key as keyof typeof prevKeyframe.config]) * t;
      });

      setRobotConfig(interpolated);

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, keyframes]);

  const handleJointChange = (joint: string, value: string) => {
    setRobotConfig(prev => ({
      ...prev,
      [joint]: parseFloat(value)
    }));
  };

  const addKeyframe = () => {
    const newKeyframe = {
      time: currentTime,
      config: { ...robotConfig }
    };
    setKeyframes(prev => [...prev, newKeyframe].sort((a, b) => a.time - b.time));
  };

  const deleteKeyframe = (index: number) => {
    if (keyframes.length <= 2) {
      alert('Cannot delete! At least 2 keyframes are required.');
      return;
    }
    setKeyframes(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllKeyframes = () => {
    if (confirm('Clear all keyframes and reset to default?')) {
      setKeyframes([
        { time: 0, config: { joint1: 0, joint2: 45, joint3: -90, joint4: 0, joint5: 45, joint6: 0 } },
        { time: 2, config: { joint1: 45, joint2: 30, joint3: -60, joint4: 0, joint5: 90, joint6: 0 } }
      ]);
      setCurrentTime(0);
    }
  };

  return (
    <div className="vision-container">
      {/* Header */}
      <div className="vision-header">
        <h1>🤖 MotionGen - Robot Arm Simulator</h1>
        <p>Mô phỏng chuyển động robot 6 bậc tự do với keyframe animation</p>
        <div className="status-badge">
          <span className="status-dot"></span>
          <span>{isPlaying ? 'Đang chạy' : 'Đã dừng'}</span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="bento-grid">
        {/* Control Panel - Medium */}
        <BentoCard title="Joint Controls" icon="🎮" size="medium">
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {Object.keys(robotConfig).map((joint) => (
              <div key={joint} style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '13px'
                }}>
                  <span style={{ color: selectedJoint === joint ? '#4a9eff' : '#4a5568', fontWeight: '600' }}>
                    {joint.toUpperCase()}
                  </span>
                  <span style={{
                    fontFamily: 'monospace',
                    color: '#48bb78',
                    fontWeight: 'bold'
                  }}>
                    {robotConfig[joint as keyof typeof robotConfig].toFixed(1)}°
                  </span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={robotConfig[joint as keyof typeof robotConfig]}
                  onChange={(e) => handleJointChange(joint, e.target.value)}
                  onFocus={() => setSelectedJoint(joint)}
                  onBlur={() => setSelectedJoint(null)}
                  className="vision-input"
                  style={{ width: '100%', height: '6px', cursor: 'pointer' }}
                />
              </div>
            ))}

            <VisionButton onClick={addKeyframe} style={{ width: '100%', marginTop: '16px' }}>
              + Add Keyframe at {currentTime.toFixed(2)}s
            </VisionButton>
          </div>
        </BentoCard>

        {/* 3D Viewport - Large */}
        <BentoCard title="3D Viewport" icon="📐" size="large">
          <div style={{ position: 'relative', height: '600px' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block', borderRadius: '12px' }}
            />

            {/* Overlay controls */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              display: 'flex',
              gap: '12px'
            }}>
              <VisionButton onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </VisionButton>
              <div style={{
                background: 'rgba(26, 26, 26, 0.9)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#48bb78',
                fontWeight: 'bold'
              }}>
                {currentTime.toFixed(2)}s
              </div>
            </div>

            {/* Chart overlay */}
            {showChart && (
              <div style={{
                position: 'absolute',
                left: '16px',
                bottom: '16px',
                width: '380px',
                background: 'rgba(224, 229, 236, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '12px 12px 24px rgba(163, 177, 198, 0.6), -12px -12px 24px rgba(255, 255, 255, 0.9)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                    ANGULAR VELOCITY
                  </span>
                  <button
                    onClick={() => setShowChart(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#718096',
                      cursor: 'pointer',
                      fontSize: '20px',
                      fontWeight: 'bold'
                    }}
                  >
                    ×
                  </button>
                </div>
                <svg width="348" height="120" style={{ overflow: 'visible' }}>
                  <line x1="0" y1="60" x2="348" y2="60" stroke="#cbd5e0" strokeWidth="1" />
                  <polyline
                    points={keyframes.map((kf) => {
                      const x = (kf.time / keyframes[keyframes.length - 1].time) * 348;
                      const y = 60 - (kf.config.joint2 / 180) * 50;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#4a9eff"
                    strokeWidth="2"
                  />
                  <polyline
                    points={keyframes.map((kf) => {
                      const x = (kf.time / keyframes[keyframes.length - 1].time) * 348;
                      const y = 60 - (kf.config.joint3 / 180) * 50;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#48bb78"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            )}

            {!showChart && (
              <VisionButton
                onClick={() => setShowChart(true)}
                style={{
                  position: 'absolute',
                  left: '16px',
                  bottom: '16px'
                }}
              >
                Show Chart
              </VisionButton>
            )}
          </div>
        </BentoCard>

        {/* Stats - Small cards */}
        <BentoCard title="Keyframes" icon="🎬" size="small">
          <MetricCard value={keyframes.length.toString()} label="Total Keyframes" size="large" />
        </BentoCard>

        <BentoCard title="Duration" icon="⏱️" size="small">
          <MetricCard
            value={`${keyframes[keyframes.length - 1].time.toFixed(1)}s`}
            label="Animation Length"
            size="large"
          />
        </BentoCard>

        <BentoCard title="Active Joint" icon="🔧" size="small">
          <MetricCard
            value={selectedJoint ? selectedJoint.toUpperCase() : 'None'}
            label="Currently Selected"
            size="large"
          />
        </BentoCard>

        {/* Keyframe Timeline - Full */}
        <BentoCard title="Keyframe Timeline" icon="📊" size="full">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <p style={{ color: '#718096', fontSize: '14px' }}>
              Manage animation keyframes - minimum 2 keyframes required
            </p>
            <VisionButton onClick={clearAllKeyframes} style={{ background: '#e53e3e' }}>
              Clear All Keyframes
            </VisionButton>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {keyframes.map((kf, index) => (
              <div
                key={index}
                className="activity-item"
                style={{
                  borderLeft: Math.abs(currentTime - kf.time) < 0.1 ? '4px solid #4a9eff' : '4px solid #48bb78',
                  background: Math.abs(currentTime - kf.time) < 0.1 ? 'rgba(74, 158, 255, 0.1)' : undefined
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div>
                    <span style={{ color: '#48bb78', fontWeight: '700', fontSize: '14px' }}>
                      Keyframe #{index + 1}
                    </span>
                    <span style={{ color: '#718096', marginLeft: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
                      t = {kf.time.toFixed(2)}s
                    </span>
                  </div>
                  <button
                    onClick={() => deleteKeyframe(index)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #e53e3e',
                      color: '#e53e3e',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    Delete
                  </button>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#4a5568'
                }}>
                  {Object.entries(kf.config).map(([key, val]) => (
                    <div key={key}>
                      <strong>{key}:</strong> {val.toFixed(0)}°
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
    </VisionThemeWrapper>
  );
}
