"""Build BioGrowth data"""
import json, os
from main import *

print("🧬 Building BioGrowth...")

data = {
    "simulation_type": "biogrowth",
    "version": "1.0.0",
    "data": {
        "exponential": ExponentialGrowth(N0=100, r=0.5).to_dict(),
        "logistic": LogisticGrowth(N0=100, r=0.5, K=10000).to_dict(),
        "bacterial": BacterialCulture(N0=100, r_max=0.7, K=1e8).simulate(24),
        "cell_division": CellDivision(1, 1.0, 10).simulate()
    }
}

os.makedirs("output", exist_ok=True)
with open("output/data.json", "w") as f:
    json.dump(data, f, indent=2)

print("✅ Build complete!")



