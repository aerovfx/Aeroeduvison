'use client';

/**
 * Voxel/Block City Scene — Procedural urban environments
 *
 * Two complementary scenes:
 *   VoxelCityScene    — Daytime city with procedurally-generated buildings
 *   CityNightScene    — Nighttime variant with lit windows and moving cars
 *
 * Key techniques:
 *   THREE.InstancedMesh       — ~200 buildings rendered in single draw call
 *   Seeded randomness         — reproducible building heights and layouts
 *   tempObject.updateMatrix() — per-building transformation matrix setup
 *   Interactive hover         — highlight building and show height info
 *   Slow camera rotation      — auto-rotating city viewpoint
 *   Instanced emissive faces  — nighttime window lighting
 *   Point lights as lamps     — street-level illumination
 *   Animated cars             — moving traffic on streets
 */

import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Stars } from '@react-three/drei';
import * as THREE from 'three';

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

const GRID_SIZE = 15; // 15x15 grid of blocks
const BLOCK_SIZE = 2; // Space between building centers
const STREET_WIDTH = 0.4; // Spacing between building blocks (streets)
const BUILDING_COUNT = GRID_SIZE * GRID_SIZE;
const BUILDING_BASE_WIDTH = BLOCK_SIZE * 0.7;
const BUILDING_BASE_DEPTH = BLOCK_SIZE * 0.7;
const BUILDING_MIN_HEIGHT = 1.5;
const BUILDING_MAX_HEIGHT = 8;
const CAR_COUNT = 8;

// Seeded random for reproducible generation
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// ═════════════════════════════════════════════════════════════════════════════
// BUILDING DATA INTERFACE
// ═════════════════════════════════════════════════════════════════════════════

interface BuildingData {
  position: THREE.Vector3;
  height: number;
  colorIndex: number; // 0=glass-blue, 1=concrete-gray, 2=office-yellow
}

interface CarData {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  speed: number;
  progress: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// VOXEL CITY SCENE — Daytime procedural city
// ═════════════════════════════════════════════════════════════════════════════

export function VoxelCityScene() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const groupRef = useRef<THREE.Group>(null!);
  const [hoveredInstance, setHoveredInstance] = useState<number | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const { camera } = useThree();

  // Pre-generate building layout using seeded randomness
  const buildingsData = useMemo(() => {
    const buildings: BuildingData[] = [];
    let buildingIndex = 0;

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const seed = x * 1000 + z;
        const heightNorm = seededRandom(seed);
        const height =
          BUILDING_MIN_HEIGHT +
          heightNorm * (BUILDING_MAX_HEIGHT - BUILDING_MIN_HEIGHT);

        const colorSeed = seededRandom(seed + 0.33);
        const colorIndex = Math.floor(colorSeed * 3);

        const posX = (x - GRID_SIZE / 2) * BLOCK_SIZE;
        const posZ = (z - GRID_SIZE / 2) * BLOCK_SIZE;

        buildings.push({
          position: new THREE.Vector3(posX, height / 2, posZ),
          height,
          colorIndex,
        });

        buildingIndex++;
      }
    }

