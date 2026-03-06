"""
Training Pipeline for CRNN OCR Model
Supports custom handwriting datasets
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
import cv2
import numpy as np
from PIL import Image
import os
import json
from tqdm import tqdm
import sys

sys.path.append('..')
from models.crnn_architecture import CRNN, create_crnn_model, VIETNAMESE_ALPHABET


class HandwritingDataset(Dataset):
    """
    Custom dataset for handwritten text images
    
    Dataset structure:
    dataset/
      ├── images/
      │   ├── img_001.jpg
      │   ├── img_002.jpg
      │   └── ...
      └── labels.json  # {"img_001.jpg": "text content", ...}
    """
    
    def __init__(self, dataset_dir, alphabet, img_height=32, img_width=128, transform=None):
        """
        Args:
            dataset_dir: Directory containing images/ and labels.json
            alphabet: String of all possible characters
            img_height: Target image height
            img_width: Target image width
            transform: Optional image transforms
        """
        self.dataset_dir = dataset_dir
        self.img_dir = os.path.join(dataset_dir, 'images')
        self.alphabet = alphabet
        self.img_height = img_height
        self.img_width = img_width
        
        # Load labels
        labels_path = os.path.join(dataset_dir, 'labels.json')
        with open(labels_path, 'r', encoding='utf-8') as f:
            self.labels = json.load(f)
        
        self.image_files = list(self.labels.keys())
        
        # Create character mapping
        self.char2idx = {char: idx + 1 for idx, char in enumerate(alphabet)}  # 0 reserved for CTC blank
        self.idx2char = {idx: char for char, idx in self.char2idx.items()}
        self.idx2char[0] = '<BLANK>'
        
        # Transforms
        self.transform = transform or transforms.Compose([
            transforms.Grayscale(),
            transforms.Resize((img_height, img_width)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])
        
    def __len__(self):
        return len(self.image_files)
    
    def __getitem__(self, idx):
        """
        Returns:
            image: (1, height, width) tensor
            target: List of character indices
            target_length: Length of target sequence
        """
        # Load image
        img_name = self.image_files[idx]
        img_path = os.path.join(self.img_dir, img_name)
        image = Image.open(img_path)
        
        # Apply transforms
        image = self.transform(image)
        
        # Get label
        label_text = self.labels[img_name]
        
        # Convert text to indices
        target = [self.char2idx.get(char, 0) for char in label_text]
        target_length = len(target)
        
        return image, torch.LongTensor(target), target_length


def ctc_collate_fn(batch):
    """Custom collate function for CTC loss"""
    images, targets, target_lengths = zip(*batch)
    
    # Stack images
    images = torch.stack(images, 0)
    
    # Concatenate targets
    targets = torch.cat(targets, 0)
    
    # Target lengths
    target_lengths = torch.LongTensor(target_lengths)
    
    return images, targets, target_lengths


class CRNNTrainer:
    """Trainer for CRNN model"""
    
    def __init__(self, model, device='cuda' if torch.cuda.is_available() else 'cpu'):
        self.model = model.to(device)
        self.device = device
        self.criterion = nn.CTCLoss(blank=0, reduction='mean', zero_infinity=True)
        
    def train_epoch(self, dataloader, optimizer, epoch):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0
        
        pbar = tqdm(dataloader, desc=f'Epoch {epoch}')
        for batch_idx, (images, targets, target_lengths) in enumerate(pbar):
            images = images.to(self.device)
            targets = targets.to(self.device)
            
            # Forward pass
            outputs = self.model(images)  # (seq_len, batch, num_classes)
            
            # Calculate input lengths (seq_len for each sample)
            batch_size = images.size(0)
            input_lengths = torch.full((batch_size,), outputs.size(0), dtype=torch.long)
            
            # CTC Loss
            loss = self.criterion(
                outputs.log_softmax(2),
                targets,
                input_lengths,
                target_lengths
            )
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 5.0)
            optimizer.step()
            
            total_loss += loss.item()
            pbar.set_postfix({'loss': f'{loss.item():.4f}'})
        
        avg_loss = total_loss / len(dataloader)
        return avg_loss
    
    def validate(self, dataloader, alphabet):
        """Validate model"""
        self.model.eval()
        total_loss = 0
        correct_chars = 0
        total_chars = 0
        
        with torch.no_grad():
            for images, targets, target_lengths in dataloader:
                images = images.to(self.device)
                targets = targets.to(self.device)
                
                # Forward pass
                outputs = self.model(images)
                
                # Calculate loss
                batch_size = images.size(0)
                input_lengths = torch.full((batch_size,), outputs.size(0), dtype=torch.long)
                
                loss = self.criterion(
                    outputs.log_softmax(2),
                    targets,
                    input_lengths,
                    target_lengths
                )
                total_loss += loss.item()
                
                # Decode predictions
                _, preds = outputs.max(2)  # (seq_len, batch)
                preds = preds.transpose(1, 0)  # (batch, seq_len)
                
                # Calculate accuracy (simplified - just character accuracy)
                for i in range(batch_size):
                    pred = preds[i].cpu().numpy()
                    # Remove duplicates and blanks for CTC
                    pred = [p for p in pred if p != 0]
                    pred_dedup = [pred[0]] if pred else []
                    for p in pred[1:]:
                        if p != pred_dedup[-1]:
                            pred_dedup.append(p)
                    
                    # Compare with target
                    target_len = target_lengths[i].item()
                    target_indices = targets[sum(target_lengths[:i]):sum(target_lengths[:i+1])]
                    
                    correct_chars += sum(1 for p, t in zip(pred_dedup, target_indices) if p == t)
                    total_chars += target_len
        
        avg_loss = total_loss / len(dataloader)
        accuracy = correct_chars / total_chars if total_chars > 0 else 0
        
        return avg_loss, accuracy


def train_model(dataset_dir, 
                num_epochs=50,
                batch_size=32,
                learning_rate=0.001,
                save_dir='checkpoints'):
    """
    Main training function
    
    Args:
        dataset_dir: Directory with images/ and labels.json
        num_epochs: Number of training epochs
        batch_size: Batch size
        learning_rate: Learning rate
        save_dir: Directory to save checkpoints
    """
    print("=" * 60)
    print("CRNN OCR Training Pipeline")
    print("=" * 60)
    
    # Create save directory
    os.makedirs(save_dir, exist_ok=True)
    
    # Setup device
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")
    
    # Create datasets
    print("\nLoading datasets...")
    train_dataset = HandwritingDataset(
        dataset_dir=os.path.join(dataset_dir, 'train'),
        alphabet=VIETNAMESE_ALPHABET,
        img_height=32,
        img_width=128
    )
    
    val_dataset = HandwritingDataset(
        dataset_dir=os.path.join(dataset_dir, 'val'),
        alphabet=VIETNAMESE_ALPHABET,
        img_height=32,
        img_width=128
    )
    
    print(f"Train samples: {len(train_dataset)}")
    print(f"Val samples: {len(val_dataset)}")
    print(f"Alphabet size: {len(VIETNAMESE_ALPHABET)}")
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=4,
        collate_fn=ctc_collate_fn
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=4,
        collate_fn=ctc_collate_fn
    )
    
    # Create model
    print("\nCreating CRNN model...")
    model = create_crnn_model(
        img_height=32,
        alphabet=VIETNAMESE_ALPHABET
    )
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Setup trainer
    trainer = CRNNTrainer(model, device=device)
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)
    
    # Training loop
    best_val_loss = float('inf')
    
    print("\nStarting training...")
    print("=" * 60)
    
    for epoch in range(1, num_epochs + 1):
        print(f"\nEpoch {epoch}/{num_epochs}")
        print("-" * 60)
        
        # Train
        train_loss = trainer.train_epoch(train_loader, optimizer, epoch)
        print(f"Train Loss: {train_loss:.4f}")
        
        # Validate
        val_loss, val_accuracy = trainer.validate(val_loader, VIETNAMESE_ALPHABET)
        print(f"Val Loss: {val_loss:.4f}")
        print(f"Val Accuracy: {val_accuracy * 100:.2f}%")
        
        # Learning rate scheduling
        scheduler.step(val_loss)
        current_lr = optimizer.param_groups[0]['lr']
        print(f"Learning Rate: {current_lr:.6f}")
        
        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            checkpoint_path = os.path.join(save_dir, 'best_model.pth')
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'val_accuracy': val_accuracy,
                'alphabet': VIETNAMESE_ALPHABET
            }, checkpoint_path)
            print(f"✅ Saved best model to {checkpoint_path}")
        
        # Save periodic checkpoint
        if epoch % 10 == 0:
            checkpoint_path = os.path.join(save_dir, f'checkpoint_epoch_{epoch}.pth')
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'val_accuracy': val_accuracy,
                'alphabet': VIETNAMESE_ALPHABET
            }, checkpoint_path)
            print(f"💾 Saved checkpoint to {checkpoint_path}")
    
    print("\n" + "=" * 60)
    print("Training completed!")
    print(f"Best validation loss: {best_val_loss:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description='Train CRNN OCR model')
    parser.add_argument('--dataset', type=str, required=True, help='Path to dataset directory')
    parser.add_argument('--epochs', type=int, default=50, help='Number of epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--save_dir', type=str, default='checkpoints', help='Save directory')
    
    args = parser.parse_args()
    
    train_model(
        dataset_dir=args.dataset,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        save_dir=args.save_dir
    )

