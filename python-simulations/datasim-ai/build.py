"""
Build script for DataSim.AI
Generates sample ML training data for Next.js integration
"""

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from main import train_and_evaluate


def build():
    """Generate static ML training data"""
    
    print("🤖 Building DataSim.AI...")
    
    samples = []
    
    # 1. Linear Regression
    print("\n1. Training Linear Regression...")
    linear_result = train_and_evaluate({
        'dataset_type': 'linear',
        'model_type': 'linear_regression',
        'n_samples': 100,
        'noise': 1.0
    })
    samples.append({
        'id': 'linear_regression_demo',
        'name': 'Linear Regression Demo',
        'data': linear_result
    })
    print(f"   ✅ R² Score: {linear_result['test_score']:.3f}")
    
    # 2. Logistic Regression
    print("\n2. Training Logistic Regression...")
    logistic_result = train_and_evaluate({
        'dataset_type': 'classification_2d',
        'model_type': 'logistic_regression',
        'n_samples': 200,
        'n_classes': 2
    })
    samples.append({
        'id': 'logistic_demo',
        'name': 'Logistic Regression Demo',
        'data': logistic_result
    })
    print(f"   ✅ Accuracy: {logistic_result['test_score']:.3f}")
    
    # 3. KNN
    print("\n3. Training K-Nearest Neighbors...")
    knn_result = train_and_evaluate({
        'dataset_type': 'circles',
        'model_type': 'knn',
        'n_samples': 200,
        'model_params': {'n_neighbors': 5}
    })
    samples.append({
        'id': 'knn_demo',
        'name': 'KNN Demo',
        'data': knn_result
    })
    print(f"   ✅ Accuracy: {knn_result['test_score']:.3f}")
    
    # 4. Decision Tree
    print("\n4. Training Decision Tree...")
    tree_result = train_and_evaluate({
        'dataset_type': 'moons',
        'model_type': 'decision_tree',
        'n_samples': 200,
        'model_params': {'max_depth': 5}
    })
    samples.append({
        'id': 'tree_demo',
        'name': 'Decision Tree Demo',
        'data': tree_result
    })
    print(f"   ✅ Accuracy: {tree_result['test_score']:.3f}")
    
    # Prepare output
    output = {
        'metadata': {
            'name': 'DataSim.AI',
            'version': '1.0.0',
            'description': 'Machine Learning Training Visualization System'
        },
        'samples': samples,
        'datasets': [
            {'id': 'linear', 'name': 'Linear', 'type': 'regression'},
            {'id': 'polynomial', 'name': 'Polynomial', 'type': 'regression'},
            {'id': 'classification_2d', 'name': '2D Classification', 'type': 'classification'},
            {'id': 'circles', 'name': 'Circles', 'type': 'classification'},
            {'id': 'moons', 'name': 'Moons', 'type': 'classification'}
        ],
        'models': [
            {'id': 'linear_regression', 'name': 'Linear Regression', 'type': 'regression'},
            {'id': 'logistic_regression', 'name': 'Logistic Regression', 'type': 'classification'},
            {'id': 'knn', 'name': 'K-Nearest Neighbors', 'type': 'classification'},
            {'id': 'decision_tree', 'name': 'Decision Tree', 'type': 'classification'},
            {'id': 'svm', 'name': 'SVM', 'type': 'classification'},
            {'id': 'neural_network', 'name': 'Neural Network', 'type': 'classification'}
        ]
    }
    
    # Save to output directory
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    
    output_file = output_dir / 'data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Build complete! Output saved to {output_file}")
    print(f"📊 Generated {len(samples)} sample trainings")


if __name__ == "__main__":
    build()


