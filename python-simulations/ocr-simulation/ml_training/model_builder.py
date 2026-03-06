"""
ML Model Builder
Creates various model architectures for handwriting recognition
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from typing import Optional

class ModelBuilder:
    """Build ML models based on configuration"""
    
    def __init__(self, config):
        self.config = config
        
    def build_model(self) -> keras.Model:
        """Build model based on config.model_type"""
        if self.config.model_type == "cnn":
            return self.build_cnn()
        elif self.config.model_type == "resnet":
            return self.build_resnet()
        elif self.config.model_type == "efficientnet":
            return self.build_efficientnet()
        else:
            raise ValueError(f"Unknown model type: {self.config.model_type}")
    
    def build_cnn(self) -> keras.Model:
        """
        Simple CNN for MNIST-like datasets
        Good for: 28x28 grayscale images, 10-100 classes
        """
        print("🏗️  Building CNN model...")
        
        model = models.Sequential([
            # Input layer
            layers.Input(shape=self.config.input_shape),
            
            # Conv Block 1
            layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Conv Block 2
            layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Conv Block 3
            layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Dense layers
            layers.Flatten(),
            layers.Dense(256, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            layers.Dense(128, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            
            # Output layer
            layers.Dense(self.config.num_classes, activation='softmax')
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.config.learning_rate),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        print(f"✅ CNN model built: {model.count_params():,} parameters")
        return model
    
    def build_resnet(self) -> keras.Model:
        """
        ResNet-inspired architecture
        Good for: Complex datasets, deeper networks
        """
        print("🏗️  Building ResNet model...")
        
        inputs = layers.Input(shape=self.config.input_shape)
        
        # Initial conv
        x = layers.Conv2D(64, (7, 7), strides=2, padding='same')(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.Activation('relu')(x)
        x = layers.MaxPooling2D((3, 3), strides=2, padding='same')(x)
        
        # Residual blocks
        x = self._residual_block(x, 64, 3)
        x = self._residual_block(x, 128, 4, stride=2)
        x = self._residual_block(x, 256, 6, stride=2)
        
        # Global pooling and output
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dense(512, activation='relu')(x)
        x = layers.Dropout(0.5)(x)
        outputs = layers.Dense(self.config.num_classes, activation='softmax')(x)
        
        model = keras.Model(inputs=inputs, outputs=outputs)
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.config.learning_rate),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        print(f"✅ ResNet model built: {model.count_params():,} parameters")
        return model
    
    def _residual_block(self, x, filters, num_blocks, stride=1):
        """ResNet residual block"""
        for i in range(num_blocks):
            shortcut = x
            
            # First conv
            x = layers.Conv2D(filters, (3, 3), 
                            strides=stride if i == 0 else 1,
                            padding='same')(x)
            x = layers.BatchNormalization()(x)
            x = layers.Activation('relu')(x)
            
            # Second conv
            x = layers.Conv2D(filters, (3, 3), padding='same')(x)
            x = layers.BatchNormalization()(x)
            
            # Adjust shortcut if needed
            if stride != 1 or shortcut.shape[-1] != filters:
                shortcut = layers.Conv2D(filters, (1, 1), 
                                        strides=stride if i == 0 else 1)(shortcut)
                shortcut = layers.BatchNormalization()(shortcut)
            
            # Add residual connection
            x = layers.Add()([x, shortcut])
            x = layers.Activation('relu')(x)
        
        return x
    
    def build_efficientnet(self) -> keras.Model:
        """
        EfficientNet-B0 for production use
        Good for: High accuracy, mobile deployment
        """
        print("🏗️  Building EfficientNet model...")
        
        # Use pre-trained EfficientNetB0 as base
        base_model = keras.applications.EfficientNetB0(
            include_top=False,
            weights=None,  # Train from scratch, or use 'imagenet' for transfer learning
            input_shape=self.config.input_shape,
            pooling='avg'
        )
        
        # Add custom head
        inputs = base_model.input
        x = base_model.output
        x = layers.Dropout(0.5)(x)
        outputs = layers.Dense(self.config.num_classes, activation='softmax')(x)
        
        model = keras.Model(inputs=inputs, outputs=outputs)
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.config.learning_rate),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        print(f"✅ EfficientNet model built: {model.count_params():,} parameters")
        return model
    
    def get_model_summary(self, model: keras.Model) -> str:
        """Get formatted model summary"""
        import io
        stream = io.StringIO()
        model.summary(print_fn=lambda x: stream.write(x + '\n'))
        return stream.getvalue()
    
    def visualize_model(self, model: keras.Model, filename: str = "model_architecture.png"):
        """Visualize model architecture"""
        try:
            keras.utils.plot_model(
                model,
                to_file=filename,
                show_shapes=True,
                show_layer_names=True,
                rankdir='TB',
                expand_nested=True,
                dpi=96
            )
            print(f"📊 Model visualization saved to {filename}")
        except Exception as e:
            print(f"⚠️  Could not visualize model: {e}")


# Example usage and testing
if __name__ == "__main__":
    from config import MNIST_CONFIG, EMNIST_CONFIG, CUSTOM_HANDWRITING_CONFIG
    
    print("=" * 60)
    print("🧪 Testing Model Builder")
    print("=" * 60)
    
    # Test CNN
    print("\n📝 Test 1: CNN for MNIST")
    builder = ModelBuilder(MNIST_CONFIG)
    cnn_model = builder.build_cnn()
    print(f"   Input shape: {MNIST_CONFIG.input_shape}")
    print(f"   Output classes: {MNIST_CONFIG.num_classes}")
    print(f"   Parameters: {cnn_model.count_params():,}")
    
    # Test ResNet
    print("\n📝 Test 2: ResNet for EMNIST")
    builder = ModelBuilder(EMNIST_CONFIG)
    resnet_model = builder.build_resnet()
    print(f"   Input shape: {EMNIST_CONFIG.input_shape}")
    print(f"   Output classes: {EMNIST_CONFIG.num_classes}")
    print(f"   Parameters: {resnet_model.count_params():,}")
    
    # Test EfficientNet
    print("\n📝 Test 3: EfficientNet for Custom")
    builder = ModelBuilder(CUSTOM_HANDWRITING_CONFIG)
    eff_model = builder.build_efficientnet()
    print(f"   Input shape: {CUSTOM_HANDWRITING_CONFIG.input_shape}")
    print(f"   Output classes: {CUSTOM_HANDWRITING_CONFIG.num_classes}")
    print(f"   Parameters: {eff_model.count_params():,}")
    
    print("\n" + "=" * 60)
    print("✅ All model builds successful!")
    print("=" * 60)

