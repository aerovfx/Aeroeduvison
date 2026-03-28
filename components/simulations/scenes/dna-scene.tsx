'use client';

import * as THREE from 'three';
import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere, Cylinder, Float } from '@react-three/drei';

// DNA base pair type definitions
type DNABase = 'A' | 'T' | 'G' | 'C';
type BasePair = [DNABase, DNABase];

interface BasePairPosition {
  position1: THREE.Vector3;
  position2: THREE.Vector3;
  base1: DNABase;
  base2: DNABase;
  index: number;
}

// Color mapping for DNA bases
const BASE_COLORS: Record<DNABase, string> = {
  A: '#ff4444', // Red
  T: '#4444ff', // Blue
  G: '#44ff44', // Green
  C: '#ffff44', // Yellow
};

// Base pair combinations (A-T, G-C)
const VALID_PAIRS: Record<DNABase, DNABase> = {
  A: 'T',
  T: 'A',
  G: 'C',
  C: 'G',
};

/**
 * Generates a sequence of DNA base pairs following biological rules
 */
const generateDNASequence = (length: number): BasePair[] => {
  const bases: DNABase[] = ['A', 'T', 'G', 'C'];
  const sequence: BasePair[] = [];

  for (let i = 0; i < length; i++) {
    const base1 = bases[Math.floor(Math.random() * bases.length)] as DNABase;
    const base2 = VALID_PAIRS[base1];
    sequence.push([base1, base2]);
  }

  return sequence;
};

/**
 * Calculates helix coordinates for a given position
 */
const getHelixPosition = (
  index: number,
  radius: number,
  spacing: number,
  strandOffset: number
): THREE.Vector3 => {
  const angle = (index * Math.PI * 2) / spacing;
  const y = index * spacing;

  const x = radius * Math.cos(angle + strandOffset);
  const z = radius * Math.sin(angle + strandOffset);

  return new THREE.Vector3(x, y, z);
};

/**
 * DNAHelixScene: Main double helix visualization
 * Displays a rotating DNA strand with interactive base pair tooltips
 */
