'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Hand, Palette, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

declare global {
  interface Window {
    THREE?: any;
    Hands?: any;
    Camera?: any;
  }
}

type StatusDot = 'offline' | 'online';

const PARTICLES = 1200;
const PINCH_OPEN_THRESHOLD = 0.18;
const PINCH_CLOSE_THRESHOLD = 0.08;

export default function GestureSwarmPage() {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const instancedMeshRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const cameraInstanceRef = useRef<any>(null);
  const handsRef = useRef<any>(null);

  const [isReady, setIsReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<StatusDot>('offline');
  const [handStatus, setHandStatus] = useState<StatusDot>('offline');
  const [color, setColor] = useState('#00f2ff');

  const positionsRef = useRef<any[]>([]);
  const velocitiesRef = useRef<any[]>([]);
  const targetSphereRef = useRef<any[]>([]);
  const targetStarRef = useRef<any[]>([]);
  const fingerDirRef = useRef<any>(null);
  const handQuatRef = useRef<any>(null);
  const expansionRef = useRef({ current: 0, target: 0 });

  const statusText = useMemo(
    () => ({
      camera: cameraStatus === 'online' ? 'Online' : 'Đang chờ...',
      hand: handStatus === 'online' ? 'Đã kết nối' : 'Không thấy'
    }),
    [cameraStatus, handStatus]
  );

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });

  useEffect(() => {
    let mounted = true;

    const initThree = () => {
      const THREE = window.THREE;
      if (!THREE || !canvasHostRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 18;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      canvasHostRef.current.innerHTML = '';
      canvasHostRef.current.appendChild(renderer.domElement);

      const geometry = new THREE.ConeGeometry(0.1, 0.45, 6);
      geometry.rotateX(Math.PI / 2);

      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        shininess: 80,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.45
      });

      const instancedMesh = new THREE.InstancedMesh(geometry, material, PARTICLES);
      scene.add(instancedMesh);
      scene.add(new THREE.AmbientLight(0x222222));
      const light = new THREE.PointLight(0xffffff, 1.4);
      light.position.set(20, 20, 20);
      scene.add(light);

      positionsRef.current = [];
      velocitiesRef.current = [];
      targetSphereRef.current = [];
      targetStarRef.current = [];
      fingerDirRef.current = new THREE.Vector3(0, 0, -1);
      handQuatRef.current = new THREE.Quaternion();

      for (let i = 0; i < PARTICLES; i += 1) {
        positionsRef.current.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
          )
        );
        velocitiesRef.current.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
          )
        );

        const phi = Math.acos(-1 + (2 * i) / PARTICLES);
        const theta = Math.sqrt(PARTICLES * Math.PI) * phi;
        const r = 5;
        const sphereTarget = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
        targetSphereRef.current.push(sphereTarget);
        const spikes = 5;
        const spikeFactor =
          1 + 2.8 * Math.pow(Math.abs(Math.sin(phi * spikes) * Math.cos(theta * spikes)), 2);
        targetStarRef.current.push(sphereTarget.clone().multiplyScalar(spikeFactor));
      }

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      instancedMeshRef.current = instancedMesh;
    };

    const onWindowResize = () => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      const THREE = window.THREE;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const instancedMesh = instancedMeshRef.current;
      if (!THREE || !renderer || !scene || !camera || !instancedMesh) return;

      expansionRef.current.current +=
        (expansionRef.current.target - expansionRef.current.current) * 0.15;

      const colorValue = new THREE.Color(color);
      instancedMesh.material.color.copy(colorValue);
      instancedMesh.material.emissive.copy(colorValue).multiplyScalar(0.4);

      instancedMesh.quaternion.slerp(handQuatRef.current, 0.08);

      const dummy = new THREE.Object3D();
      const tempTarget = new THREE.Vector3();
      const steer = new THREE.Vector3();

      for (let i = 0; i < PARTICLES; i += 1) {
        const pos = positionsRef.current[i];
        const vel = velocitiesRef.current[i];
        tempTarget.lerpVectors(
          targetSphereRef.current[i],
          targetStarRef.current[i],
          expansionRef.current.current
        );
        steer.subVectors(tempTarget, pos).multiplyScalar(0.02);
        vel.add(steer);

        const fingerInfluence = fingerDirRef.current.clone().multiplyScalar(0.05);
        vel.add(fingerInfluence);

        vel.x += (Math.random() - 0.5) * 0.02;
        vel.y += (Math.random() - 0.5) * 0.02;
        vel.z += (Math.random() - 0.5) * 0.02;
        vel.clampLength(0, 0.4);

        pos.add(vel);

        dummy.position.copy(pos);
        tempTarget.copy(pos).add(vel);
        dummy.lookAt(tempTarget);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    const init = async () => {
      try {
        await Promise.all([
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
        ]);
      } catch (error) {
        console.error('Failed to load libraries', error);
        return;
      }

      if (!mounted) return;

      initThree();
      window.addEventListener('resize', onWindowResize);

      const Hands = window.Hands;
      const Camera = window.Camera;
      if (!Hands || !Camera || !videoRef.current) return;

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: any) => {
        if (!mounted) return;
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          setHandStatus('online');
          const landmarks = results.multiHandLandmarks[0];
          const THREE = window.THREE;
          if (!THREE) return;

          const wrist = new THREE.Vector3(landmarks[0].x, landmarks[0].y, landmarks[0].z);
          const indexBase = new THREE.Vector3(landmarks[5].x, landmarks[5].y, landmarks[5].z);
          const indexTip = new THREE.Vector3(landmarks[8].x, landmarks[8].y, landmarks[8].z);
          const pinkyBase = new THREE.Vector3(landmarks[17].x, landmarks[17].y, landmarks[17].z);

          fingerDirRef.current.subVectors(indexTip, indexBase).normalize();
          fingerDirRef.current.x *= -1;

          const vecY = new THREE.Vector3().subVectors(indexBase, wrist).normalize();
          const vecX = new THREE.Vector3().subVectors(pinkyBase, indexBase).normalize();
          const vecZ = new THREE.Vector3().crossVectors(vecX, vecY).normalize();
          const matrix = new THREE.Matrix4().makeBasis(vecX.negate(), vecY.negate(), vecZ);
          handQuatRef.current.setFromRotationMatrix(matrix);

          const thumb = landmarks[4];
          const pinky = landmarks[20];
          const dist = Math.hypot(thumb.x - pinky.x, thumb.y - pinky.y);
          const normalized = THREE.MathUtils.clamp(
            (dist - PINCH_CLOSE_THRESHOLD) / (PINCH_OPEN_THRESHOLD - PINCH_CLOSE_THRESHOLD),
            0,
            1
          );
          expansionRef.current.target = normalized;
        } else {
          setHandStatus('offline');
        }
      });

      handsRef.current = hands;
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480
      });
      cameraInstanceRef.current = camera;
      await camera.start();
      if (mounted) {
        setIsReady(true);
        setCameraStatus('online');
      }

      animate();
    };

    init();

    return () => {
      mounted = false;
      window.removeEventListener('resize', onWindowResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (cameraInstanceRef.current?.stop) {
        cameraInstanceRef.current.stop();
      }
      if (handsRef.current?.close) {
        handsRef.current.close();
      }
      if (rendererRef.current?.dispose) {
        rendererRef.current.dispose();
      }
      if (canvasHostRef.current) {
        canvasHostRef.current.innerHTML = '';
      }
    };
  }, [color]);

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <div className="container mx-auto px-4 py-6">
        <Link href="/dashboard/labtwin/labs" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại LabTwin
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-cyan-300">Murmuration AI</h1>
            <p className="text-slate-400 mt-1">
              Điều khiển bầy hạt bằng cử chỉ tay: tản ra, tụ lại và dẫn hướng theo ngón trỏ.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-500/20 text-cyan-200 border-0">Gesture + 3D</Badge>
            <Badge className="bg-white/10 text-slate-200 border-0">Mediapipe Hands</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border border-white/10 bg-black/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-300">
                <Hand className="h-5 w-5" />
                Bảng điều khiển
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Màu sắc bầy đàn
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="w-full h-8 bg-transparent cursor-pointer rounded"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase mb-2">
                  <Wind className="h-4 w-4" />
                  Trạng thái hệ thống
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${cameraStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  Camera: {statusText.camera}
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className={`h-2 w-2 rounded-full ${handStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  Tay: {statusText.hand}
                </div>
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-slate-200">
                <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2">Cử chỉ điều khiển</div>
                <ul className="space-y-2">
                  <li>✋ Mở tay: bầy đàn tản ra (ngôi sao).</li>
                  <li>✊ Nắm tay: bầy đàn tụ lại (hình cầu).</li>
                  <li>👉 Chỉ hướng: cả đàn bay theo ngón trỏ.</li>
                </ul>
              </div>

              <Button variant="outline" className="w-full border-cyan-500 text-cyan-200" onClick={() => setIsReady(false)}>
                Làm mới mô phỏng
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border border-white/10 bg-black/50 overflow-hidden">
            <CardContent className="relative p-0">
              {!isReady && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-500 border-solid mb-4" />
                  <div className="text-cyan-300 text-sm">Đang đồng bộ hóa cử chỉ...</div>
                </div>
              )}
              <div ref={canvasHostRef} className="h-[70vh] w-full" />
              <video
                ref={videoRef}
                className="absolute bottom-4 right-4 h-36 w-52 rounded-xl border border-white/10 object-cover opacity-80"
                style={{ transform: 'scaleX(-1)' }}
                playsInline
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
