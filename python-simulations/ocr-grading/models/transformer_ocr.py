"""
Transformer-based OCR Architecture
Modern approach using Vision Transformer + Decoder

Based on:
- TrOCR: Transformer-based Optical Character Recognition with Pre-trained Models
- PARSeq: Scene Text Recognition with Permuted Autoregressive Sequence Models
- Better for complex handwriting and mixed languages
"""

import torch
import torch.nn as nn
import math


class PositionalEncoding(nn.Module):
    """Positional encoding for transformer"""
    
    def __init__(self, d_model, max_len=500):
        super(PositionalEncoding, self).__init__()
        
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)
        
        self.register_buffer('pe', pe)
        
    def forward(self, x):
        """
        Args:
            x: (batch, seq_len, d_model)
        """
        return x + self.pe[:, :x.size(1), :]


class VisionEncoder(nn.Module):
    """
    Vision Encoder using CNN to extract image features
    Similar to ViT but adapted for OCR
    """
    
    def __init__(self, img_height=32, img_width=128, num_channels=1, d_model=512):
        super(VisionEncoder, self).__init__()
        
        # CNN for feature extraction
        self.cnn = nn.Sequential(
            # (1, 32, 128) -> (64, 16, 64)
            nn.Conv2d(num_channels, 64, 3, 1, 1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            
            # (64, 16, 64) -> (128, 8, 32)
            nn.Conv2d(64, 128, 3, 1, 1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            
            # (128, 8, 32) -> (256, 4, 16)
            nn.Conv2d(128, 256, 3, 1, 1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            
            # (256, 4, 16) -> (512, 2, 8)
            nn.Conv2d(256, 512, 3, 1, 1),
            nn.BatchNorm2d(512),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
        )
        
        # Project to d_model
        self.feature_height = img_height // 16
        self.feature_width = img_width // 16
        self.projection = nn.Linear(512 * self.feature_height, d_model)
        
    def forward(self, x):
        """
        Args:
            x: (batch, channels, height, width)
        Returns:
            (batch, seq_len, d_model)
        """
        # Extract features
        features = self.cnn(x)  # (batch, 512, h, w)
        
        # Reshape to sequence
        batch, channels, height, width = features.size()
        features = features.permute(0, 3, 1, 2)  # (batch, w, c, h)
        features = features.contiguous().view(batch, width, channels * height)
        
        # Project to d_model
        features = self.projection(features)  # (batch, seq_len, d_model)
        
        return features


class TransformerOCR(nn.Module):
    """
    Complete Transformer-based OCR model
    
    Architecture:
    1. Vision Encoder (CNN + Linear projection)
    2. Positional Encoding
    3. Transformer Encoder (self-attention over image features)
    4. Transformer Decoder (autoregressive text generation)
    5. Output layer
    
    Advantages over CRNN:
    - Better at handling complex layouts
    - Can learn long-range dependencies
    - More flexible for custom datasets
    - Better accuracy on challenging handwriting
    """
    
    def __init__(self, 
                 img_height=32, 
                 img_width=128,
                 num_channels=1,
                 num_classes=200,
                 d_model=512,
                 nhead=8,
                 num_encoder_layers=6,
                 num_decoder_layers=6,
                 dim_feedforward=2048,
                 dropout=0.1,
                 max_seq_len=50):
        super(TransformerOCR, self).__init__()
        
        self.d_model = d_model
        self.num_classes = num_classes
        self.max_seq_len = max_seq_len
        
        # Vision Encoder
        self.vision_encoder = VisionEncoder(img_height, img_width, num_channels, d_model)
        
        # Positional encoding
        self.pos_encoder = PositionalEncoding(d_model, max_len=max_seq_len)
        
        # Transformer Encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_encoder_layers
        )
        
        # Character embedding for decoder
        self.char_embedding = nn.Embedding(num_classes, d_model)
        
        # Transformer Decoder
        decoder_layer = nn.TransformerDecoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True
        )
        self.transformer_decoder = nn.TransformerDecoder(
            decoder_layer,
            num_layers=num_decoder_layers
        )
        
        # Output layer
        self.output_layer = nn.Linear(d_model, num_classes)
        
    def forward(self, images, target_seq=None):
        """
        Args:
            images: (batch, channels, height, width)
            target_seq: (batch, seq_len) - for teacher forcing during training
        Returns:
            (batch, seq_len, num_classes)
        """
        # Extract visual features
        visual_features = self.vision_encoder(images)  # (batch, seq_len, d_model)
        
        # Add positional encoding
        visual_features = self.pos_encoder(visual_features)
        
        # Encode with transformer
        memory = self.transformer_encoder(visual_features)
        
        # Decode
        if target_seq is not None:
            # Training mode with teacher forcing
            tgt_embedded = self.char_embedding(target_seq)
            tgt_embedded = self.pos_encoder(tgt_embedded)
            
            # Create causal mask for decoder
            seq_len = target_seq.size(1)
            tgt_mask = nn.Transformer.generate_square_subsequent_mask(seq_len).to(images.device)
            
            output = self.transformer_decoder(
                tgt_embedded,
                memory,
                tgt_mask=tgt_mask
            )
        else:
            # Inference mode - autoregressive generation
            batch_size = images.size(0)
            # Start with <SOS> token (assuming class 0)
            generated = torch.zeros(batch_size, 1, dtype=torch.long).to(images.device)
            
            for _ in range(self.max_seq_len):
                tgt_embedded = self.char_embedding(generated)
                tgt_embedded = self.pos_encoder(tgt_embedded)
                
                seq_len = generated.size(1)
                tgt_mask = nn.Transformer.generate_square_subsequent_mask(seq_len).to(images.device)
                
                output = self.transformer_decoder(
                    tgt_embedded,
                    memory,
                    tgt_mask=tgt_mask
                )
                
                # Get next character
                next_logits = self.output_layer(output[:, -1:, :])
                next_char = next_logits.argmax(dim=-1)
                
                generated = torch.cat([generated, next_char], dim=1)
                
                # Stop if all sequences generated <EOS> (assuming class 1)
                if (next_char == 1).all():
                    break
            
            # Convert to output format
            output = self.char_embedding(generated)
        
        # Final output layer
        logits = self.output_layer(output)
        
        return logits


def create_transformer_ocr_model(img_height=32, img_width=128, alphabet=None):
    """
    Factory function to create Transformer OCR model
    
    Args:
        img_height: Height of input images
        img_width: Width of input images
        alphabet: String of all possible characters
        
    Returns:
        TransformerOCR model
    """
    from models.crnn_architecture import VIETNAMESE_ALPHABET
    
    if alphabet is None:
        alphabet = VIETNAMESE_ALPHABET
    
    # Special tokens: <SOS>, <EOS>, <PAD>, <UNK>
    num_classes = len(alphabet) + 4
    
    model = TransformerOCR(
        img_height=img_height,
        img_width=img_width,
        num_channels=1,
        num_classes=num_classes,
        d_model=512,
        nhead=8,
        num_encoder_layers=6,
        num_decoder_layers=6,
        dim_feedforward=2048,
        dropout=0.1,
        max_seq_len=50
    )
    
    return model


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Transformer OCR Architecture")
    print("=" * 60)
    
    # Create model
    from models.crnn_architecture import VIETNAMESE_ALPHABET
    model = create_transformer_ocr_model(
        img_height=32,
        img_width=128,
        alphabet=VIETNAMESE_ALPHABET
    )
    
    print(f"\n✅ Transformer OCR model created!")
    print(f"   Alphabet size: {len(VIETNAMESE_ALPHABET)}")
    print(f"   Total classes: {len(VIETNAMESE_ALPHABET) + 4}")
    print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(f"   Model size: ~{sum(p.numel() for p in model.parameters()) * 4 / 1024 / 1024:.1f} MB")
    
    # Test forward pass
    batch_size = 2
    img = torch.randn(batch_size, 1, 32, 128)
    
    print(f"\n🧪 Testing forward pass...")
    print(f"   Input shape: {img.shape}")
    
    # Inference mode (without target)
    output = model(img)
    print(f"   Output shape: {output.shape}")
    print(f"✅ Model is ready for training!")