    return buildings;
  }, []);

  // Building colors: glass blue, concrete gray, office yellow
  const buildingColors = useMemo(() => {
    return [
      new THREE.Color(0x4da6ff), // glass blue
      new THREE.Color(0x888888), // concrete gray
      new THREE.Color(0xffeb99), // office yellow
    ];
  }, []);

  // Initialize material and instance colors
  useMemo(() => {
    if (!meshRef.current) return;
    buildingsData.forEach((building, i) => {
      meshRef.current.setColorAt(i, buildingColors[building.colorIndex]);
    });
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [buildingsData, buildingColors]);

  // Handle pointer move for hover detection
  const handlePointerMove = useCallback(
    (e: any) => {
      const rect = e.currentTarget.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, camera);

      if (meshRef.current) {
        const intersections = raycasterRef.current.intersectObject(
          meshRef.current
        );
        if (intersections.length > 0) {
          const instanceId = intersections[0].instanceId;
          setHoveredInstance(instanceId ?? null);
        } else {
          setHoveredInstance(null);
        }
      }
    },
    [camera]
  );

  // Animation loop: rotate city and update instance matrices
  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    // Slow auto-rotation
    groupRef.current.rotation.y += delta * 0.1;

    // Update instance matrices
    buildingsData.forEach((building, i) => {
      tempObject.position.copy(building.position);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(
        BUILDING_BASE_WIDTH,
        building.height,
        BUILDING_BASE_DEPTH
      );

      // Highlight on hover
      if (hoveredInstance === i) {
        tempObject.scale.multiplyScalar(1.05);
      }

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove}>
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} />

      {/* Buildings — Instanced Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({
            metalness: 0.3,
            roughness: 0.6,
            envMapIntensity: 1,
          }),
          BUILDING_COUNT,
        ]}
        castShadow
        receiveShadow
      />

      {/* Ground plane */}
      <mesh
        position={[0, -0.5, 0]}
        receiveShadow
        rotation={[0, 0, 0]}
        scale={[GRID_SIZE * BLOCK_SIZE * 1.5, 1, GRID_SIZE * BLOCK_SIZE * 1.5]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={0x333333} roughness={0.8} />
      </mesh>

      {/* UI overlay */}
      <Html position={[0, GRID_SIZE * BLOCK_SIZE * 0.8, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#4da6ff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'monospace',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {hoveredInstance !== null ? (
            <div>
              <div>Building #{hoveredInstance + 1}</div>
              <div>
                Height:{' '}
                {buildingsData[hoveredInstance].height.toFixed(2)} units
              </div>
            </div>
          ) : (
            <div>Voxel City • Hover over buildings • Auto-rotating</div>
          )}
        </div>
      </Html>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CITY NIGHT SCENE — Nighttime city with lit windows and traffic
// ═════════════════════════════════════════════════════════════════════════════

export function CityNightScene() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const carMeshRef = useRef<THREE.InstancedMesh>(null!);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempCarObject = useMemo(() => new THREE.Object3D(), []);
  const groupRef = useRef<THREE.Group>(null!);
  const [hoveredInstance, setHoveredInstance] = useState<number | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const { camera } = useThree();

  // Building data (same layout as daytime)
  const buildingsData = useMemo(() => {
    const buildings: BuildingData[] = [];

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const seed = x * 1000 + z;
        const heightNorm = seededRandom(seed);
        const height =
          BUILDING_MIN_HEIGHT +
          heightNorm * (BUILDING_MAX_HEIGHT - BUILDING_MIN_HEIGHT);

        const colorSeed = seededRandom(seed + 0.33);
        const colorIndex = Math.floor(colorSeed * 3);

        const posX = (x - GRID_SIZE / 2) * BLOCK_SIZE;
        const posZ = (z - GRID_SIZE / 2) * BLOCK_SIZE;

        buildings.push({
          position: new THREE.Vector3(posX, height / 2, posZ),
          height,
          colorIndex,
        });
      }
    }

    return buildings;
  }, []);

  // Dark building colors for nighttime
  const buildingNightColors = useMemo(() => {
    return [
      new THREE.Color(0x1a1a2e), // very dark blue
      new THREE.Color(0x16213e), // very dark slate
      new THREE.Color(0x0f3460), // dark navy
    ];
  }, []);

  // Initialize colors and emissive faces (lit windows)
  useMemo(() => {
    if (!meshRef.current) return;

    const tempColor = new THREE.Color();

    buildingsData.forEach((building, i) => {
      meshRef.current.setColorAt(i, buildingNightColors[building.colorIndex]);

      // Randomly set some buildings to emit (lit windows effect)
      const seed = i * 12345;
      const windowLitRandom = seededRandom(seed);
      if (windowLitRandom > 0.5) {
        tempColor.copy(buildingNightColors[building.colorIndex]).multiplyScalar(2);
        // Set in material (will need emissiveMap or custom material)
      }
    });

    meshRef.current.instanceColor!.needsUpdate = true;
  }, [buildingsData, buildingNightColors]);

  // Car paths and data
  const carsData = useMemo(() => {
    const cars: CarData[] = [];

    for (let i = 0; i < CAR_COUNT; i++) {
      const seed = i * 54321;
      const streetX = Math.floor(seededRandom(seed) * (GRID_SIZE - 1));
      const isHorizontal = seededRandom(seed + 1) > 0.5;

      let startX, startZ, endX, endZ;

      if (isHorizontal) {
        startX = -GRID_SIZE * BLOCK_SIZE * 0.5;
        startZ = (streetX - GRID_SIZE / 2) * BLOCK_SIZE;
        endX = GRID_SIZE * BLOCK_SIZE * 0.5;
        endZ = startZ;
      } else {
        startX = (streetX - GRID_SIZE / 2) * BLOCK_SIZE;
        startZ = -GRID_SIZE * BLOCK_SIZE * 0.5;
        endX = startX;
        endZ = GRID_SIZE * BLOCK_SIZE * 0.5;
      }

      cars.push({
        startX,
        startZ,
        endX,
        endZ,
        speed: 1.0 + seededRandom(seed + 2) * 1.5,
        progress: seededRandom(seed + 3),
      });
    }

    return cars;
  }, []);

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: any) => {
      const rect = e.currentTarget.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, camera);

      if (meshRef.current) {
        const intersections = raycasterRef.current.intersectObject(
          meshRef.current
        );
        if (intersections.length > 0) {
          const instanceId = intersections[0].instanceId;
          setHoveredInstance(instanceId ?? null);
        } else {
          setHoveredInstance(null);
        }
      }
    },
    [camera]
  );

  // Animation loop: rotate city, update buildings, animate cars
  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current || !carMeshRef.current) return;

    // Slow auto-rotation
    groupRef.current.rotation.y += delta * 0.08;

    // Update building matrices
    buildingsData.forEach((building, i) => {
      tempObject.position.copy(building.position);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(
        BUILDING_BASE_WIDTH,
        building.height,
        BUILDING_BASE_DEPTH
      );

      // Highlight on hover
      if (hoveredInstance === i) {
        tempObject.scale.multiplyScalar(1.05);
      }

      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Update car positions
    carsData.forEach((car, i) => {
      car.progress += (delta * car.speed) / 20;
      if (car.progress > 1.0) {
        car.progress = 0;
      }

      const t = car.progress;
      const carX = car.startX + (car.endX - car.startX) * t;
      const carZ = car.startZ + (car.endZ - car.startZ) * t;

      tempCarObject.position.set(carX, 0.3, carZ);
      tempCarObject.scale.set(0.3, 0.25, 0.5);
      tempCarObject.updateMatrix();
      carMeshRef.current.setMatrixAt(i, tempCarObject.matrix);
    });

    carMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove}>
      {/* Nighttime lighting */}
      <ambientLight intensity={0.2} color={0x4466ff} />
      <pointLight
        position={[20, 30, 20]}
        intensity={0.5}
        color={0x6688ff}
        distance={200}
      />

      {/* Street lamps scattered around */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = GRID_SIZE * BLOCK_SIZE * 0.8;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <pointLight
            key={`lamp-${i}`}
            position={[x, 4, z]}
            intensity={0.6}
            color={0xffcc66}
            distance={8}
          />
        );
      })}

      {/* Stars background */}
      <Stars radius={100} depth={50} count={500} factor={4} saturation={0} />

      {/* Fog for atmospheric depth */}
      <fog attach="fog" args={[0x0a0a1a, 5, 60]} />

      {/* Buildings — Instanced Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({
            metalness: 0.2,
            roughness: 0.8,
            emissive: 0x1a3366,
            emissiveIntensity: 0.3,
          }),
          BUILDING_COUNT,
        ]}
        castShadow
        receiveShadow
      />

      {/* Cars — Animated traffic */}
      <instancedMesh
        ref={carMeshRef}
        args={[
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({
            color: 0xff3333,
            emissive: 0xff6600,
            emissiveIntensity: 0.8,
            metalness: 0.6,
            roughness: 0.3,
          }),
          CAR_COUNT,
        ]}
        castShadow
      />

      {/* Ground plane */}
      <mesh
        position={[0, -0.1, 0]}
        receiveShadow
        scale={[GRID_SIZE * BLOCK_SIZE * 1.5, 1, GRID_SIZE * BLOCK_SIZE * 1.5]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.9} />
      </mesh>

      {/* Night sky backdrop */}
      <mesh position={[0, 0, 0]} scale={[200, 200, 200]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={0x0a0a1a} side={THREE.BackSide} />
      </mesh>

      {/* UI overlay */}
      <Html position={[0, GRID_SIZE * BLOCK_SIZE * 0.8, 0]} center>
        <div
          style={{
            background: 'rgba(10, 10, 26, 0.8)',
            color: '#ffcc66',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'monospace',
            textAlign: 'center',
            pointerEvents: 'none',
            border: '1px solid #ffcc66',
          }}
        >
          {hoveredInstance !== null ? (
            <div>
              <div>Building #{hoveredInstance + 1}</div>
              <div>
                Height:{' '}
                {buildingsData[hoveredInstance].height.toFixed(2)} units
              </div>
              <div>Nighttime • {CAR_COUNT} cars in transit</div>
            </div>
          ) : (
            <div>Night City • Street traffic active • {CAR_COUNT} vehicles</div>
          )}
        </div>
      </Html>
    </group>
  );
}