export const DNAHelixScene: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const basePairsRef = useRef<BasePairPosition[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Configuration
  const HELIX_RADIUS = 1;
  const BASE_PAIR_SPACING = 0.4;
  const NUM_BASE_PAIRS = 20;
  const BACKBONE_SPHERE_RADIUS = 0.15;
  const BASE_PAIR_SPHERE_RADIUS = 0.12;
  const ROTATION_SPEED = 0.003;

  // Generate DNA sequence and helix positions
  const basePairs = useMemo(() => {
    return generateDNASequence(NUM_BASE_PAIRS);
  }, []);

  useMemo(() => {
    const positions: BasePairPosition[] = [];

    basePairs.forEach((pair, index) => {
      const position1 = getHelixPosition(
        index,
        HELIX_RADIUS,
        BASE_PAIR_SPACING,
        0
      );
      const position2 = getHelixPosition(
        index,
        HELIX_RADIUS,
        BASE_PAIR_SPACING,
        Math.PI
      );

      positions.push({
        position1,
        position2,
        base1: pair[0],
        base2: pair[1],
        index,
      });
    });

    basePairsRef.current = positions;
  }, [basePairs]);

  // Rotate the helix
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ROTATION_SPEED;
    }
  });

  const handleBasePairHover = useCallback(
    (index: number, position: THREE.Vector3) => {
      setHoveredIndex(index);
      setTooltipPosition([position.x, position.y, position.z]);
    },
    []
  );

  const handleBasePairUnhover = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  return (
    <group ref={groupRef}>
      {/* Render backbone strands and base pairs */}
      {basePairsRef.current.map((pair, index) => (
        <group key={`pair-${index}`}>
          {/* Strand 1 backbone sphere */}
          <Sphere
            position={[pair.position1.x, pair.position1.y, pair.position1.z]}
            args={[BACKBONE_SPHERE_RADIUS, 16, 16]}
            onPointerEnter={() =>
              handleBasePairHover(index, pair.position1)
            }
            onPointerLeave={handleBasePairUnhover}
          >
            <meshStandardMaterial
              color={BASE_COLORS[pair.base1]}
              emissive={BASE_COLORS[pair.base1]}
              emissiveIntensity={0.5}
              metalness={0.3}
              roughness={0.4}
            />
          </Sphere>

          {/* Strand 2 backbone sphere */}
          <Sphere
            position={[pair.position2.x, pair.position2.y, pair.position2.z]}
            args={[BACKBONE_SPHERE_RADIUS, 16, 16]}
            onPointerEnter={() =>
              handleBasePairHover(index, pair.position2)
            }
            onPointerLeave={handleBasePairUnhover}
          >
            <meshStandardMaterial
              color={BASE_COLORS[pair.base2]}
              emissive={BASE_COLORS[pair.base2]}
              emissiveIntensity={0.5}
              metalness={0.3}
              roughness={0.4}
            />
          </Sphere>

          {/* Base pair connector (rung of the ladder) */}
          <Cylinder
            position={[
              (pair.position1.x + pair.position2.x) / 2,
              (pair.position1.y + pair.position2.y) / 2,
              (pair.position1.z + pair.position2.z) / 2,
            ]}
            args={[0.08, 0.08, pair.position1.distanceTo(pair.position2), 8]}
            rotation={[
              Math.atan2(
                pair.position2.y - pair.position1.y,
                Math.sqrt(
                  Math.pow(pair.position2.x - pair.position1.x, 2) +
                    Math.pow(pair.position2.z - pair.position1.z, 2)
                )
              ),
              0,
              Math.atan2(
                pair.position2.z - pair.position1.z,
                pair.position2.x - pair.position1.x
              ),
            ]}
          >
            <meshStandardMaterial
              color="#cccccc"
              opacity={0.6}
              transparent
              metalness={0.2}
              roughness={0.5}
            />
          </Cylinder>

          {/* Interactive tooltip for base pairs */}
          {hoveredIndex === index && (
            <Html position={[pair.position1.x, pair.position1.y + 0.5, pair.position1.z]}>
              <div
                style={{
                  background: '#1a1a2e',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: `2px solid ${BASE_COLORS[pair.base1]}`,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {pair.base1}-{pair.base2} (Pair {index + 1})
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* Connecting lines between consecutive backbone spheres on each strand */}
      {basePairsRef.current.map((pair, index) => {
        if (index === basePairsRef.current.length - 1) return null;

        const nextPair = basePairsRef.current[index + 1];

        return (
          <group key={`backbone-line-${index}`}>
            {/* Strand 1 connection */}
            <Cylinder
              position={[
                (pair.position1.x + nextPair.position1.x) / 2,
                (pair.position1.y + nextPair.position1.y) / 2,
                (pair.position1.z + nextPair.position1.z) / 2,
              ]}
              args={[
                0.05,
                0.05,
                pair.position1.distanceTo(nextPair.position1),
                6,
              ]}
              rotation={[
                Math.atan2(
                  nextPair.position1.y - pair.position1.y,
                  Math.sqrt(
                    Math.pow(nextPair.position1.x - pair.position1.x, 2) +
                      Math.pow(nextPair.position1.z - pair.position1.z, 2)
                  )
                ),
                0,
                Math.atan2(
                  nextPair.position1.z - pair.position1.z,
                  nextPair.position1.x - pair.position1.x
                ),
              ]}
            >
              <meshStandardMaterial
                color="#888888"
                opacity={0.5}
                transparent
              />
            </Cylinder>

            {/* Strand 2 connection */}
            <Cylinder
              position={[
                (pair.position2.x + nextPair.position2.x) / 2,
                (pair.position2.y + nextPair.position2.y) / 2,
                (pair.position2.z + nextPair.position2.z) / 2,
              ]}
              args={[
                0.05,
                0.05,
                pair.position2.distanceTo(nextPair.position2),
                6,
              ]}
              rotation={[
                Math.atan2(
                  nextPair.position2.y - pair.position2.y,
                  Math.sqrt(
                    Math.pow(nextPair.position2.x - pair.position2.x, 2) +
                      Math.pow(nextPair.position2.z - pair.position2.z, 2)
                  )
                ),
                0,
                Math.atan2(
                  nextPair.position2.z - pair.position2.z,
                  nextPair.position2.x - pair.position2.x
                ),
              ]}
            >
              <meshStandardMaterial
                color="#888888"
                opacity={0.5}
                transparent
              />
            </Cylinder>
          </group>
        );
      })}
    </group>
  );
};

/**
 * DNADetailScene: Zoomed-in educational view of base pairs
 * Shows 5 base pairs with labels, hydrogen bonds, and interactivity
 */
export const DNADetailScene: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Configuration for detail view
  const HELIX_RADIUS = 2;
  const BASE_PAIR_SPACING = 1;
  const NUM_BASE_PAIRS = 5;
  const BACKBONE_SPHERE_RADIUS = 0.3;
  const NUCLEOTIDE_SPHERE_RADIUS = 0.25;
  const ROTATION_SPEED = 0.0005;
  const HYDROGEN_BOND_COUNT = 3; // A-T has 2, G-C has 3

  // Generate DNA sequence
  const basePairs = useMemo(() => {
    return generateDNASequence(NUM_BASE_PAIRS);
  }, []);

  // Rotate slowly for educational view
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ROTATION_SPEED;
    }
  });

  const getHydrogenBondCount = (base1: DNABase, base2: DNABase): number => {
    return (base1 === 'A' || base2 === 'A') ? 2 : 3;
  };

  return (
    <group ref={groupRef}>
      {basePairs.map((pair, index) => {
        const position1 = getHelixPosition(
          index,
          HELIX_RADIUS,
          BASE_PAIR_SPACING,
          0
        );
        const position2 = getHelixPosition(
          index,
          HELIX_RADIUS,
          BASE_PAIR_SPACING,
          Math.PI
        );

        const isHighlighted = highlightedIndex === index;
        const highlightIntensity = isHighlighted ? 1.5 : 0.5;

        return (
          <group key={`detail-pair-${index}`}>
            {/* Strand 1 nucleotide */}
            <Sphere
              position={[position1.x, position1.y, position1.z]}
              args={[NUCLEOTIDE_SPHERE_RADIUS, 32, 32]}
              onClick={() => setHighlightedIndex(isHighlighted ? null : index)}
              onPointerEnter={() => setHighlightedIndex(index)}
              onPointerLeave={() =>
                setHighlightedIndex(isHighlighted ? index : null)
              }
            >
              <meshStandardMaterial
                color={BASE_COLORS[pair[0]]}
                emissive={BASE_COLORS[pair[0]]}
                emissiveIntensity={highlightIntensity}
                metalness={0.4}
                roughness={0.3}
              />
            </Sphere>

            {/* Strand 2 nucleotide */}
            <Sphere
              position={[position2.x, position2.y, position2.z]}
              args={[NUCLEOTIDE_SPHERE_RADIUS, 32, 32]}
              onClick={() => setHighlightedIndex(isHighlighted ? null : index)}
              onPointerEnter={() => setHighlightedIndex(index)}
              onPointerLeave={() =>
                setHighlightedIndex(isHighlighted ? index : null)
              }
            >
              <meshStandardMaterial
                color={BASE_COLORS[pair[1]]}
                emissive={BASE_COLORS[pair[1]]}
                emissiveIntensity={highlightIntensity}
                metalness={0.4}
                roughness={0.3}
              />
            </Sphere>

            {/* Backbone connections */}
            {index > 0 && (
              <>
                <Cylinder
                  position={[
                    (position1.x +
                      getHelixPosition(
                        index - 1,
                        HELIX_RADIUS,
                        BASE_PAIR_SPACING,
                        0
                      ).x) /
                      2,
                    (position1.y +
                      getHelixPosition(
                        index - 1,
                        HELIX_RADIUS,
                        BASE_PAIR_SPACING,
                        0
                      ).y) /
                      2,
                    (position1.z +
                      getHelixPosition(
                        index - 1,
                        HELIX_RADIUS,
                        BASE_PAIR_SPACING,
                        0
                      ).z) /
                      2,
                  ]}
                  args={[
                    0.1,
                    0.1,
                    position1.distanceTo(
                      getHelixPosition(
                        index - 1,
                        HELIX_RADIUS,
                        BASE_PAIR_SPACING,
                        0
                      )
                    ),
                    8,
                  ]}
                  rotation={[
                    Math.atan2(
                      position1.y -
                        getHelixPosition(
                          index - 1,
                          HELIX_RADIUS,
                          BASE_PAIR_SPACING,
                          0
                        ).y,
                      Math.sqrt(
                        Math.pow(
                          position1.x -
                            getHelixPosition(
                              index - 1,
                              HELIX_RADIUS,
                              BASE_PAIR_SPACING,
                              0
                            ).x,
                          2
                        ) +
                          Math.pow(
                            position1.z -
                              getHelixPosition(
                                index - 1,
                                HELIX_RADIUS,
                                BASE_PAIR_SPACING,
                                0
                              ).z,
                            2
                          )
                      )
                    ),
                    0,
                    Math.atan2(
                      position1.z -
                        getHelixPosition(
                          index - 1,
                          HELIX_RADIUS,
                          BASE_PAIR_SPACING,
                          0
                        ).z,
                      position1.x -
                        getHelixPosition(
                          index - 1,
                          HELIX_RADIUS,
                          BASE_PAIR_SPACING,
                          0
                        ).x
                    ),
                  ]}
                >
                  <meshStandardMaterial
                    color={BASE_COLORS[pair[0]]}
                    opacity={0.7}
                    transparent
                  />
                </Cylinder>

                <Cylinder
                  position={[
                    (position2.x +
                      getHelixPosition(
                        index - 1,
                        HELIX_RADIUS,
                        BASE_PAIR_SPACING,
                        Math.PI
                      ).x) /
                      2,
                    (position2.y +
                      getHelixPosition(
                        index - 1,
                        HELIX_RADIUS,
                        BASE_PAIR_SPACING,
                        Math.PI
                      ).y) /
                      2,
                    (position2.z +
                      getHelixPosition(
                        index - 1,
                        HELIX_RADIUS,
                        BASE_PAIR_SPACING,
                        Math.PI
                      ).z) /
                      2,
                  ]}
                  args={[
                    0.1,
                    0.1,
                    position2.distanceTo(
                      getHelixPosition(
                        index - 1,
                        HELIX_RADIUS,
                        BASE_PAIR_SPACING,
                        Math.PI
                      )
                    ),
                    8,
                  ]}
                  rotation={[
                    Math.atan2(
                      position2.y -
                        getHelixPosition(
                          index - 1,
                          HELIX_RADIUS,
                          BASE_PAIR_SPACING,
                          Math.PI
                        ).y,
                      Math.sqrt(
                        Math.pow(
                          position2.x -
                            getHelixPosition(
                              index - 1,
                              HELIX_RADIUS,
                              BASE_PAIR_SPACING,
                              Math.PI
                            ).x,
                          2
                        ) +
                          Math.pow(
                            position2.z -
                              getHelixPosition(
                                index - 1,
                                HELIX_RADIUS,
                                BASE_PAIR_SPACING,
                                Math.PI
                              ).z,
                            2
                          )
                      )
                    ),
                    0,
                    Math.atan2(
                      position2.z -
                        getHelixPosition(
                          index - 1,
                          HELIX_RADIUS,
                          BASE_PAIR_SPACING,
                          Math.PI
                        ).z,
                      position2.x -
                        getHelixPosition(
                          index - 1,
                          HELIX_RADIUS,
                          BASE_PAIR_SPACING,
                          Math.PI
                        ).x
                    ),
                  ]}
                >
                  <meshStandardMaterial
                    color={BASE_COLORS[pair[1]]}
                    opacity={0.7}
                    transparent
                  />
                </Cylinder>
              </>
            )}

            {/* Hydrogen bonds (dashed cylinders) */}
            {[...Array(getHydrogenBondCount(pair[0], pair[1]))].map(
              (_, bondIndex) => {
                const offset = (bondIndex - 0.5) * 0.15;

                return (
                  <group key={`hbond-${index}-${bondIndex}`}>
                    {/* Draw dashed effect with multiple small cylinders */}
                    {[...Array(4)].map((_, dashIndex) => (
                      <Cylinder
                        key={`dash-${dashIndex}`}
                        position={[
                          position1.x +
                            (position2.x - position1.x) * (0.15 + dashIndex * 0.2),
                          position1.y +
                            (position2.y - position1.y) * (0.15 + dashIndex * 0.2) +
                            offset,
                          position1.z +
                            (position2.z - position1.z) * (0.15 + dashIndex * 0.2),
                        ]}
                        args={[0.04, 0.04, 0.15, 4]}
                        rotation={[
                          Math.atan2(
                            position2.y - position1.y,
                            Math.sqrt(
                              Math.pow(position2.x - position1.x, 2) +
                                Math.pow(position2.z - position1.z, 2)
                            )
                          ),
                          0,
                          Math.atan2(
                            position2.z - position1.z,
                            position2.x - position1.x
                          ),
                        ]}
                      >
                        <meshStandardMaterial
                          color="#ffaa00"
                          opacity={0.8}
                          transparent
                          emissive="#ff8800"
                          emissiveIntensity={0.5}
                        />
                      </Cylinder>
                    ))}
                  </group>
                );
              }
            )}

            {/* Nucleotide labels */}
            <Html position={[position1.x - 0.8, position1.y, position1.z]}>
              <div
                style={{
                  background: isHighlighted ? '#ff6b6b' : 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: `2px solid ${BASE_COLORS[pair[0]]}`,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                {pair[0]}
              </div>
            </Html>

            <Html position={[position2.x + 0.8, position2.y, position2.z]}>
              <div
                style={{
                  background: isHighlighted ? '#6b6bff' : 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: `2px solid ${BASE_COLORS[pair[1]]}`,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                {pair[1]}
              </div>
            </Html>

            {/* Info panel on highlight */}
            {isHighlighted && (
              <Html position={[0, position1.y + 1.5, 0]}>
                <div
                  style={{
                    background: '#1a1a2e',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    maxWidth: '200px',
                    border: '2px solid #ffd700',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    Base Pair {index + 1}: {pair[0]}-{pair[1]}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    Hydrogen bonds: {getHydrogenBondCount(pair[0], pair[1])}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                    Type:{' '}
                    {(pair[0] === 'A' || pair[0] === 'T')
                      ? 'Weak (2 bonds)'
                      : 'Strong (3 bonds)'}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
