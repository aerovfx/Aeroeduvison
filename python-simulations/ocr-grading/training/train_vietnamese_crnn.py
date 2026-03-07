"""
Complete Training Pipeline for Vietnamese Handwriting CRNN
Based on the notebook workflow with improvements
"""

import os
import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np
from tqdm import tqdm
import argparse
import json
from datetime import datetime

# Add parent directory to path
sys.path.append('..')

from vietnamese_vocab import VietnameseVocab
from dataset_loader import (
    load_from_zip, 
    load_from_folder, 
    load_from_huggingface,
    VietnameseHandwritingDataset,
    collate_fn
)
from models.crnn_architecture import CRNN


class CRNNTrainer:
    """Complete CRNN training pipeline"""
    
    def __init__(self, 
                 model: nn.Module,
                 vocab: VietnameseVocab,
                 device='cuda' if torch.cuda.is_available() else 'cpu'):
        """
        Initialize trainer
        
        Args:
            model: CRNN model
            vocab: Vietnamese vocabulary
            device: 'cuda' or 'cpu'
        """
        self.model = model.to(device)
        self.vocab = vocab
        self.device = device
        self.criterion = nn.CTCLoss(blank=0, reduction='mean', zero_infinity=True)
        
        print(f"✅ Trainer initialized on {device}")
        print(f"✅ Vocabulary size: {vocab.vocab_size}")
    
    def train_epoch(self, dataloader, optimizer, epoch):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0
        
        pbar = tqdm(dataloader, desc=f'Epoch {epoch}')
        for batch_idx, (images, targets, target_lengths) in enumerate(pbar):
            # Move to device
            images = images.to(self.device)
            targets = targets.to(self.device)
            
            # Forward pass
            outputs = self.model(images)  # (seq_len, batch, num_classes)
            
            # Calculate input lengths (sequence length for each sample)
            batch_size = images.size(0)
            input_lengths = torch.full(
                (batch_size,), 
                outputs.size(0), 
                dtype=torch.long,
                device=self.device
            )
            
            # CTC Loss
            # outputs: (T, N, C) where T=seq_len, N=batch, C=num_classes
            # targets: (sum of target lengths)
            # input_lengths: (N)
            # target_lengths: (N)
            loss = self.criterion(
                outputs.log_softmax(2),
                targets,
                input_lengths,
                target_lengths
            )
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 5.0)
            
            optimizer.step()
            
            total_loss += loss.item()
            pbar.set_postfix({'loss': f'{loss.item():.4f}'})
        
        avg_loss = total_loss / len(dataloader)
        return avg_loss
    
    def validate(self, dataloader):
        """Validate model"""
        self.model.eval()
        total_loss = 0
        correct_chars = 0
        total_chars = 0
        exact_match = 0
        total_samples = 0
        
        with torch.no_grad():
            for images, targets, target_lengths in tqdm(dataloader, desc='Validation'):
                images = images.to(self.device)
                targets = targets.to(self.device)
                
                # Forward pass
                outputs = self.model(images)
                
                # Calculate loss
                batch_size = images.size(0)
                input_lengths = torch.full(
                    (batch_size,), 
                    outputs.size(0),
                    dtype=torch.long,
                    device=self.device
                )
                
                loss = self.criterion(
                    outputs.log_softmax(2),
                    targets,
                    input_lengths,
                    target_lengths
                )
                total_loss += loss.item()
                
                # Decode predictions
                _, preds = outputs.max(2)  # (seq_len, batch)
                preds = preds.transpose(1, 0).cpu().numpy()  # (batch, seq_len)
                
                # Calculate accuracy
                target_offset = 0
                for i in range(batch_size):
                    # Get prediction
                    pred = preds[i]
                    
                    # CTC decode (remove duplicates and blanks)
                    decoded_pred = []
                    prev_idx = -1
                    for idx in pred:
                        if idx != 0 and idx != prev_idx:
                            decoded_pred.append(idx)
                        prev_idx = idx
                    
                    # Get ground truth
                    target_len = target_lengths[i].item()
                    target_indices = targets[target_offset:target_offset + target_len].cpu().numpy()
                    target_offset += target_len
                    
                    # Calculate metrics
                    pred_text = self.vocab.decode(decoded_pred)
                    gt_text = self.vocab.decode(target_indices.tolist())
                    
                    # Character accuracy
                    for p, t in zip(decoded_pred, target_indices):
                        if p == t:
                            correct_chars += 1
                        total_chars += 1
                    
                    # Exact match
                    if pred_text == gt_text:
                        exact_match += 1
                    total_samples += 1
        
        avg_loss = total_loss / len(dataloader)
        char_accuracy = correct_chars / total_chars if total_chars > 0 else 0
        exact_accuracy = exact_match / total_samples if total_samples > 0 else 0
        
        return avg_loss, char_accuracy, exact_accuracy
    
    def export_to_onnx(self, onnx_path: str, img_height=32, img_width=128):
        """
        Export model to ONNX format
        
        Args:
            onnx_path: Path to save ONNX model
            img_height: Input image height
            img_width: Input image width
        """
        self.model.eval()
        
        # Create dummy input
        dummy_input = torch.randn(1, 1, img_height, img_width).to(self.device)
        
        # Export
        torch.onnx.export(
            self.model,
            dummy_input,
            onnx_path,
            export_params=True,
            opset_version=13,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'output': {0: 'seq_len', 1: 'batch_size'}
            }
        )
        
        # Verify
        if os.path.exists(onnx_path):
            size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
            print(f"✅ Exported to ONNX: {onnx_path} ({size_mb:.2f} MB)")
        else:
            print(f"❌ ONNX export failed")


