"""
Build script cho Chemistry Lab Simulation
Tạo file JSON output với các phản ứng và tính toán mẫu
"""

import json
import os
from main import (
    ChemicalEquation,
    MolCalculator,
    ChemicalReaction,
    Molecule,
    ATOMIC_MASSES
)

def build_simulation():
    """Tạo data cho simulation"""
    
    print("🧪 Building Chemistry Lab Simulation...")
    
    # 1. Common equations
    print("  ⚗️  Generating common chemical equations...")
    equations = []
    
    common_equations = [
        "H2 + O2 -> H2O",
        "N2 + H2 -> NH3",
        "CH4 + O2 -> CO2 + H2O",
        "C + O2 -> CO2",
        "Fe + O2 -> Fe2O3",
        "Zn + HCl -> ZnCl2 + H2",
        "CaCO3 -> CaO + CO2",
        "HCl + NaOH -> NaCl + H2O",
        "CuSO4 + NaOH -> Cu(OH)2 + Na2SO4",
        "AgNO3 + NaCl -> AgCl + NaNO3"
    ]
    
    for eq_str in common_equations:
        eq = ChemicalEquation(eq_str)
        eq.balance()
        equations.append({
            "original": eq_str,
            "balanced": eq.get_equation_string(),
            "data": eq.to_dict()
        })
    
    # 2. Mol calculations examples
    print("  🔢 Generating calculation examples...")
    calculations = []
    
    calc = MolCalculator()
    
    # Example 1: H2O mass to mol
    calculations.append({
        "id": "water_mass_to_mol",
        "type": "mass_to_mol",
        "description": "Tính số mol của 36g H₂O",
        "input": {"mass": 36, "molecular_mass": 18},
        "output": {"mol": calc.mass_to_mol(36, 18)},
        "formula": "n = m/M = 36/18 = 2 mol"
    })
    
    # Example 2: CO2 mol to volume
    calculations.append({
        "id": "co2_mol_to_volume",
        "type": "mol_to_volume",
        "description": "Thể tích của 0.5 mol CO₂ (đktc)",
        "input": {"mol": 0.5},
        "output": {"volume": calc.mol_to_volume(0.5)},
        "formula": "V = n × 22.4 = 0.5 × 22.4 = 11.2 L"
    })
    
    # Example 3: NaCl concentration
    calculations.append({
        "id": "nacl_concentration",
        "type": "mol_to_concentration",
        "description": "Nồng độ của 0.2 mol NaCl trong 1L dung dịch",
        "input": {"mol": 0.2, "volume": 1},
        "output": {"concentration": calc.mol_to_concentration(0.2, 1)},
        "formula": "CM = n/V = 0.2/1 = 0.2 M"
    })
    
    # 3. Molecular masses
    print("  🧬 Calculating molecular masses...")
    molecular_masses = []
    
    common_molecules = [
        "H2O", "CO2", "NH3", "CH4", "HCl", "NaCl", "CaCO3",
        "H2SO4", "NaOH", "CuSO4", "AgNO3", "Fe2O3", "MgO"
    ]
    
    for formula in common_molecules:
        mol = Molecule(formula)
        molecular_masses.append({
            "formula": formula,
            "molecular_mass": mol.get_molecular_mass(),
            "elements": mol.parse_formula()
        })
    
    # 4. Reactions with effects
    print("  💥 Generating reaction scenarios...")
    reactions = []
    
    for reaction_id in ChemicalReaction.REACTIONS_DB.keys():
        reaction = ChemicalReaction.get_reaction(reaction_id)
        reactions.append({
            "id": reaction_id,
            "data": reaction
        })
    
    # 5. Simulation examples
    print("  🔬 Generating simulation examples...")
    simulations = []
    
    # Simulate Zn + HCl
    sim1 = ChemicalReaction.simulate_reaction("zn_hcl", {"Zn": 0.1, "HCl": 0.3})
    simulations.append({
        "id": "zn_hcl_sim",
        "name": "Zn + HCl: Zn dư",
        "data": sim1
    })
    
    # Simulate CuSO4 + NaOH
    sim2 = ChemicalReaction.simulate_reaction("cuso4_naoh", {"CuSO4": 0.1, "NaOH": 0.2})
    simulations.append({
        "id": "cuso4_naoh_sim",
        "name": "CuSO₄ + NaOH: Vừa đủ",
        "data": sim2
    })
    
    # Tổng hợp data
    output_data = {
        "simulation_type": "chemistry-lab",
        "version": "1.0.0",
        "description": "Phòng thí nghiệm Hóa học ảo - Cân bằng phương trình, tính mol, mô phỏng phản ứng",
        "data": {
            "equations": {
                "description": "Các phương trình hóa học đã cân bằng",
                "data": equations,
                "count": len(equations)
            },
            "calculations": {
                "description": "Các ví dụ tính toán mol",
                "data": calculations,
                "count": len(calculations)
            },
            "molecular_masses": {
                "description": "Khối lượng phân tử các chất phổ biến",
                "data": molecular_masses,
                "count": len(molecular_masses)
            },
            "reactions": {
                "description": "Các phản ứng với hiệu ứng trực quan",
                "data": reactions,
                "count": len(reactions)
            },
            "simulations": {
                "description": "Các ví dụ mô phỏng phản ứng",
                "data": simulations,
                "count": len(simulations)
            },
            "elements": {
                "description": "Bảng khối lượng nguyên tử",
                "data": [{"symbol": k, "mass": v} for k, v in sorted(ATOMIC_MASSES.items())],
                "count": len(ATOMIC_MASSES)
            }
        },
        "statistics": {
            "total_equations": len(equations),
            "total_calculations": len(calculations),
            "total_molecules": len(molecular_masses),
            "total_reactions": len(reactions),
            "total_simulations": len(simulations),
            "total_elements": len(ATOMIC_MASSES)
        }
    }
    
    # Tạo thư mục output
    os.makedirs("output", exist_ok=True)
    
    # Ghi file JSON
    output_file = "output/data.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Build completed!")
    print(f"📊 Statistics:")
    print(f"   - Chemical equations: {len(equations)}")
    print(f"   - Calculation examples: {len(calculations)}")
    print(f"   - Molecular masses: {len(molecular_masses)}")
    print(f"   - Reactions with effects: {len(reactions)}")
    print(f"   - Simulation examples: {len(simulations)}")
    print(f"   - Elements: {len(ATOMIC_MASSES)}")
    print(f"\n💾 Output saved to: {output_file}")
    
    return output_data

if __name__ == "__main__":
    build_simulation()


