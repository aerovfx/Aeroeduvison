"""
CRNN (Convolutional Recurrent Neural Network) for OCR
Architecture: CNN (feature extraction) + RNN (sequence modeling) + CTC (decoding)

Based on:
- Original CRNN paper: "An End-to-End Trainable Neural Network for Image-based Sequence Recognition"
- Can be trained on custom handwriting datasets
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class BidirectionalLSTM(nn.Module):
    """Bidirectional LSTM for sequence modeling"""
    
    def __init__(self, input_size, hidden_size, output_size):
        super(BidirectionalLSTM, self).__init__()
        self.rnn = nn.LSTM(input_size, hidden_size, bidirectional=True, batch_first=True)
        self.linear = nn.Linear(hidden_size * 2, output_size)

    def forward(self, x):
        """
        Args:
            x: (batch, seq_len, input_size)
        Returns:
            (batch, seq_len, output_size)
        """
        recurrent, _ = self.rnn(x)
        output = self.linear(recurrent)
        return output


class CRNN(nn.Module):
    """
    CRNN Architecture for OCR
    
    Pipeline:
    1. CNN: Extract visual features from image
    2. RNN: Model sequence dependencies
    3. CTC: Decode to text
    
    Suitable for:
    - Handwritten text recognition
    - Custom fonts
    - Vietnamese characters
    - Math symbols
    """
    
    def __init__(self, img_height, num_channels, num_classes, hidden_size=256, num_lstm_layers=2):
        """
        Args:
            img_height: Height of input images (e.g., 32)
            num_channels: Number of image channels (1 for grayscale, 3 for RGB)
            num_classes: Number of character classes (including blank for CTC)
            hidden_size: Hidden size for LSTM
            num_lstm_layers: Number of LSTM layers
        """
        super(CRNN, self).__init__()
        
        self.img_height = img_height
        self.num_channels = num_channels
        self.num_classes = num_classes
        
        # CNN Feature Extractor
        # Input: (batch, channels, height, width)
        # Output: (batch, features, height', width')
        self.cnn = nn.Sequential(
            # Conv Block 1: (channels, H, W) -> (64, H/2, W/2)
            nn.Conv2d(num_channels, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            # Conv Block 2: (64, H/2, W/2) -> (128, H/4, W/4)
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            
            # Conv Block 3: (128, H/4, W/4) -> (256, H/4, W/8)
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            
            # Conv Block 4: (256, H/4, W/8) -> (256, H/4, W/8)
            nn.Conv2d(256, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=(2, 1)),  # Pool only in width
            
            # Conv Block 5: (256, H/4, W/8) -> (512, H/8, W/8)
            nn.Conv2d(256, 512, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            
            # Conv Block 6: (512, H/8, W/8) -> (512, H/8, W/8)
            nn.Conv2d(512, 512, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=(2, 1)),  # Pool only in width
            
            # Final Conv: (512, H/8, W/8) -> (512, H/8, W/8)
            nn.Conv2d(512, 512, kernel_size=2, stride=1, padding=0),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True)
        )
        
        # Calculate output height after CNN
        # For img_height=32: 32 -> 16 -> 8 -> 4 -> 2 -> 1
        self.cnn_output_height = img_height // 32 if img_height >= 32 else 1
        self.cnn_output_features = 512 * self.cnn_output_height
        
        # Recurrent layers (LSTM)
        self.rnn = nn.Sequential(
            BidirectionalLSTM(self.cnn_output_features, hidden_size, hidden_size),
            BidirectionalLSTM(hidden_size, hidden_size, num_classes)
        )
        
    def forward(self, x):
        """
        Forward pass
        
        Args:
            x: (batch, channels, height, width)
        Returns:
            (batch, seq_len, num_classes)
        """
        # CNN feature extraction
        conv = self.cnn(x)  # (batch, 512, height', width')
        
        # Reshape for RNN: (batch, features, h, w) -> (batch, w, features*h)
        batch, channels, height, width = conv.size()
        conv = conv.permute(0, 3, 1, 2)  # (batch, width, channels, height)
        conv = conv.contiguous().view(batch, width, channels * height)
        
        # RNN sequence modeling
        output = self.rnn(conv)  # (batch, seq_len, num_classes)
        
        # For CTC loss, we need (seq_len, batch, num_classes)
        output = output.permute(1, 0, 2)
        
        return output


class AttentionOCR(nn.Module):
    """
    Attention-based OCR (more modern than CRNN)
    Uses attention mechanism instead of CTC
    Better for long sequences and complex layouts
    """
    
    def __init__(self, img_height, num_channels, num_classes, hidden_size=256):
        super(AttentionOCR, self).__init__()
        
        # CNN Encoder (same as CRNN)
        self.encoder = nn.Sequential(
            nn.Conv2d(num_channels, 64, 3, 1, 1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            
            nn.Conv2d(64, 128, 3, 1, 1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            
            nn.Conv2d(128, 256, 3, 1, 1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            
            nn.Conv2d(256, 512, 3, 1, 1),
            nn.BatchNorm2d(512),
            nn.ReLU(),
            nn.MaxPool2d((2, 1)),
        )
        
        # Calculate feature dimensions
        self.feature_height = img_height // 8
        self.feature_size = 512 * self.feature_height
        
        # Attention-based decoder
        self.decoder_lstm = nn.LSTM(
            hidden_size, 
            hidden_size, 
            num_layers=2,
            batch_first=True
        )
        
        self.attention = nn.Linear(hidden_size + self.feature_size, 1)
        self.output_layer = nn.Linear(hidden_size, num_classes)
        
    def forward(self, x, target_seq_len=25):
        """
        Args:
            x: (batch, channels, height, width)
            target_seq_len: Maximum sequence length to decode
        Returns:
            (batch, seq_len, num_classes)
        """
        # Encode image features
        features = self.encoder(x)  # (batch, 512, h', w')
        
        # Reshape features for attention
        batch, channels, height, width = features.size()
        features = features.permute(0, 3, 1, 2)  # (batch, w, c, h)
        features = features.contiguous().view(batch, width, channels * height)
        
        # Decode with attention (simplified - full impl needs teacher forcing)
        # This is a placeholder for the attention mechanism
        outputs = []
        hidden = None
        
        for i in range(target_seq_len):
            # Attention over features
            # (Simplified - in practice you'd compute attention weights)
            context = features.mean(dim=1, keepdim=True)  # (batch, 1, feature_size)
            
            # LSTM step
            output, hidden = self.decoder_lstm(context, hidden)
            
            # Predict character
            logits = self.output_layer(output)  # (batch, 1, num_classes)
            outputs.append(logits)
        
        outputs = torch.cat(outputs, dim=1)  # (batch, seq_len, num_classes)
        
        return outputs


def create_crnn_model(img_height=32, num_classes=None, alphabet=None):
    """
    Factory function to create CRNN model
    
    Args:
        img_height: Height of input images
        num_classes: Number of character classes (or provide alphabet)
        alphabet: String of all possible characters
        
    Returns:
        CRNN model
    """
    if alphabet is not None:
        # Include blank character for CTC
        num_classes = len(alphabet) + 1
    elif num_classes is None:
        raise ValueError("Must provide either num_classes or alphabet")
    
    model = CRNN(
        img_height=img_height,
        num_channels=1,  # Grayscale
        num_classes=num_classes,
        hidden_size=256,
        num_lstm_layers=2
    )
    
    return model


# Example Vietnamese + English alphabet for OCR
VIETNAMESE_ALPHABET = (
    "aàáạảãâầấậẩẫăằắặẳẵ"
    "eèéẹẻẽêềếệểễ"
    "iìíịỉĩ"
    "oòóọỏõôồốộổỗơờớợởỡ"
    "uùúụủũưừứựửữ"
    "yỳýỵỷỹ"
    "đ"
    "AÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ"
    "EÈÉẸẺẼÊỀẾỆỂỄ"
    "IÌÍỊỈĨ"
    "OÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ"
    "UÙÚỤỦŨƯỪỨỰỬỮ"
    "YỲÝỴỶỸ"
    "Đ"
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    " .,;:!?-()[]{}\"'/@#$%&*+=<>"
)


if __name__ == "__main__":
    # Test model creation
    print("Creating CRNN model for Vietnamese OCR...")
    
    alphabet = VIETNAMESE_ALPHABET
    model = create_crnn_model(
        img_height=32,
        alphabet=alphabet
    )
    
    print(f"✅ Model created!")
    print(f"   Alphabet size: {len(alphabet)}")
    print(f"   Output classes: {len(alphabet) + 1} (including CTC blank)")
    print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Test forward pass
    batch_size = 4
    img_height = 32
    img_width = 128
    
    x = torch.randn(batch_size, 1, img_height, img_width)
    output = model(x)
    
    print(f"\n✅ Forward pass successful!")
    print(f"   Input shape: {x.shape}")
    print(f"   Output shape: {output.shape}")
    print(f"   Expected: (seq_len={img_width//4}, batch={batch_size}, classes={len(alphabet)+1})")

