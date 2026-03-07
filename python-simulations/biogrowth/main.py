"""
BioGrowth - Phòng thí nghiệm Sinh học Tăng trưởng
- Tăng trưởng exponential & logistic
- Mô phỏng vi khuẩn, tế bào
- Giải phương trình với SciPy
- AI dự đoán biến thể gen
"""

import numpy as np
from scipy.integrate import odeint, solve_ivp
from scipy.optimize import curve_fit
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import random
import json

@dataclass
class GrowthState:
    """Trạng thái tăng trưởng tại một thời điểm"""
    t: float              # Thời gian (giờ)
    population: float     # Số lượng quần thể
    growth_rate: float    # Tốc độ tăng trưởng
    
    def to_dict(self) -> Dict:
        return {
            't': round(self.t, 4),
            'population': round(self.population, 2),
            'growth_rate': round(self.growth_rate, 6)
        }


class ExponentialGrowth:
    """Tăng trưởng exponential: dN/dt = rN"""
    
    def __init__(self, N0: float = 100, r: float = 0.5):
        """
        Args:
            N0: Quần thể ban đầu
            r: Tốc độ tăng trưởng (1/h)
        """
        self.N0 = N0
        self.r = r
    
    def population(self, t: float) -> float:
        """N(t) = N0 × e^(rt)"""
        return self.N0 * np.exp(self.r * t)
    
    def doubling_time(self) -> float:
        """Thời gian nhân đôi: T_d = ln(2) / r"""
        return np.log(2) / self.r if self.r > 0 else float('inf')
    
    def simulate(self, t_max: float = 10, num_points: int = 100) -> List[GrowthState]:
        """Mô phỏng tăng trưởng"""
        t_values = np.linspace(0, t_max, num_points)
        states = []
        
        for t in t_values:
            N = self.population(t)
            growth_rate = self.r * N  # dN/dt = rN
            states.append(GrowthState(t, N, growth_rate))
        
        return states
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        states = self.simulate()
        
        return {
            'type': 'exponential',
            'parameters': {
                'N0': self.N0,
                'r': self.r,
                'doubling_time': round(self.doubling_time(), 4)
            },
            'trajectory': [s.to_dict() for s in states]
        }


class LogisticGrowth:
    """Tăng trưởng logistic: dN/dt = rN(1 - N/K)"""
    
    def __init__(self, N0: float = 100, r: float = 0.5, K: float = 10000):
        """
        Args:
            N0: Quần thể ban đầu
            r: Tốc độ tăng trưởng tối đa
            K: Carrying capacity (sức chứa môi trường)
        """
        self.N0 = N0
        self.r = r
        self.K = K
    
    def _logistic_ode(self, N, t):
        """Phương trình vi phân: dN/dt = rN(1 - N/K)"""
        return self.r * N * (1 - N / self.K)
    
    def population_analytical(self, t: float) -> float:
        """
        Nghiệm giải tích: N(t) = K / (1 + ((K-N0)/N0) × e^(-rt))
        """
        return self.K / (1 + ((self.K - self.N0) / self.N0) * np.exp(-self.r * t))
    
    def simulate_ode(self, t_max: float = 50, num_points: int = 200) -> List[GrowthState]:
        """Mô phỏng bằng SciPy ODE solver"""
        t_values = np.linspace(0, t_max, num_points)
        
        # Giải ODE với odeint
        N_values = odeint(self._logistic_ode, self.N0, t_values)
        
        states = []
        for i, t in enumerate(t_values):
            N = N_values[i][0]
            growth_rate = self.r * N * (1 - N / self.K)
            states.append(GrowthState(t, N, growth_rate))
        
        return states
    
    def inflection_point(self) -> Tuple[float, float]:
        """
        Điểm uốn (growth rate max): t* = ln((K-N0)/N0) / r, N* = K/2
        """
        if self.N0 >= self.K:
            return 0, self.N0
        
        t_inflection = np.log((self.K - self.N0) / self.N0) / self.r
        N_inflection = self.K / 2
        
        return t_inflection, N_inflection
    
    def to_dict(self) -> Dict:
        """Chuyển thành dictionary"""
        states = self.simulate_ode()
        t_inf, N_inf = self.inflection_point()
        
        return {
            'type': 'logistic',
            'parameters': {
                'N0': self.N0,
                'r': self.r,
                'K': self.K
            },
            'characteristics': {
                'inflection_point': {
                    't': round(t_inf, 4),
                    'N': round(N_inf, 2)
                },
                'max_growth_rate': round(self.r * self.K / 4, 4)
            },
            'trajectory': [s.to_dict() for s in states]
        }


