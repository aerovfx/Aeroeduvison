"""
Download and manage pretrained OCR models
"""

import os
import requests
from tqdm import tqdm
import argparse


PRETRAINED_MODELS = {
    'crnn_english': {
        'url': 'https://example.com/models/crnn_english.pth',  # Placeholder
        'filename': 'crnn_english.pth',
        'dir': 'pretrained_models/crnn/',
        'description': 'CRNN pretrained on English text'
    },
    'crnn_vietnamese': {
        'url': 'https://example.com/models/crnn_vietnamese.pth',  # Placeholder
        'filename': 'crnn_vietnamese.pth',
        'dir': 'pretrained_models/crnn/',
        'description': 'CRNN pretrained on Vietnamese text'
    },
    'trocr_base': {
        'url': 'microsoft/trocr-base-handwritten',  # Hugging Face model
        'filename': 'trocr_base',
        'dir': 'pretrained_models/transformer/',
        'description': 'Microsoft TrOCR base model for handwriting'
    }
}


def download_file(url: str, save_path: str):
    """Download file with progress bar"""
    print(f"Downloading from: {url}")
    print(f"Saving to: {save_path}")
    
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    with open(save_path, 'wb') as f:
        with tqdm(total=total_size, unit='B', unit_scale=True) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    pbar.update(len(chunk))
    
    print(f"✅ Downloaded successfully!")


def download_huggingface_model(model_name: str, save_dir: str):
    """Download model from Hugging Face"""
    print(f"Downloading {model_name} from Hugging Face...")
    
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        
        # Download processor and model
        processor = TrOCRProcessor.from_pretrained(model_name)
        model = VisionEncoderDecoderModel.from_pretrained(model_name)
        
        # Save locally
        os.makedirs(save_dir, exist_ok=True)
        processor.save_pretrained(save_dir)
        model.save_pretrained(save_dir)
        
        print(f"✅ Model saved to {save_dir}")
        
    except Exception as e:
        print(f"❌ Error downloading from Hugging Face: {e}")
        print("Install transformers: pip install transformers")


def download_model(model_name: str):
    """Download specific pretrained model"""
    
    if model_name not in PRETRAINED_MODELS:
        print(f"❌ Unknown model: {model_name}")
        print(f"Available models: {', '.join(PRETRAINED_MODELS.keys())}")
        return
    
    model_info = PRETRAINED_MODELS[model_name]
    save_path = os.path.join(model_info['dir'], model_info['filename'])
    
    print(f"\n{model_info['description']}")
    print(f"Model: {model_name}")
    
    # Check if already exists
    if os.path.exists(save_path):
        print(f"⚠️  Model already exists: {save_path}")
        response = input("Overwrite? (y/n): ")
        if response.lower() != 'y':
            print("Skipped.")
            return
    
    # Download based on source
    if 'huggingface' in model_info['url'] or '/' in model_info['url']:
        # Hugging Face model
        download_huggingface_model(model_info['url'], save_path)
    else:
        # Direct download
        download_file(model_info['url'], save_path)


def list_models():
    """List available pretrained models"""
    print("\n📦 Available Pretrained Models:")
    print("=" * 70)
    
    for name, info in PRETRAINED_MODELS.items():
        status = "✅" if os.path.exists(os.path.join(info['dir'], info['filename'])) else "⬜"
        print(f"{status} {name}")
        print(f"   Description: {info['description']}")
        print(f"   Path: {info['dir']}{info['filename']}")
        print()


def create_demo_model():
    """Create a small demo model for testing"""
    import torch
    from models.crnn_architecture import create_crnn_model, VIETNAMESE_ALPHABET
    
    print("\n🎯 Creating demo CRNN model...")
    
    # Create model
    model = create_crnn_model(
        img_height=32,
        alphabet=VIETNAMESE_ALPHABET
    )
    
    # Save with random weights (for testing structure)
    save_path = 'pretrained_models/demo/crnn_demo.pth'
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    torch.save({
        'model_state_dict': model.state_dict(),
        'alphabet': VIETNAMESE_ALPHABET,
        'config': {
            'img_height': 32,
            'num_classes': len(VIETNAMESE_ALPHABET) + 1
        }
    }, save_path)
    
    print(f"✅ Demo model created: {save_path}")
    print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(f"   Size: {os.path.getsize(save_path) / 1024 / 1024:.1f} MB")
    print("\n⚠️  Note: This is untrained! Use for testing structure only.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Download pretrained OCR models')
    parser.add_argument('--model', type=str, help='Model name to download')
    parser.add_argument('--list', action='store_true', help='List available models')
    parser.add_argument('--create-demo', action='store_true', help='Create demo model')
    
    args = parser.parse_args()
    
    print("╔══════════════════════════════════════════════════════════╗")
    print("║         📦 OCR MODEL MANAGER                            ║")
    print("╚══════════════════════════════════════════════════════════╝")
    
    if args.list:
        list_models()
    elif args.create_demo:
        create_demo_model()
    elif args.model:
        download_model(args.model)
    else:
        print("\nUsage:")
        print("  python download_models.py --list")
        print("  python download_models.py --model crnn_english")
        print("  python download_models.py --create-demo")
        print("\nFor custom models:")
        print("  Place your crnn.onnx in: pretrained_models/crnn/")
        print("  Or: pretrained_models/crnn/your_model_name.onnx")

