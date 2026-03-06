"""
Phòng thí nghiệm Hóa học ảo (Virtual Chemistry Laboratory)
- Cân bằng phương trình hóa học
- Tính toán mol, khối lượng, thể tích
- Mô phỏng thí nghiệm với hiệu ứng trực quan
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
import json

# Khối lượng mol nguyên tử (g/mol)
ATOMIC_MASSES = {
    'H': 1.008, 'He': 4.003, 'Li': 6.941, 'Be': 9.012, 'B': 10.81,
    'C': 12.01, 'N': 14.01, 'O': 16.00, 'F': 19.00, 'Ne': 20.18,
    'Na': 22.99, 'Mg': 24.31, 'Al': 26.98, 'Si': 28.09, 'P': 30.97,
    'S': 32.07, 'Cl': 35.45, 'Ar': 39.95, 'K': 39.10, 'Ca': 40.08,
    'Fe': 55.85, 'Cu': 63.55, 'Zn': 65.38, 'Ag': 107.87, 'Au': 196.97,
    'Br': 79.90, 'I': 126.90, 'Pb': 207.2, 'Mn': 54.94, 'Cr': 52.00,
    'Ba': 137.33, 'Sr': 87.62
}

@dataclass
class Molecule:
    """Phân tử hóa học"""
    formula: str
    coefficient: int = 1
    
    def parse_formula(self) -> Dict[str, int]:
        """Phân tích công thức hóa học thành các nguyên tố"""
        elements = {}
        
        # Pattern: Element + optional number
        pattern = r'([A-Z][a-z]?)(\d*)'
        matches = re.findall(pattern, self.formula)
        
        for element, count in matches:
            if element in ATOMIC_MASSES:
                count = int(count) if count else 1
                elements[element] = elements.get(element, 0) + count
        
        return elements
    
    def get_molecular_mass(self) -> float:
        """Tính khối lượng phân tử (g/mol)"""
        elements = self.parse_formula()
        mass = sum(ATOMIC_MASSES.get(elem, 0) * count 
                   for elem, count in elements.items())
        return round(mass, 2)
    
    def to_dict(self) -> Dict:
        return {
            'formula': self.formula,
            'coefficient': self.coefficient,
            'molecular_mass': self.get_molecular_mass(),
            'elements': self.parse_formula()
        }


class ChemicalEquation:
    """Phương trình hóa học"""
    
    def __init__(self, equation_str: str):
        """
        Args:
            equation_str: "H2 + O2 -> H2O" hoặc "2H2 + O2 = 2H2O"
        """
        self.equation_str = equation_str
        self.reactants: List[Molecule] = []
        self.products: List[Molecule] = []
        self.is_balanced = False
        
        self._parse_equation()
    
    def _parse_equation(self):
        """Phân tích phương trình"""
        # Tách reactants và products
        if '->' in self.equation_str:
            left, right = self.equation_str.split('->')
        elif '=' in self.equation_str:
            left, right = self.equation_str.split('=')
        else:
            raise ValueError("Invalid equation format")
        
        # Parse reactants
        self.reactants = self._parse_side(left.strip())
        
        # Parse products
        self.products = self._parse_side(right.strip())
    
    def _parse_side(self, side: str) -> List[Molecule]:
        """Parse một vế của phương trình"""
        molecules = []
        compounds = side.split('+')
        
        for compound in compounds:
            compound = compound.strip()
            
            # Tách hệ số và công thức
            match = re.match(r'^(\d*)\s*(.+)$', compound)
            if match:
                coef_str, formula = match.groups()
                coefficient = int(coef_str) if coef_str else 1
                molecules.append(Molecule(formula.strip(), coefficient))
        
        return molecules
    
    def check_balance(self) -> bool:
        """Kiểm tra phương trình đã cân bằng chưa"""
        # Đếm nguyên tố ở cả 2 vế
        left_elements = {}
        for mol in self.reactants:
            elements = mol.parse_formula()
            for elem, count in elements.items():
                left_elements[elem] = left_elements.get(elem, 0) + count * mol.coefficient
        
        right_elements = {}
        for mol in self.products:
            elements = mol.parse_formula()
            for elem, count in elements.items():
                right_elements[elem] = right_elements.get(elem, 0) + count * mol.coefficient
        
        self.is_balanced = left_elements == right_elements
        return self.is_balanced
    
    def balance(self) -> bool:
        """
        Cân bằng phương trình (thuật toán đơn giản)
        Lưu ý: Đây là phiên bản đơn giản, chỉ xử lý các PT cơ bản
        """
        # Thử các hệ số từ 1-10
        max_coef = 10
        
        # Lấy số lượng reactants và products
        n_reactants = len(self.reactants)
        n_products = len(self.products)
        
        # Thử tất cả các tổ hợp hệ số
        from itertools import product
        
        for coefs in product(range(1, max_coef + 1), repeat=n_reactants + n_products):
            # Gán hệ số
            for i, mol in enumerate(self.reactants):
                mol.coefficient = coefs[i]
            for i, mol in enumerate(self.products):
                mol.coefficient = coefs[n_reactants + i]
            
            # Kiểm tra cân bằng
            if self.check_balance():
                return True
        
        return False
    
    def get_equation_string(self, show_coefficients: bool = True) -> str:
        """Lấy chuỗi phương trình"""
        def format_molecule(mol: Molecule) -> str:
            if show_coefficients and mol.coefficient > 1:
                return f"{mol.coefficient}{mol.formula}"
            return mol.formula
        
        left = " + ".join(format_molecule(mol) for mol in self.reactants)
        right = " + ".join(format_molecule(mol) for mol in self.products)
        
        return f"{left} → {right}"
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        return {
            'equation': self.get_equation_string(),
            'is_balanced': self.is_balanced,
            'reactants': [mol.to_dict() for mol in self.reactants],
            'products': [mol.to_dict() for mol in self.products]
        }


class MolCalculator:
    """Tính toán mol, khối lượng, thể tích"""
    
    @staticmethod
    def mass_to_mol(mass_g: float, molecular_mass: float) -> float:
        """Chuyển khối lượng (g) sang mol: n = m/M"""
        return round(mass_g / molecular_mass, 4)
    
    @staticmethod
    def mol_to_mass(mol: float, molecular_mass: float) -> float:
        """Chuyển mol sang khối lượng (g): m = n*M"""
        return round(mol * molecular_mass, 4)
    
    @staticmethod
    def mol_to_volume(mol: float, temperature: float = 273, pressure: float = 1) -> float:
        """
        Chuyển mol sang thể tích (L) cho khí
        PV = nRT, V = nRT/P
        R = 0.082 atm.L/mol.K
        """
        R = 0.082
        volume = mol * R * temperature / pressure
        return round(volume, 4)
    
    @staticmethod
    def volume_to_mol(volume_L: float, temperature: float = 273, pressure: float = 1) -> float:
        """Chuyển thể tích (L) sang mol: n = PV/RT"""
        R = 0.082
        mol = pressure * volume_L / (R * temperature)
        return round(mol, 4)
    
    @staticmethod
    def concentration_to_mol(concentration_M: float, volume_L: float) -> float:
        """Chuyển nồng độ (M) và thể tích (L) sang mol: n = C*V"""
        return round(concentration_M * volume_L, 4)
    
    @staticmethod
    def mol_to_concentration(mol: float, volume_L: float) -> float:
        """Chuyển mol sang nồng độ (M): C = n/V"""
        return round(mol / volume_L, 4) if volume_L > 0 else 0


@dataclass
class ReactionEffect:
    """Hiệu ứng phản ứng"""
    type: str  # "color_change", "gas", "precipitate", "heat"
    description: str
    color_before: str = "#FFFFFF"
    color_after: str = "#FFFFFF"
    gas_color: str = "#CCCCCC"
    precipitate_color: str = "#FFFFFF"
    temperature_change: float = 0.0  # °C
    
    def to_dict(self) -> Dict:
        return asdict(self)


class ChemicalReaction:
    """Phản ứng hóa học với hiệu ứng trực quan"""
    
    # Database các phản ứng phổ biến
    REACTIONS_DB = {
        "hcl_naoh": {
            "name": "Axit - Bazơ: HCl + NaOH",
            "equation": "HCl + NaOH -> NaCl + H2O",
            "type": "neutralization",
            "effects": [
                ReactionEffect(
                    type="color_change",
                    description="Phenolphthalein chuyển từ hồng sang không màu",
                    color_before="#FF69B4",
                    color_after="#FFFFFF"
                ),
                ReactionEffect(
                    type="heat",
                    description="Tỏa nhiệt",
                    temperature_change=5.0
                )
            ]
        },
        "zn_hcl": {
            "name": "Kim loại + Axit: Zn + HCl",
            "equation": "Zn + 2HCl -> ZnCl2 + H2",
            "type": "redox",
            "effects": [
                ReactionEffect(
                    type="gas",
                    description="Khí H₂ bay lên (không màu)",
                    gas_color="#E0E0E0"
                ),
                ReactionEffect(
                    type="color_change",
                    description="Dung dịch không đổi màu",
                    color_before="#FFFF00",
                    color_after="#FFFF00"
                )
            ]
        },
        "cuso4_naoh": {
            "name": "Kết tủa: CuSO₄ + NaOH",
            "equation": "CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4",
            "type": "precipitation",
            "effects": [
                ReactionEffect(
                    type="precipitate",
                    description="Kết tủa xanh Cu(OH)₂",
                    color_before="#0EA5E9",
                    color_after="#0EA5E9",
                    precipitate_color="#4ADE80"
                )
            ]
        },
        "h2o2_ki": {
            "name": "Phân hủy: H₂O₂ + KI (xúc tác)",
            "equation": "2H2O2 -> 2H2O + O2",
            "type": "decomposition",
            "effects": [
                ReactionEffect(
                    type="gas",
                    description="Khí O₂ bay lên mạnh (bọt khí)",
                    gas_color="#E0F2FE"
                ),
                ReactionEffect(
                    type="color_change",
                    description="Dung dịch chuyển từ không màu sang vàng nhạt",
                    color_before="#FFFFFF",
                    color_after="#FEF3C7"
                )
            ]
        },
        "mg_o2": {
            "name": "Cháy: Mg + O₂",
            "equation": "2Mg + O2 -> 2MgO",
            "type": "combustion",
            "effects": [
                ReactionEffect(
                    type="heat",
                    description="Cháy sáng chói, nhiệt độ rất cao",
                    temperature_change=2000.0
                ),
                ReactionEffect(
                    type="color_change",
                    description="Kim loại Mg trắng → MgO trắng",
                    color_before="#D1D5DB",
                    color_after="#FFFFFF"
                )
            ]
        },
        "agno3_nacl": {
            "name": "Kết tủa trắng: AgNO₃ + NaCl",
            "equation": "AgNO3 + NaCl -> AgCl + NaNO3",
            "type": "precipitation",
            "effects": [
                ReactionEffect(
                    type="precipitate",
                    description="Kết tủa trắng AgCl",
                    color_before="#FFFFFF",
                    color_after="#FFFFFF",
                    precipitate_color="#F9FAFB"
                )
            ]
        },
        "fe_cuso4": {
            "name": "Thế kim loại: Fe + CuSO₄",
            "equation": "Fe + CuSO4 -> FeSO4 + Cu",
            "type": "displacement",
            "effects": [
                ReactionEffect(
                    type="color_change",
                    description="Dung dịch từ xanh → xanh nhạt",
                    color_before="#0EA5E9",
                    color_after="#BAE6FD"
                ),
                ReactionEffect(
                    type="precipitate",
                    description="Cu đỏ bám trên Fe",
                    precipitate_color="#DC2626"
                )
            ]
        }
    }
    
    @classmethod
    def get_reaction(cls, reaction_id: str) -> Optional[Dict]:
        """Lấy thông tin phản ứng"""
        if reaction_id not in cls.REACTIONS_DB:
            return None
        
        reaction = cls.REACTIONS_DB[reaction_id].copy()
        
        # Parse equation
        eq = ChemicalEquation(reaction['equation'])
        eq.check_balance()
        
        reaction['equation_data'] = eq.to_dict()
        reaction['effects'] = [eff.to_dict() for eff in reaction['effects']]
        
        return reaction
    
    @classmethod
    def list_reactions(cls) -> List[Dict]:
        """Liệt kê tất cả phản ứng"""
        reactions = []
        for reaction_id, data in cls.REACTIONS_DB.items():
            reactions.append({
                'id': reaction_id,
                'name': data['name'],
                'type': data['type'],
                'equation': data['equation']
            })
        return reactions
    
    @classmethod
    def simulate_reaction(cls, reaction_id: str, 
                         reactant_amounts: Dict[str, float]) -> Dict:
        """
        Mô phỏng phản ứng với lượng chất cụ thể
        
        Args:
            reaction_id: ID phản ứng
            reactant_amounts: {"HCl": 0.1, "NaOH": 0.1} (mol)
        """
        reaction = cls.get_reaction(reaction_id)
        if not reaction:
            return {"error": "Reaction not found"}
        
        eq = ChemicalEquation(reaction['equation'])
        eq.check_balance()
        
        # Tính chất dư/hết
        # Tìm chất hạn chế
        limiting_reactant = None
        min_ratio = float('inf')
        
        for mol in eq.reactants:
            if mol.formula in reactant_amounts:
                amount = reactant_amounts[mol.formula]
                ratio = amount / mol.coefficient
                if ratio < min_ratio:
                    min_ratio = ratio
                    limiting_reactant = mol.formula
        
        # Tính sản phẩm
        products_formed = {}
        for mol in eq.products:
            amount = min_ratio * mol.coefficient
            products_formed[mol.formula] = round(amount, 4)
        
        # Tính chất dư
        reactants_remaining = {}
        for mol in eq.reactants:
            if mol.formula in reactant_amounts:
                used = min_ratio * mol.coefficient
                remaining = reactant_amounts[mol.formula] - used
                reactants_remaining[mol.formula] = round(remaining, 4)
        
        return {
            'reaction': reaction,
            'limiting_reactant': limiting_reactant,
            'products_formed': products_formed,
            'reactants_remaining': reactants_remaining,
            'reaction_extent': round(min_ratio, 4)
        }


# Test functions
if __name__ == "__main__":
    print("=== PHÒNG THÍ NGHIỆM HÓA HỌC ẢO ===\n")
    
    # Test 1: Cân bằng phương trình
    print("1. Cân bằng phương trình:")
    eq = ChemicalEquation("H2 + O2 -> H2O")
    print(f"   PT ban đầu: {eq.get_equation_string(False)}")
    eq.balance()
    print(f"   PT cân bằng: {eq.get_equation_string()}")
    print(f"   Đã cân bằng: {eq.is_balanced}\n")
    
    # Test 2: Tính mol
    print("2. Tính toán mol:")
    calc = MolCalculator()
    mass = 36
    M = 18  # H2O
    mol = calc.mass_to_mol(mass, M)
    print(f"   {mass}g H₂O = {mol} mol")
    volume = calc.mol_to_volume(mol)
    print(f"   {mol} mol khí (đktc) = {volume} L\n")
    
    # Test 3: Phản ứng có hiệu ứng
    print("3. Phản ứng với hiệu ứng:")
    reaction = ChemicalReaction.get_reaction("zn_hcl")
    print(f"   Tên: {reaction['name']}")
    print(f"   PT: {reaction['equation']}")
    print(f"   Hiệu ứng:")
    for eff in reaction['effects']:
        print(f"      - {eff['description']}")