class BacterialCulture:
    """Mô phỏng nuôi cấy vi khuẩn"""
    
    GROWTH_PHASES = {
        'lag': {'description': 'Giai đoạn tiềm tàng', 'color': '#FCD34D'},
        'exponential': {'description': 'Tăng trưởng exponential', 'color': '#10B981'},
        'stationary': {'description': 'Ổn định', 'color': '#3B82F6'},
        'death': {'description': 'Chết', 'color': '#EF4444'}
    }
    
    def __init__(self, N0: float = 100, r_max: float = 0.7, K: float = 1e8,
                 lag_time: float = 2, death_rate: float = 0.1):
        """
        Args:
            N0: Số vi khuẩn ban đầu
            r_max: Tốc độ tăng trưởng max (exponential phase)
            K: Carrying capacity
            lag_time: Thời gian lag phase (giờ)
            death_rate: Tốc độ chết (death phase)
        """
        self.N0 = N0
        self.r_max = r_max
        self.K = K
        self.lag_time = lag_time
        self.death_rate = death_rate
    
    def _bacterial_ode(self, t, N):
        """Phương trình vi phân cho các phase"""
        if t < self.lag_time:
            # Lag phase: tăng trưởng rất chậm
            return 0.05 * self.r_max * N
        
        elif N < 0.95 * self.K:
            # Exponential/Log phase
            return self.r_max * N * (1 - N / self.K)
        
        elif N < self.K:
            # Stationary phase
            return 0
        
        else:
            # Death phase
            return -self.death_rate * N
    
    def simulate(self, t_max: float = 48, num_points: int = 200) -> Dict:
        """Mô phỏng đầy đủ các phase"""
        t_span = (0, t_max)
        t_eval = np.linspace(0, t_max, num_points)
        
        # Solve IVP (Initial Value Problem) với SciPy
        solution = solve_ivp(
            self._bacterial_ode,
            t_span,
            [self.N0],
            t_eval=t_eval,
            method='RK45'  # Runge-Kutta 4-5
        )
        
        states = []
        phases = []
        
        for i, t in enumerate(solution.t):
            N = solution.y[0][i]
            
            # Xác định phase
            if t < self.lag_time:
                phase = 'lag'
            elif N < 0.95 * self.K:
                phase = 'exponential'
            elif N < self.K * 1.01:
                phase = 'stationary'
            else:
                phase = 'death'
            
            states.append({
                't': round(t, 4),
                'population': round(N, 2),
                'phase': phase
            })
            
            if not phases or phases[-1] != phase:
                phases.append(phase)
        
        return {
            'type': 'bacterial_culture',
            'parameters': {
                'N0': self.N0,
                'r_max': self.r_max,
                'K': self.K,
                'lag_time': self.lag_time
            },
            'phases': phases,
            'trajectory': states
        }


class CellDivision:
    """Mô phỏng phân chia tế bào"""
    
    def __init__(self, initial_cells: int = 1, division_time: float = 1.0,
                 max_generations: int = 10):
        """
        Args:
            initial_cells: Số tế bào ban đầu
            division_time: Thời gian một chu kỳ phân chia (giờ)
            max_generations: Số thế hệ tối đa
        """
        self.initial_cells = initial_cells
        self.division_time = division_time
        self.max_generations = max_generations
    
    def simulate(self) -> Dict:
        """Mô phỏng phân chia nhị phân"""
        timeline = []
        
        for gen in range(self.max_generations + 1):
            t = gen * self.division_time
            num_cells = self.initial_cells * (2 ** gen)
            
            timeline.append({
                'generation': gen,
                't': round(t, 4),
                'num_cells': num_cells,
                'total_divisions': num_cells - self.initial_cells
            })
        
        return {
            'type': 'cell_division',
            'parameters': {
                'initial_cells': self.initial_cells,
                'division_time': self.division_time,
                'max_generations': self.max_generations
            },
            'timeline': timeline
        }


class GeneticMutationPredictor:
    """AI dự đoán biến thể gen (đơn giản với probability)"""
    
    DNA_BASES = ['A', 'T', 'G', 'C']
    
    def __init__(self, mutation_rate: float = 1e-6):
        """
        Args:
            mutation_rate: Tỷ lệ đột biến (mutations per base per generation)
        """
        self.mutation_rate = mutation_rate
    
    def generate_sequence(self, length: int = 100) -> str:
        """Tạo DNA sequence ngẫu nhiên"""
        return ''.join(random.choice(self.DNA_BASES) for _ in range(length))
    
    def mutate(self, sequence: str) -> Tuple[str, List[Dict]]:
        """Áp dụng đột biến vào sequence"""
        mutated = list(sequence)
        mutations = []
        
        for i in range(len(sequence)):
            if random.random() < self.mutation_rate:
                original = sequence[i]
                # Chọn base khác
                new_base = random.choice([b for b in self.DNA_BASES if b != original])
                mutated[i] = new_base
                
                mutations.append({
                    'position': i,
                    'original': original,
                    'mutated': new_base,
                    'type': 'substitution'
                })
        
        return ''.join(mutated), mutations
    
    def predict_mutations(self, sequence: str, generations: int = 10) -> Dict:
        """Dự đoán đột biến qua nhiều thế hệ"""
        current_seq = sequence
        history = [{
            'generation': 0,
            'sequence': current_seq,
            'mutations': [],
            'mutation_count': 0
        }]
        
        for gen in range(1, generations + 1):
            current_seq, mutations = self.mutate(current_seq)
            
            history.append({
                'generation': gen,
                'sequence': current_seq,
                'mutations': mutations,
                'mutation_count': len(mutations)
            })
        
        # Tính statistics
        total_mutations = sum(h['mutation_count'] for h in history)
        avg_mutations_per_gen = total_mutations / generations if generations > 0 else 0
        
        return {
            'original_sequence': sequence,
            'sequence_length': len(sequence),
            'generations': generations,
            'mutation_rate': self.mutation_rate,
            'statistics': {
                'total_mutations': total_mutations,
                'avg_mutations_per_generation': round(avg_mutations_per_gen, 4),
                'expected_mutations': round(len(sequence) * self.mutation_rate * generations, 4)
            },
            'history': history
        }
    
    def analyze_mutations(self, original: str, mutated: str) -> Dict:
        """Phân tích sự khác biệt giữa 2 sequences"""
        if len(original) != len(mutated):
            return {'error': 'Sequences must have same length'}
        
        differences = []
        for i in range(len(original)):
            if original[i] != mutated[i]:
                differences.append({
                    'position': i,
                    'original': original[i],
                    'mutated': mutated[i]
                })
        
        similarity = 1 - len(differences) / len(original)
        
        return {
            'total_bases': len(original),
            'mutations': len(differences),
            'similarity': round(similarity, 6),
            'differences': differences
        }