def main(args):
    """Main training function"""
    
    print("╔══════════════════════════════════════════════════════════╗")
    print("║   🎓 VIETNAMESE HANDWRITING CRNN TRAINING               ║")
    print("╚══════════════════════════════════════════════════════════╝\n")
    
    # Setup device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"🔧 Device: {device}")
    
    # Initialize vocabulary
    print("\n📚 Initializing Vietnamese vocabulary...")
    vocab = VietnameseVocab()
    
    # Load dataset
    print(f"\n📦 Loading dataset from: {args.dataset}")
    
    if args.dataset.endswith('.zip'):
        # Load from ZIP
        train_images, train_labels, val_images, val_labels = load_from_zip(
            args.dataset,
            extract_dir=args.extract_dir
        )
    elif args.huggingface:
        # Load from Hugging Face
        train_images, train_labels, val_images, val_labels = load_from_huggingface(
            args.huggingface
        )
    else:
        # Load from folder
        train_images, train_labels = load_from_folder(
            os.path.join(args.dataset, 'train')
        )
        val_images, val_labels = load_from_folder(
            os.path.join(args.dataset, 'val')
        )
    
    print(f"📊 Dataset loaded:")
    print(f"   Train: {len(train_images)} samples")
    print(f"   Val: {len(val_images)} samples")
    
    # Create datasets
    train_dataset = VietnameseHandwritingDataset(
        train_images, train_labels, vocab,
        img_height=args.img_height,
        img_width=args.img_width,
        augment=True
    )
    
    val_dataset = VietnameseHandwritingDataset(
        val_images, val_labels, vocab,
        img_height=args.img_height,
        img_width=args.img_width,
        augment=False
    )
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        collate_fn=collate_fn
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        collate_fn=collate_fn
    )
    
    # Create model
    print(f"\n🏗️  Creating CRNN model...")
    model = CRNN(
        img_height=args.img_height,
        num_chars=vocab.vocab_size,
        rnn_hidden=args.rnn_hidden,
        dropout=args.dropout
    )
    
    print(f"✅ Model created:")
    print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(f"   Size: ~{sum(p.numel() for p in model.parameters()) * 4 / 1024 / 1024:.1f} MB")
    
    # Initialize trainer
    trainer = CRNNTrainer(model, vocab, device=device)
    
    # Setup optimizer and scheduler
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, 
        mode='min', 
        factor=0.5, 
        patience=5,
        verbose=True
    )
    
    # Training loop
    print(f"\n🚀 Starting training for {args.epochs} epochs...\n")
    print("=" * 60)
    
    best_val_loss = float('inf')
    best_char_accuracy = 0
    history = {
        'train_loss': [],
        'val_loss': [],
        'char_accuracy': [],
        'exact_accuracy': []
    }
    
    for epoch in range(1, args.epochs + 1):
        print(f"\nEpoch {epoch}/{args.epochs}")
        print("-" * 60)
        
        # Train
        train_loss = trainer.train_epoch(train_loader, optimizer, epoch)
        history['train_loss'].append(train_loss)
        print(f"📈 Train Loss: {train_loss:.4f}")
        
        # Validate
        val_loss, char_acc, exact_acc = trainer.validate(val_loader)
        history['val_loss'].append(val_loss)
        history['char_accuracy'].append(char_acc)
        history['exact_accuracy'].append(exact_acc)
        
        print(f"📉 Val Loss: {val_loss:.4f}")
        print(f"✅ Character Accuracy: {char_acc * 100:.2f}%")
        print(f"✅ Exact Match Accuracy: {exact_acc * 100:.2f}%")
        
        # Learning rate scheduling
        scheduler.step(val_loss)
        current_lr = optimizer.param_groups[0]['lr']
        print(f"📊 Learning Rate: {current_lr:.6f}")
        
        # Save best model
        if char_acc > best_char_accuracy:
            best_char_accuracy = char_acc
            best_val_loss = val_loss
            
            checkpoint_path = os.path.join(args.save_dir, 'best_vietnamese_crnn_model.pth')
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'char_accuracy': char_acc,
                'exact_accuracy': exact_acc,
                'vocab': vocab,
                'config': {
                    'img_height': args.img_height,
                    'img_width': args.img_width,
                    'rnn_hidden': args.rnn_hidden,
                    'vocab_size': vocab.vocab_size
                }
            }, checkpoint_path)
            
            print(f"💾 Saved best model: {checkpoint_path}")
            print(f"   Best Char Accuracy: {best_char_accuracy * 100:.2f}%")
        
        # Save periodic checkpoint
        if epoch % 10 == 0:
            checkpoint_path = os.path.join(args.save_dir, f'checkpoint_epoch_{epoch}.pth')
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'char_accuracy': char_acc,
                'vocab': vocab
            }, checkpoint_path)
            print(f"💾 Checkpoint saved: {checkpoint_path}")
    
    # Save training history
    history_path = os.path.join(args.save_dir, 'training_history.json')
    with open(history_path, 'w') as f:
        json.dump(history, f, indent=2)
    
    print("\n" + "=" * 60)
    print("🎉 Training completed!")
    print(f"📊 Best Character Accuracy: {best_char_accuracy * 100:.2f}%")
    print(f"📊 Best Validation Loss: {best_val_loss:.4f}")
    print("=" * 60)
    
    # Export to ONNX
    if args.export_onnx:
        print(f"\n📦 Exporting to ONNX...")
        onnx_path = os.path.join(args.save_dir, 'vietnamese_crnn.onnx')
        trainer.export_to_onnx(onnx_path, args.img_height, args.img_width)
        
        # Copy to pretrained_models directory
        import shutil
        pretrained_dir = '../pretrained_models/crnn/'
        os.makedirs(pretrained_dir, exist_ok=True)
        final_path = os.path.join(pretrained_dir, 'crnn_vietnamese.onnx')
        shutil.copy(onnx_path, final_path)
        print(f"✅ Copied ONNX model to: {final_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Train Vietnamese Handwriting CRNN')
    
    # Dataset arguments
    parser.add_argument('--dataset', type=str, required=True,
                       help='Path to dataset (ZIP file, folder, or HF dataset name)')
    parser.add_argument('--extract_dir', type=str, default='vn_handwritten_images',
                       help='Directory to extract ZIP (if using ZIP)')
    parser.add_argument('--huggingface', type=str, default=None,
                       help='Hugging Face dataset name (optional)')
    
    # Model arguments
    parser.add_argument('--img_height', type=int, default=32,
                       help='Image height')
    parser.add_argument('--img_width', type=int, default=128,
                       help='Image width')
    parser.add_argument('--rnn_hidden', type=int, default=256,
                       help='RNN hidden size')
    parser.add_argument('--dropout', type=float, default=0.1,
                       help='Dropout rate')
    
    # Training arguments
    parser.add_argument('--epochs', type=int, default=50,
                       help='Number of epochs')
    parser.add_argument('--batch_size', type=int, default=32,
                       help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001,
                       help='Learning rate')
    parser.add_argument('--num_workers', type=int, default=4,
                       help='Number of data loading workers')
    
    # Save arguments
    parser.add_argument('--save_dir', type=str, default='checkpoints',
                       help='Directory to save checkpoints')
    parser.add_argument('--export_onnx', action='store_true',
                       help='Export to ONNX after training')
    
    args = parser.parse_args()
    
    # Create save directory
    os.makedirs(args.save_dir, exist_ok=True)
    
    # Save configuration
    config_path = os.path.join(args.save_dir, 'config.json')
    with open(config_path, 'w') as f:
        json.dump(vars(args), f, indent=2)
    print(f"💾 Config saved to: {config_path}")
    
    # Run training
    main(args)

