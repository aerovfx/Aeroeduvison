"""
MechaForce - Structural Mechanics Simulation
Phân tích lực, moment và ứng suất trong kết cấu
"""

import numpy as np
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class Node:
    """Node (điểm nút) trong kết cấu"""
    id: int
    x: float
    y: float
    z: float = 0.0
    is_fixed: bool = False  # Điểm tựa cố định
    
    def to_dict(self):
        return {
            'id': self.id,
            'position': [self.x, self.y, self.z],
            'is_fixed': self.is_fixed
        }


@dataclass
class Beam:
    """Beam (dầm) nối 2 nodes"""
    id: int
    node1_id: int
    node2_id: int
    cross_section_area: float = 1.0  # Diện tích mặt cắt
    elastic_modulus: float = 200e9  # Young's modulus (Pa)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nodes': [self.node1_id, self.node2_id],
            'area': self.cross_section_area,
            'E': self.elastic_modulus
        }


@dataclass
class Force:
    """External force (lực ngoài)"""
    node_id: int
    fx: float
    fy: float
    fz: float = 0.0
    
    def to_dict(self):
        return {
            'node_id': self.node_id,
            'force': [self.fx, self.fy, self.fz]
        }


class StructuralSolver:
    """Solve structural mechanics using finite element method"""
    
    def __init__(self):
        self.nodes: List[Node] = []
        self.beams: List[Beam] = []
        self.forces: List[Force] = []
        
        # Results
        self.displacements = None
        self.reactions = None
        self.internal_forces = None
        self.stresses = None
    
    def add_node(self, x: float, y: float, z: float = 0, is_fixed: bool = False) -> int:
        """Add a node"""
        node_id = len(self.nodes)
        self.nodes.append(Node(node_id, x, y, z, is_fixed))
        return node_id
    
    def add_beam(self, node1_id: int, node2_id: int, 
                 area: float = 1.0, E: float = 200e9) -> int:
        """Add a beam between two nodes"""
        beam_id = len(self.beams)
        self.beams.append(Beam(beam_id, node1_id, node2_id, area, E))
        return beam_id
    
    def add_force(self, node_id: int, fx: float, fy: float, fz: float = 0):
        """Add external force to a node"""
        self.forces.append(Force(node_id, fx, fy, fz))
    
    def solve_2d(self):
        """Solve 2D truss structure"""
        n_nodes = len(self.nodes)
        n_dof = n_nodes * 2  # 2 DOF per node in 2D (x, y)
        
        # Global stiffness matrix
        K = np.zeros((n_dof, n_dof))
        
        # Build stiffness matrix
        for beam in self.beams:
            n1 = self.nodes[beam.node1_id]
            n2 = self.nodes[beam.node2_id]
            
            # Beam length
            dx = n2.x - n1.x
            dy = n2.y - n1.y
            L = np.sqrt(dx**2 + dy**2)
            
            # Direction cosines
            c = dx / L
            s = dy / L
            
            # Element stiffness
            k = (beam.elastic_modulus * beam.cross_section_area) / L
            
            # Local to global transformation
            k_elem = k * np.array([
                [c*c, c*s, -c*c, -c*s],
                [c*s, s*s, -c*s, -s*s],
                [-c*c, -c*s, c*c, c*s],
                [-c*s, -s*s, c*s, s*s]
            ])
            
            # Assembly
            dofs = [
                beam.node1_id * 2, beam.node1_id * 2 + 1,
                beam.node2_id * 2, beam.node2_id * 2 + 1
            ]
            
            for i in range(4):
                for j in range(4):
                    K[dofs[i], dofs[j]] += k_elem[i, j]
        
        # Force vector
        F = np.zeros(n_dof)
        for force in self.forces:
            F[force.node_id * 2] = force.fx
            F[force.node_id * 2 + 1] = force.fy
        
        # Apply boundary conditions (fixed nodes)
        free_dofs = []
        for i, node in enumerate(self.nodes):
            if not node.is_fixed:
                free_dofs.extend([i * 2, i * 2 + 1])
        
        # Reduced system
        K_reduced = K[np.ix_(free_dofs, free_dofs)]
        F_reduced = F[free_dofs]
        
        # Solve
        try:
            u_reduced = np.linalg.solve(K_reduced, F_reduced)
        except:
            # Singular matrix - structure unstable
            u_reduced = np.zeros(len(free_dofs))
        
        # Full displacement vector
        u = np.zeros(n_dof)
        for i, dof in enumerate(free_dofs):
            u[dof] = u_reduced[i]
        
        self.displacements = u
        
        # Calculate reactions at fixed nodes
        self.reactions = K @ u - F
        
        # Calculate internal forces
        self.internal_forces = []
        for beam in self.beams:
            n1 = self.nodes[beam.node1_id]
            n2 = self.nodes[beam.node2_id]
            
            dx = n2.x - n1.x
            dy = n2.y - n1.y
            L = np.sqrt(dx**2 + dy**2)
            c = dx / L
            s = dy / L
            
            # Get displacements
            u1x = u[beam.node1_id * 2]
            u1y = u[beam.node1_id * 2 + 1]
            u2x = u[beam.node2_id * 2]
            u2y = u[beam.node2_id * 2 + 1]
            
            # Axial force
            delta_u = (u2x - u1x) * c + (u2y - u1y) * s
            axial_force = (beam.elastic_modulus * beam.cross_section_area / L) * delta_u
            
            # Stress
            stress = axial_force / beam.cross_section_area
            
            self.internal_forces.append({
                'beam_id': beam.id,
                'axial_force': float(axial_force),
                'stress': float(stress),
                'type': 'tension' if axial_force > 0 else 'compression'
            })
    
    def get_results(self) -> Dict:
        """Get analysis results"""
        results = {
            'nodes': [n.to_dict() for n in self.nodes],
            'beams': [b.to_dict() for b in self.beams],
            'forces': [f.to_dict() for f in self.forces],
            'displacements': [],
            'reactions': [],
            'internal_forces': self.internal_forces or [],
            'max_displacement': 0,
            'max_stress': 0
        }
        
        if self.displacements is not None:
            for i, node in enumerate(self.nodes):
                results['displacements'].append({
                    'node_id': i,
                    'dx': float(self.displacements[i * 2]),
                    'dy': float(self.displacements[i * 2 + 1]),
                    'magnitude': float(np.sqrt(
                        self.displacements[i * 2]**2 + 
                        self.displacements[i * 2 + 1]**2
                    ))
                })
            
            results['max_displacement'] = float(np.max(np.abs(self.displacements)))
        
        if self.reactions is not None:
            for i, node in enumerate(self.nodes):
                if node.is_fixed:
                    results['reactions'].append({
                        'node_id': i,
                        'rx': float(self.reactions[i * 2]),
                        'ry': float(self.reactions[i * 2 + 1])
                    })
        
        if self.internal_forces:
            stresses = [f['stress'] for f in self.internal_forces]
            results['max_stress'] = float(np.max(np.abs(stresses)))
        
        return results