class GrowthCurveFitter:
    """Fit dữ liệu thực nghiệm vào mô hình tăng trưởng"""
    
    @staticmethod
    def fit_exponential(t_data: np.ndarray, N_data: np.ndarray) -> Dict:
        """Fit exponential: N = N0 × e^(rt)"""
        def exp_func(t, N0, r):
            return N0 * np.exp(r * t)
        
        try:
            params, cov = curve_fit(exp_func, t_data, N_data, p0=[N_data[0], 0.1])
            N0_fit, r_fit = params
            
            # Tính R²
            N_pred = exp_func(t_data, *params)
            ss_res = np.sum((N_data - N_pred) ** 2)
            ss_tot = np.sum((N_data - np.mean(N_data)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
            
            return {
                'model': 'exponential',
                'parameters': {
                    'N0': round(N0_fit, 4),
                    'r': round(r_fit, 4)
                },
                'metrics': {
                    'r_squared': round(r_squared, 4)
                }
            }
        except Exception as e:
            return {'error': str(e)}
    
    @staticmethod
    def fit_logistic(t_data: np.ndarray, N_data: np.ndarray) -> Dict:
        """Fit logistic: N = K / (1 + ((K-N0)/N0) × e^(-rt))"""
        def logistic_func(t, N0, r, K):
            return K / (1 + ((K - N0) / N0) * np.exp(-r * t))
        
        try:
            # Initial guess
            K_guess = np.max(N_data) * 1.2
            params, cov = curve_fit(
                logistic_func, t_data, N_data,
                p0=[N_data[0], 0.1, K_guess],
                maxfev=10000
            )
            N0_fit, r_fit, K_fit = params
            
            # R²
            N_pred = logistic_func(t_data, *params)
            ss_res = np.sum((N_data - N_pred) ** 2)
            ss_tot = np.sum((N_data - np.mean(N_data)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
            
            return {
                'model': 'logistic',
                'parameters': {
                    'N0': round(N0_fit, 4),
                    'r': round(r_fit, 4),
                    'K': round(K_fit, 4)
                },
                'metrics': {
                    'r_squared': round(r_squared, 4)
                }
            }
        except Exception as e:
            return {'error': str(e)}


# Test
if __name__ == "__main__":
    print("=== BIOGROWTH - SINH HỌC TĂNG TRƯỞNG ===\n")
    
    # Test 1: Exponential
    print("1. Exponential Growth:")
    exp = ExponentialGrowth(N0=100, r=0.5)
    print(f"   N0={exp.N0}, r={exp.r}")
    print(f"   Doubling time: {exp.doubling_time():.2f}h")
    print(f"   N(10h) = {exp.population(10):.0f}\n")
    
    # Test 2: Logistic
    print("2. Logistic Growth:")
    log = LogisticGrowth(N0=100, r=0.5, K=10000)
    t_inf, N_inf = log.inflection_point()
    print(f"   K={log.K}")
    print(f"   Inflection: t={t_inf:.2f}h, N={N_inf:.0f}\n")
    
    # Test 3: Bacterial
    print("3. Bacterial Culture:")
    bac = BacterialCulture(N0=100, r_max=0.7, K=1e8)
    result = bac.simulate(t_max=24, num_points=50)
    print(f"   Phases: {result['phases']}\n")
    
    # Test 4: Gene Mutation
    print("4. Genetic Mutations:")
    gene = GeneticMutationPredictor(mutation_rate=0.01)
    seq = gene.generate_sequence(20)
    result = gene.predict_mutations(seq, generations=5)
    print(f"   Sequence: {seq}")
    print(f"   Total mutations: {result['statistics']['total_mutations']}")
    print(f"   Avg per gen: {result['statistics']['avg_mutations_per_generation']}")




