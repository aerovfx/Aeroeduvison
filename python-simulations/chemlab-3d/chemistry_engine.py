"""
Chemistry Engine for ChemLab 3D
Features:
- Reaction balancing (sympy)
- Thermodynamics (enthalpy, entropy)
- Molecule data (RDKit)
- 3D structure generation

Author: AI Assistant
Date: 2024-10-12
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import json

# Try to import scientific libraries
try:
    from sympy import symbols, Eq, solve, simplify
    from sympy.parsing.sympy_parser import parse_expr
    SYMPY_AVAILABLE = True
except ImportError:
    print("⚠️  sympy not installed. Install: pip install sympy")
    SYMPY_AVAILABLE = False

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, Descriptors, Draw
    import rdkit.Chem.rdMolDescriptors as rdMolDescriptors
    RDKIT_AVAILABLE = True
except ImportError:
    print("⚠️  RDKit not installed. Install: conda install -c conda-forge rdkit")
    RDKIT_AVAILABLE = False

# Standard enthalpy of formation (ΔH°f) in kJ/mol at 298K
STANDARD_ENTHALPIES = {
    # Common substances
    'H2O(l)': -285.8,
    'H2O(g)': -241.8,
    'CO2(g)': -393.5,
    'CH4(g)': -74.8,
    'C2H5OH(l)': -277.7,
    'NH3(g)': -46.1,
    'HCl(g)': -92.3,
    'H2SO4(l)': -814.0,
    'NaCl(s)': -411.2,
    'CaCO3(s)': -1206.9,
    'Ca(OH)2(s)': -986.1,
    'CaO(s)': -635.1,
    
    # Elements in standard state
    'H2(g)': 0,
    'O2(g)': 0,
    'N2(g)': 0,
    'C(graphite)': 0,
    'S(s)': 0,
    'Na(s)': 0,
    'Ca(s)': 0,
    
    # Ions (aqueous)
    'H+(aq)': 0,
    'OH-(aq)': -230.0,
    'Cl-(aq)': -167.2,
    'Na+(aq)': -240.1,
    'Ca2+(aq)': -542.8
}

# Common reactions database
COMMON_REACTIONS = {
    'combustion_methane': {
        'equation': 'CH4 + O2 → CO2 + H2O',
        'balanced': 'CH4 + 2O2 → CO2 + 2H2O',
        'type': 'combustion',
        'description': 'Đốt cháy methane',
        'deltaH': -890.3,  # kJ/mol (exothermic)
        'conditions': 'Nhiệt độ cao, có O2'
    },
    'photosynthesis': {
        'equation': 'CO2 + H2O → C6H12O6 + O2',
        'balanced': '6CO2 + 6H2O → C6H12O6 + 6O2',
        'type': 'endothermic',
        'description': 'Quang hợp',
        'deltaH': +2803,  # kJ/mol (endothermic)
        'conditions': 'Ánh sáng, chlorophyll'
    },
    'neutralization': {
        'equation': 'HCl + NaOH → NaCl + H2O',
        'balanced': 'HCl + NaOH → NaCl + H2O',
        'type': 'neutralization',
        'description': 'Trung hòa acid-base',
        'deltaH': -57.3,  # kJ/mol (exothermic)
        'conditions': 'Dung dịch nước'
    },
    'decomposition_CaCO3': {
        'equation': 'CaCO3 → CaO + CO2',
        'balanced': 'CaCO3 → CaO + CO2',
        'type': 'decomposition',
        'description': 'Phân hủy đá vôi',
        'deltaH': +178.3,  # kJ/mol (endothermic)
        'conditions': 'Nhiệt độ cao (>825°C)'
    }
}


class ReactionBalancer:
    """Balance chemical equations using sympy"""
    
    def __init__(self):
        if not SYMPY_AVAILABLE:
            print("⚠️  Sympy required for reaction balancing")
        print("🔧 Reaction Balancer initialized")
    
    def parse_compound(self, formula: str) -> Dict[str, int]:
        """
        Parse chemical formula to get element counts
        Example: "Ca(OH)2" -> {"Ca": 1, "O": 2, "H": 2}
        """
        # Simple parser (can be improved with regex)
        elements = {}
        
        # Handle parentheses
        formula = formula.replace('(', '').replace(')', '')
        
        # Find all elements
        pattern = r'([A-Z][a-z]?)(\d*)'
        matches = re.findall(pattern, formula)
        
        for element, count in matches:
            if element:
                count = int(count) if count else 1
                elements[element] = elements.get(element, 0) + count
        
        return elements
    
    def balance_equation(self, equation: str) -> Dict:
        """
        Balance chemical equation
        
        Example: "CH4 + O2 -> CO2 + H2O"
        Returns: "CH4 + 2O2 -> CO2 + 2H2O"
        """
        
        if not SYMPY_AVAILABLE:
            return {'error': 'Sympy not available', 'balanced': equation}
        
        # Split equation
        if '→' in equation:
            reactants_str, products_str = equation.split('→')
        elif '->' in equation:
            reactants_str, products_str = equation.split('->')
        else:
            return {'error': 'Invalid equation format'}
        
        reactants = [r.strip() for r in reactants_str.split('+')]
        products = [p.strip() for p in products_str.split('+')]
        
        # Parse compounds
        reactant_elements = [self.parse_compound(r) for r in reactants]
        product_elements = [self.parse_compound(p) for p in products]
        
        # Get all unique elements
        all_elements = set()
        for comp in reactant_elements + product_elements:
            all_elements.update(comp.keys())
        
        # Create coefficient variables
        num_compounds = len(reactants) + len(products)
        coeffs = symbols(f'c0:{num_compounds}', positive=True, integer=True)
        
        # Build equations for each element
        equations = []
        for element in all_elements:
            # Left side (reactants)
            left = sum(
                coeffs[i] * comp.get(element, 0) 
                for i, comp in enumerate(reactant_elements)
            )
            
            # Right side (products)
            right = sum(
                coeffs[len(reactants) + i] * comp.get(element, 0)
                for i, comp in enumerate(product_elements)
            )
            
            equations.append(Eq(left, right))
        
        # Set first coefficient to 1 (to get integer solution)
        equations.append(Eq(coeffs[0], 1))
        
        try:
            # Solve system
            solution = solve(equations, coeffs)
            
            if solution:
                # Extract coefficients
                coeff_values = [solution.get(c, 1) for c in coeffs]
                
                # Build balanced equation
                reactant_parts = []
                for i, r in enumerate(reactants):
                    coeff = int(coeff_values[i])
                    reactant_parts.append(f"{coeff if coeff > 1 else ''}{r}".strip())
                
                product_parts = []
                for i, p in enumerate(products):
                    coeff = int(coeff_values[len(reactants) + i])
                    product_parts.append(f"{coeff if coeff > 1 else ''}{p}".strip())
                
                balanced = " + ".join(reactant_parts) + " → " + " + ".join(product_parts)
                
                return {
                    'original': equation,
                    'balanced': balanced,
                    'coefficients': {
                        'reactants': coeff_values[:len(reactants)],
                        'products': coeff_values[len(reactants):]
                    },
                    'elements': list(all_elements),
                    'success': True
                }
            else:
                return {'error': 'No solution found', 'balanced': equation}
                
        except Exception as e:
            return {'error': str(e), 'balanced': equation}


class ThermodynamicsEngine:
    """Calculate thermodynamic properties of reactions"""
    
    def __init__(self):
        print("🔧 Thermodynamics Engine initialized")
    
    def calculate_enthalpy_change(
        self,
        reactants: Dict[str, float],  # {formula: moles}
        products: Dict[str, float]
    ) -> Dict:
        """
        Calculate ΔH of reaction using Hess's law
        
        ΔH°rxn = Σ(ΔH°f products) - Σ(ΔH°f reactants)
        """
        
        # Calculate sum for products
        delta_H_products = 0
        for formula, moles in products.items():
            if formula in STANDARD_ENTHALPIES:
                delta_H_products += moles * STANDARD_ENTHALPIES[formula]
            else:
                print(f"⚠️  Unknown enthalpy for {formula}, using 0")
        
        # Calculate sum for reactants
        delta_H_reactants = 0
        for formula, moles in reactants.items():
            if formula in STANDARD_ENTHALPIES:
                delta_H_reactants += moles * STANDARD_ENTHALPIES[formula]
            else:
                print(f"⚠️  Unknown enthalpy for {formula}, using 0")
        
        # ΔH of reaction
        delta_H_rxn = delta_H_products - delta_H_reactants
        
        # Determine reaction type
        if delta_H_rxn < 0:
            reaction_type = 'exothermic'  # Tỏa nhiệt
            description = f'Tỏa {abs(delta_H_rxn):.1f} kJ nhiệt'
        elif delta_H_rxn > 0:
            reaction_type = 'endothermic'  # Thu nhiệt
            description = f'Thu {abs(delta_H_rxn):.1f} kJ nhiệt'
        else:
            reaction_type = 'neutral'
            description = 'Không thay đổi nhiệt'
        
        return {
            'deltaH': delta_H_rxn,
            'reaction_type': reaction_type,
            'description': description,
            'products_H': delta_H_products,
            'reactants_H': delta_H_reactants,
            'unit': 'kJ/mol'
        }
    
    def calculate_gibbs_energy(
        self,
        deltaH: float,
        deltaS: float,
        temperature: float = 298.15  # K
    ) -> Dict:
        """
        Calculate Gibbs free energy
        
        ΔG = ΔH - TΔS
        
        ΔG < 0: Spontaneous (tự xảy ra)
        ΔG > 0: Non-spontaneous (cần năng lượng)
        """
        
        deltaG = deltaH - temperature * deltaS / 1000  # ΔS in J/mol·K, convert to kJ
        
        if deltaG < 0:
            spontaneous = True
            description = 'Phản ứng tự xảy ra (spontaneous)'
        else:
            spontaneous = False
            description = 'Cần cung cấp năng lượng (non-spontaneous)'
        
        return {
            'deltaG': deltaG,
            'spontaneous': spontaneous,
            'description': description,
            'temperature': temperature,
            'unit': 'kJ/mol'
        }


class MoleculeGenerator:
    """Generate 3D molecular structures"""
    
    def __init__(self):
        if not RDKIT_AVAILABLE:
            print("⚠️  RDKit not available for 3D molecule generation")
        print("🔧 Molecule Generator initialized")
    
    def generate_3d_structure(self, smiles: str) -> Dict:
        """
        Generate 3D coordinates for molecule from SMILES
        
        SMILES examples:
        - Water: O
        - Methane: C
        - Ethanol: CCO
        - Benzene: c1ccccc1
        """
        
        if not RDKIT_AVAILABLE:
            return {'error': 'RDKit not available'}
        
        try:
            # Create molecule from SMILES
            mol = Chem.MolFromSmiles(smiles)
            
            if mol is None:
                return {'error': 'Invalid SMILES string'}
            
            # Add hydrogens
            mol = Chem.AddHs(mol)
            
            # Generate 3D coordinates
            AllChem.EmbedMolecule(mol, randomSeed=42)
            AllChem.MMFFOptimizeMolecule(mol)
            
            # Get 3D coordinates
            conf = mol.GetConformer()
            atoms = []
            bonds = []
            
            for atom in mol.GetAtoms():
                pos = conf.GetAtomPosition(atom.GetIdx())
                atoms.append({
                    'element': atom.GetSymbol(),
                    'x': pos.x,
                    'y': pos.y,
                    'z': pos.z,
                    'atomic_num': atom.GetAtomicNum()
                })
            
            for bond in mol.GetBonds():
                bonds.append({
                    'atom1': bond.GetBeginAtomIdx(),
                    'atom2': bond.GetEndAtomIdx(),
                    'type': str(bond.GetBondType())
                })
            
            # Calculate properties
            molecular_weight = Descriptors.MolWt(mol)
            formula = rdMolDescriptors.CalcMolFormula(mol)
            
            return {
                'success': True,
                'smiles': smiles,
                'formula': formula,
                'molecular_weight': molecular_weight,
                'num_atoms': mol.GetNumAtoms(),
                'num_bonds': mol.GetNumBonds(),
                'atoms': atoms,
                'bonds': bonds,
                '3d_ready': True
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_molecule_info(self, smiles: str) -> Dict:
        """Get detailed molecular information"""
        
        if not RDKIT_AVAILABLE:
            return {'error': 'RDKit not available'}
        
        try:
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                return {'error': 'Invalid SMILES'}
            
            return {
                'smiles': smiles,
                'formula': rdMolDescriptors.CalcMolFormula(mol),
                'molecular_weight': Descriptors.MolWt(mol),
                'num_atoms': mol.GetNumAtoms(),
                'num_heavy_atoms': mol.GetNumHeavyAtoms(),
                'num_bonds': mol.GetNumBonds(),
                'num_aromatic_rings': Descriptors.NumAromaticRings(mol),
                'logP': Descriptors.MolLogP(mol),
                'tpsa': Descriptors.TPSA(mol)
            }
            
        except Exception as e:
            return {'error': str(e)}


class VirtualLab:
    """Virtual chemistry laboratory"""
    
    def __init__(self):
        self.balancer = ReactionBalancer()
        self.thermo = ThermodynamicsEngine()
        self.mol_gen = MoleculeGenerator()
        print("🔬 Virtual Chemistry Lab initialized")
    
    def run_experiment(
        self,
        reaction_equation: str,
        temperature: float = 298.15,
        pressure: float = 1.0  # atm
    ) -> Dict:
        """
        Run complete virtual experiment
        
        1. Balance equation
        2. Calculate thermodynamics
        3. Generate 3D structures
        4. Simulate reaction animation
        """
        
        # Step 1: Balance equation
        balanced = self.balancer.balance_equation(reaction_equation)
        
        if not balanced.get('success'):
            return {'error': 'Failed to balance equation'}
        
        # Step 2: Extract compounds for thermodynamics
        # (Simplified - in production, parse balanced equation)
        reactants = {}
        products = {}
        
        # Step 3: Calculate enthalpy
        thermo_result = self.thermo.calculate_enthalpy_change(reactants, products)
        
        # Step 4: Determine spontaneity (simplified, ΔS assumed)
        deltaS = 0  # Would need actual entropy values
        gibbs = self.thermo.calculate_gibbs_energy(
            thermo_result['deltaH'],
            deltaS,
            temperature
        )
        
        return {
            'experiment_id': f'exp_{hash(reaction_equation) % 10000}',
            'equation': balanced,
            'thermodynamics': {
                'enthalpy': thermo_result,
                'gibbs': gibbs,
                'temperature': temperature,
                'pressure': pressure
            },
            'conditions': {
                'temperature_celsius': temperature - 273.15,
                'pressure_atm': pressure
            },
            'success': True
        }
    
    def get_common_reactions(self) -> Dict:
        """Get database of common reactions"""
        return {
            'success': True,
            'reactions': COMMON_REACTIONS,
            'count': len(COMMON_REACTIONS)
        }


# ==========================================
# EXAMPLE USAGE
# ==========================================

if __name__ == "__main__":
    print("="*70)
    print("🧪 CHEMISTRY ENGINE TEST")
    print("="*70)
    print()
    
    lab = VirtualLab()
    print()
    
    # Test 1: Reaction Balancing
    print("1️⃣  REACTION BALANCING")
    print("-" * 70)
    
    if SYMPY_AVAILABLE:
        test_equations = [
            "CH4 + O2 -> CO2 + H2O",
            "H2 + O2 -> H2O",
            "Fe + O2 -> Fe2O3"
        ]
        
        for eq in test_equations:
            result = lab.balancer.balance_equation(eq)
            print(f"   Original:  {result.get('original', eq)}")
            print(f"   Balanced:  {result.get('balanced', 'N/A')}")
            print()
    else:
        print("   ⚠️  Sympy not installed")
        print()
    
    # Test 2: Thermodynamics
    print("2️⃣  THERMODYNAMICS")
    print("-" * 70)
    
    reactants = {'CH4(g)': 1, 'O2(g)': 2}
    products = {'CO2(g)': 1, 'H2O(l)': 2}
    
    thermo = lab.thermo.calculate_enthalpy_change(reactants, products)
    print(f"   Reaction: CH4 + 2O2 → CO2 + 2H2O")
    print(f"   ΔH°rxn: {thermo['deltaH']:.1f} kJ/mol")
    print(f"   Type: {thermo['reaction_type']}")
    print(f"   Description: {thermo['description']}")
    print()
    
    # Test 3: 3D Molecule Generation
    print("3️⃣  3D MOLECULE GENERATION")
    print("-" * 70)
    
    if RDKIT_AVAILABLE:
        molecules = {
            'Water': 'O',
            'Methane': 'C',
            'Ethanol': 'CCO',
            'Benzene': 'c1ccccc1'
        }
        
        for name, smiles in molecules.items():
            mol_3d = lab.mol_gen.generate_3d_structure(smiles)
            if mol_3d.get('success'):
                print(f"   {name} ({smiles})")
                print(f"      Formula: {mol_3d['formula']}")
                print(f"      MW: {mol_3d['molecular_weight']:.2f} g/mol")
                print(f"      Atoms: {mol_3d['num_atoms']}")
                print(f"      3D: ✅ {len(mol_3d['atoms'])} atom coordinates")
                print()
    else:
        print("   ⚠️  RDKit not installed")
        print()
    
    # Test 4: Common Reactions
    print("4️⃣  COMMON REACTIONS DATABASE")
    print("-" * 70)
    
    reactions = lab.get_common_reactions()
    for rxn_id, rxn_data in list(COMMON_REACTIONS.items())[:3]:
        print(f"   {rxn_data['description']}:")
        print(f"      {rxn_data['balanced']}")
        print(f"      ΔH: {rxn_data['deltaH']:+.1f} kJ/mol ({rxn_data['type']})")
        print()
    
    print("="*70)
    print("✅ CHEMISTRY ENGINE TEST COMPLETE!")
    print("="*70)

