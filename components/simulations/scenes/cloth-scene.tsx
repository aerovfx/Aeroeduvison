'use client';

import * as THREE from 'three';
import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Cylinder } from '@react-three/drei';

interface Vertex {
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  pinned: boolean;
  mass: number;
}

interface Constraint {
  p1: Vertex;
  p2: Vertex;
  restDistance: number;
}

const GRAVITY = new THREE.Vector3(0, -9.8, 0);
const DAMPING = 0.99;
const CONSTRAINTS_ITERATIONS = 3;

function createClothSimulation(
  width: number,
  height: number,
  segmentsX: number,
  segmentsY: number,
  pinnedTop: boolean = true
): { vertices: Vertex[]; constraints: Constraint[] } {
  const vertices: Vertex[] = [];
  const constraints: Constraint[] = [];

  const clothWidth = width;
  const clothHeight = height;
  const segmentWidth = clothWidth / segmentsX;
  const segmentHeight = clothHeight / segmentsY;

  // Create vertices
  for (let y = 0; y <= segmentsY; y++) {
    for (let x = 0; x <= segmentsX; x++) {
      const pos = new THREE.Vector3(
        x * segmentWidth - clothWidth / 2,
        pinnedTop ? height / 2 - y * segmentHeight : height / 2 - y * segmentHeight,
        0
      );

      const vertex: Vertex = {
        position: pos.clone(),
        prevPosition: pos.clone(),
        pinned: pinnedTop && y === 0,
        mass: 1,
      };

      vertices.push(vertex);
    }
  }

  // Create constraints (structural and shear)
  for (let y = 0; y <= segmentsY; y++) {
    for (let x = 0; x <= segmentsX; x++) {
      const idx = y * (segmentsX + 1) + x;

      // Horizontal constraint
      if (x < segmentsX) {
        const nextIdx = idx + 1;
        constraints.push({
          p1: vertices[idx],
          p2: vertices[nextIdx],
          restDistance: segmentWidth,
        });
      }

      // Vertical constraint
      if (y < segmentsY) {
        const nextIdx = (y + 1) * (segmentsX + 1) + x;
        constraints.push({
          p1: vertices[idx],
          p2: vertices[nextIdx],
          restDistance: segmentHeight,
        });
      }

      // Diagonal constraints (shear)
      if (x < segmentsX && y < segmentsY) {
        const diagIdx = (y + 1) * (segmentsX + 1) + (x + 1);
        const diagDistance = Math.sqrt(segmentWidth ** 2 + segmentHeight ** 2);
        constraints.push({
          p1: vertices[idx],
          p2: vertices[diagIdx],
          restDistance: diagDistance,
        });
      }

      if (x > 0 && y < segmentsY) {
        const diagIdx = (y + 1) * (segmentsX + 1) + (x - 1);
        const diagDistance = Math.sqrt(segmentWidth ** 2 + segmentHeight ** 2);
        constraints.push({
          p1: vertices[idx],
          p2: vertices[diagIdx],
          restDistance: diagDistance,
        });
      }
    }
  }

  return { vertices, constraints };
}

function satisfyConstraints(constraints: Constraint[]): void {
  for (let iter = 0; iter < CONSTRAINTS_ITERATIONS; iter++) {
    for (const constraint of constraints) {
      const delta = constraint.p2.position.clone().sub(constraint.p1.position);
      const distance = delta.length();
      const difference = (distance - constraint.restDistance) / distance;

      const correction = delta.multiplyScalar(difference * 0.5);

      if (!constraint.p1.pinned) {
        constraint.p1.position.add(correction);
      }
      if (!constraint.p2.pinned) {
        constraint.p2.position.sub(correction);
      }
    }
  }
}

function integrateVerlet(
  vertices: Vertex[],
  gravity: THREE.Vector3,
  windForce: THREE.Vector3,
  dt: number
): void {
  const dampingWithWind = DAMPING * 0.99;

  for (const vertex of vertices) {
    if (vertex.pinned) continue;

    const vel = vertex.position.clone().sub(vertex.prevPosition).multiplyScalar(dampingWithWind);
    const acceleration = gravity.clone().add(windForce).multiplyScalar(dt * dt);

    vertex.prevPosition.copy(vertex.position);
    vertex.position.add(vel).add(acceleration);

    // Simple floor collision
    if (vertex.position.y < -10) {
      vertex.position.y = -10;
      vertex.prevPosition.y = -10;
    }
  }
}

function updateGeometryPositions(
  positions: Float32Array,
  vertices: Vertex[],
  segmentsX: number
): void {
  for (let i = 0; i < vertices.length; i++) {
    positions[i * 3] = vertices[i].position.x;
    positions[i * 3 + 1] = vertices[i].position.y;
    positions[i * 3 + 2] = vertices[i].position.z;
  }
}

/**
 * ClothSimScene - Cloth simulation component for use with R3FSandbox
 * No Canvas wrapper needed - component provides only the mesh and physics
 */