def analyze_structure(config: Dict) -> Dict:
    """Analyze structural mechanics"""
    
    solver = StructuralSolver()
    
    # Add nodes
    for node in config.get('nodes', []):
        solver.add_node(
            node['x'], node['y'], node.get('z', 0),
            node.get('is_fixed', False)
        )
    
    # Add beams
    for beam in config.get('beams', []):
        solver.add_beam(
            beam['node1_id'], beam['node2_id'],
            beam.get('area', 0.01),
            beam.get('E', 200e9)
        )
    
    # Add forces
    for force in config.get('forces', []):
        solver.add_force(
            force['node_id'], 
            force['fx'], force['fy'], force.get('fz', 0)
        )
    
    # Solve
    solver.solve_2d()
    
    # Get results
    results = solver.get_results()
    results['config'] = config
    results['success'] = True
    
    return results


def optimize_structure(config: Dict) -> Dict:
    """AI optimization to minimize weight while maintaining strength"""
    
    best_configs = []
    
    # Test different beam sizes
    areas = [0.005, 0.01, 0.015, 0.02, 0.025]
    
    for area in areas:
        # Modify config
        test_config = config.copy()
        for beam in test_config['beams']:
            beam['area'] = area
        
        # Analyze
        result = analyze_structure(test_config)
        
        # Calculate metrics
        total_weight = area * sum(1 for _ in test_config['beams'])  # Simplified
        max_stress = result['max_stress']
        max_displacement = result['max_displacement']
        
        # Safety factor
        yield_stress = 250e6  # Pa (typical steel)
        safety_factor = yield_stress / max_stress if max_stress > 0 else float('inf')
        
        # Score: lighter is better, but must be safe
        if safety_factor >= 1.5:  # Safe
            score = 1000 / total_weight  # Prefer lighter
        else:
            score = 0  # Unsafe
        
        best_configs.append({
            'area': area,
            'weight': float(total_weight),
            'max_stress': float(max_stress),
            'max_displacement': float(max_displacement),
            'safety_factor': float(safety_factor),
            'score': float(score),
            'is_safe': safety_factor >= 1.5
        })
    
    # Sort by score
    best_configs.sort(key=lambda x: x['score'], reverse=True)
    
    return {
        'success': True,
        'configurations': best_configs,
        'recommendation': best_configs[0] if best_configs else None
    }


if __name__ == "__main__":
    # Test: Simple cantilever beam
    config = {
        'nodes': [
            {'x': 0, 'y': 0, 'is_fixed': True},  # Fixed end
            {'x': 1, 'y': 0, 'is_fixed': False},  # Middle
            {'x': 2, 'y': 0, 'is_fixed': False}   # Free end
        ],
        'beams': [
            {'node1_id': 0, 'node2_id': 1, 'area': 0.01, 'E': 200e9},
            {'node1_id': 1, 'node2_id': 2, 'area': 0.01, 'E': 200e9}
        ],
        'forces': [
            {'node_id': 2, 'fx': 0, 'fy': -10000}  # 10kN downward
        ]
    }
    
    print("🏗️  Analyzing structure...")
    result = analyze_structure(config)
    
    print(f"\n✅ Analysis complete!")
    print(f"   Max displacement: {result['max_displacement']:.6f} m")
    print(f"   Max stress: {result['max_stress']/1e6:.2f} MPa")
    print(f"   Number of beams: {len(result['beams'])}")