export function ClothSimScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const simulationRef = useRef<{
    vertices: Vertex[];
    constraints: Constraint[];
  } | null>(null);
  const windPhaseRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const selectedVertexRef = useRef<Vertex | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);

  const { camera } = useThree();
  const segmentsX = 30;
  const segmentsY = 30;

  cameraRef.current = camera;

  // Initialize cloth simulation
  useMemo(() => {
    simulationRef.current = createClothSimulation(8, 8, segmentsX, segmentsY, true);
  }, []);

  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(8, 8, segmentsX, segmentsY);
    return geo;
  }, []);

  // Mouse interaction
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!simulationRef.current || !camera) return;

      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      if (meshRef.current) {
        const intersects = raycasterRef.current.intersectObject(meshRef.current);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          let closestVertex: Vertex | null = null;
          let minDist = Infinity;

          for (const vertex of simulationRef.current.vertices) {
            const dist = vertex.position.distanceTo(point);
            if (dist < minDist && dist < 0.5) {
              minDist = dist;
              closestVertex = vertex;
            }
          }

          if (closestVertex) {
            selectedVertexRef.current = closestVertex;
          }
        }
      }
    },
    [camera]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!selectedVertexRef.current || !camera) return;

      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Cast ray to z=0 plane
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const target = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(plane, target);

      selectedVertexRef.current.position.copy(target);
      selectedVertexRef.current.prevPosition.copy(target);
    },
    [camera]
  );

  const handlePointerUp = useCallback(() => {
    selectedVertexRef.current = null;
  }, []);

  // Physics integration
  useFrame((state, delta) => {
    if (!simulationRef.current || !meshRef.current) return;

    const dt = Math.min(delta, 0.016); // Cap at 60 FPS

    // Wind force (oscillating)
    windPhaseRef.current += dt;
    const windStrength = Math.sin(windPhaseRef.current * 0.5) * 0.8 + 1;
    const windForce = new THREE.Vector3(windStrength * 1.5, 0.3, Math.sin(windPhaseRef.current * 0.3) * 0.5);

    // Verlet integration
    integrateVerlet(simulationRef.current.vertices, GRAVITY, windForce, dt);

    // Satisfy constraints
    satisfyConstraints(simulationRef.current.constraints);

    // Update geometry positions
    const positions = geometry.attributes.position.array as Float32Array;
    updateGeometryPositions(positions, simulationRef.current.vertices, segmentsX);
    geometry.attributes.position.needsUpdate = true;

    // Compute normals
    geometry.computeVertexNormals();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <meshStandardMaterial
        color={0x4488ff}
        side={THREE.DoubleSide}
        wireframe={false}
        metalness={0.1}
        roughness={0.8}
      />
    </mesh>
  );
}

/**
 * FlagScene - Animated flag simulation
 * Flag pinned on left edge to a pole
 */
export function FlagScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const simulationRef = useRef<{
    vertices: Vertex[];
    constraints: Constraint[];
  } | null>(null);
  const windPhaseRef = useRef<number>(0);
  const pointerWindRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const segmentsX = 20;
  const segmentsY = 15;
  const flagWidth = 3;
  const flagHeight = 2;

  // Initialize flag simulation (left edge pinned)
  useMemo(() => {
    simulationRef.current = createClothSimulation(flagWidth, flagHeight, segmentsX, segmentsY, false);

    // Pin left edge instead of top
    for (let y = 0; y <= segmentsY; y++) {
      const idx = y * (segmentsX + 1);
      simulationRef.current.vertices[idx].pinned = true;
    }
  }, []);

  // Geometry setup
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(flagWidth, flagHeight, segmentsX, segmentsY);
    geo.rotateY(Math.PI / 2); // Rotate to face outward from pole
    return geo;
  }, []);

  // Physics integration for flag
  useFrame((state, delta) => {
    if (!simulationRef.current || !meshRef.current) return;

    const dt = Math.min(delta, 0.016);

    // Stronger wind for flag flapping
    windPhaseRef.current += dt;
    const windStrength = Math.sin(windPhaseRef.current * 1.2) * 1.2 + 1.5;
    const windForce = new THREE.Vector3(
      windStrength * 3.5,
      Math.sin(windPhaseRef.current * 0.8) * 0.8,
      Math.cos(windPhaseRef.current * 0.6) * 1
    ).add(pointerWindRef.current);

    // Gravity reduced for flag
    const flagGravity = new THREE.Vector3(0, -2, 0);

    // Verlet integration
    integrateVerlet(simulationRef.current.vertices, flagGravity, windForce, dt);

    // Satisfy constraints
    satisfyConstraints(simulationRef.current.constraints);

    // Update geometry positions
    const positions = geometry.attributes.position.array as Float32Array;
    updateGeometryPositions(positions, simulationRef.current.vertices, segmentsX);
    geometry.attributes.position.needsUpdate = true;

    // Compute normals
    geometry.computeVertexNormals();

    // Decay pointer wind
    pointerWindRef.current.multiplyScalar(0.95);
  });

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      pointerWindRef.current.set(x * 2, y * 0.5, 0);
    },
    []
  );

  return (
    <group>
      {/* Pole */}
      <Cylinder
        args={[0.08, 0.08, 4, 16]}
        position={[0, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <meshStandardMaterial color={0x8b6914} roughness={0.7} metalness={0.3} />
      </Cylinder>

      {/* Flag */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, 0, 0]}
        onPointerMove={handlePointerMove}
      >
        <meshStandardMaterial
          color={0xff4444}
          side={THREE.FrontSide}
          wireframe={false}
          metalness={0.05}
          roughness={0.85}
        />
      </mesh>
    </group>
  );
}
