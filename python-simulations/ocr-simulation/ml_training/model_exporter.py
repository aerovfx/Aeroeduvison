"""
Model Exporter
Export trained models to various formats (H5, TFLite, ONNX)
"""

import tensorflow as tf
from tensorflow import keras
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any
import json

class ModelExporter:
    """Export ML models to various formats"""
    
    def __init__(self, model_path: str):
        """
        Initialize exporter with model path
        
        Args:
            model_path: Path to .h5 model file
        """
        self.model_path = Path(model_path)
        self.model = None
        
        if self.model_path.exists():
            print(f"📂 Loading model from: {self.model_path}")
            self.model = keras.models.load_model(str(self.model_path))
            print(f"✅ Model loaded: {self.model.count_params():,} parameters")
        else:
            raise FileNotFoundError(f"Model not found: {self.model_path}")
    
    def export_h5(self, output_path: Optional[str] = None) -> str:
        """
        Export to Keras H5 format (default format)
        
        Args:
            output_path: Custom output path (optional)
        
        Returns:
            Path to exported model
        """
        if output_path is None:
            output_path = self.model_path.parent / f"{self.model_path.stem}_exported.h5"
        else:
            output_path = Path(output_path)
        
        print(f"💾 Exporting to H5 format...")
        self.model.save(str(output_path))
        print(f"✅ H5 model saved: {output_path}")
        
        return str(output_path)
    
    def export_tflite(
        self, 
        output_path: Optional[str] = None,
        quantize: bool = False
    ) -> str:
        """
        Export to TensorFlow Lite format (for mobile/edge devices)
        
        Args:
            output_path: Custom output path (optional)
            quantize: Enable quantization for smaller model size
        
        Returns:
            Path to exported model
        """
        if output_path is None:
            suffix = "_quantized" if quantize else ""
            output_path = self.model_path.parent / f"{self.model_path.stem}{suffix}.tflite"
        else:
            output_path = Path(output_path)
        
        print(f"📱 Exporting to TFLite format (quantize={quantize})...")
        
        # Create TFLite converter
        converter = tf.lite.TFLiteConverter.from_keras_model(self.model)
        
        if quantize:
            # Enable quantization for smaller model size
            converter.optimizations = [tf.lite.Optimize.DEFAULT]
            print("   🔧 Applying quantization...")
        
        # Convert model
        tflite_model = converter.convert()
        
        # Save to file
        with open(output_path, 'wb') as f:
            f.write(tflite_model)
        
        # Get file size
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"✅ TFLite model saved: {output_path} ({size_mb:.2f} MB)")
        
        return str(output_path)
    
    def export_onnx(self, output_path: Optional[str] = None) -> str:
        """
        Export to ONNX format (cross-platform)
        
        Args:
            output_path: Custom output path (optional)
        
        Returns:
            Path to exported model
        """
        try:
            import tf2onnx
        except ImportError:
            print("⚠️  tf2onnx not installed. Install with: pip install tf2onnx")
            raise
        
        if output_path is None:
            output_path = self.model_path.parent / f"{self.model_path.stem}.onnx"
        else:
            output_path = Path(output_path)
        
        print(f"🔄 Exporting to ONNX format...")
        
        # Convert to ONNX
        spec = (tf.TensorSpec(self.model.input.shape, tf.float32, name="input"),)
        model_proto, _ = tf2onnx.convert.from_keras(
            self.model,
            input_signature=spec,
            opset=13,
            output_path=str(output_path)
        )
        
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"✅ ONNX model saved: {output_path} ({size_mb:.2f} MB)")
        
        return str(output_path)
    
    def export_saved_model(self, output_path: Optional[str] = None) -> str:
        """
        Export to TensorFlow SavedModel format
        
        Args:
            output_path: Custom output directory (optional)
        
        Returns:
            Path to exported model directory
        """
        if output_path is None:
            output_path = self.model_path.parent / f"{self.model_path.stem}_saved_model"
        else:
            output_path = Path(output_path)
        
        print(f"📦 Exporting to SavedModel format...")
        self.model.save(str(output_path), save_format='tf')
        print(f"✅ SavedModel saved: {output_path}")
        
        return str(output_path)
    
    def export_all(
        self, 
        output_dir: Optional[str] = None,
        formats: list = None
    ) -> Dict[str, str]:
        """
        Export model to all specified formats
        
        Args:
            output_dir: Output directory for all exports
            formats: List of formats to export (default: ['h5', 'tflite', 'onnx'])
        
        Returns:
            Dictionary mapping format to file path
        """
        if output_dir is None:
            output_dir = self.model_path.parent / f"{self.model_path.stem}_exports"
        else:
            output_dir = Path(output_dir)
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if formats is None:
            formats = ['h5', 'tflite', 'onnx']
        
        print("=" * 60)
        print(f"🚀 Exporting model to {len(formats)} formats...")
        print("=" * 60)
        
        results = {}
        
        for fmt in formats:
            try:
                if fmt == 'h5':
                    path = self.export_h5(output_dir / f"{self.model_path.stem}.h5")
                    results['h5'] = path
                
                elif fmt == 'tflite':
                    path = self.export_tflite(output_dir / f"{self.model_path.stem}.tflite")
                    results['tflite'] = path
                    
                    # Also export quantized version
                    path_q = self.export_tflite(
                        output_dir / f"{self.model_path.stem}_quantized.tflite",
                        quantize=True
                    )
                    results['tflite_quantized'] = path_q
                
                elif fmt == 'onnx':
                    path = self.export_onnx(output_dir / f"{self.model_path.stem}.onnx")
                    results['onnx'] = path
                
                elif fmt == 'saved_model':
                    path = self.export_saved_model(output_dir / f"{self.model_path.stem}_saved_model")
                    results['saved_model'] = path
                
                else:
                    print(f"⚠️  Unknown format: {fmt}")
                
            except Exception as e:
                print(f"❌ Failed to export {fmt}: {e}")
                results[fmt] = f"error: {str(e)}"
        
        print("\n" + "=" * 60)
        print("✅ Export complete!")
        print("=" * 60)
        
        # Save export manifest
        manifest = {
            "source_model": str(self.model_path),
            "export_time": Path(output_dir).stat().st_mtime,
            "formats": results,
            "model_info": {
                "parameters": int(self.model.count_params()),
                "input_shape": [int(d) for d in self.model.input.shape[1:]],
                "output_shape": [int(d) for d in self.model.output.shape[1:]]
            }
        }
        
        manifest_path = output_dir / "export_manifest.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"\n📄 Export manifest saved: {manifest_path}")
        
        return results
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get detailed model information"""
        import io
        
        # Get model summary
        summary_stream = io.StringIO()
        self.model.summary(print_fn=lambda x: summary_stream.write(x + '\n'))
        summary = summary_stream.getvalue()
        
        return {
            "model_path": str(self.model_path),
            "parameters": int(self.model.count_params()),
            "layers": len(self.model.layers),
            "input_shape": [int(d) for d in self.model.input.shape[1:]],
            "output_shape": [int(d) for d in self.model.output.shape[1:]],
            "summary": summary
        }
    
    def test_inference(self, sample_input: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Test model inference
        
        Args:
            sample_input: Sample input tensor (optional, generates random if None)
        
        Returns:
            Inference results and timing
        """
        if sample_input is None:
            # Generate random input
            input_shape = self.model.input.shape[1:]
            sample_input = np.random.rand(1, *input_shape).astype(np.float32)
        
        print("🧪 Testing model inference...")
        
        # Warm-up
        _ = self.model.predict(sample_input, verbose=0)
        
        # Time inference
        import time
        start = time.time()
        predictions = self.model.predict(sample_input, verbose=0)
        inference_time = time.time() - start
        
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])
        
        print(f"✅ Inference successful!")
        print(f"   Predicted class: {predicted_class}")
        print(f"   Confidence: {confidence:.4f}")
        print(f"   Inference time: {inference_time*1000:.2f}ms")
        
        return {
            "predicted_class": int(predicted_class),
            "confidence": confidence,
            "inference_time_ms": inference_time * 1000,
            "predictions": predictions[0].tolist()
        }


# CLI interface for easy export
if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("🎯 ML Model Exporter")
    print("=" * 60)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python model_exporter.py <model_path> [formats]")
        print("\nExamples:")
        print("  python model_exporter.py model.h5")
        print("  python model_exporter.py model.h5 h5,tflite,onnx")
        print("\nFormats: h5, tflite, onnx, saved_model")
        sys.exit(1)
    
    model_path = sys.argv[1]
    formats = sys.argv[2].split(',') if len(sys.argv) > 2 else ['h5', 'tflite', 'onnx']
    
    print(f"\n📂 Model: {model_path}")
    print(f"📋 Formats: {', '.join(formats)}")
    print()
    
    try:
        exporter = ModelExporter(model_path)
        
        # Show model info
        info = exporter.get_model_info()
        print(f"\n📊 Model Info:")
        print(f"   Parameters: {info['parameters']:,}")
        print(f"   Layers: {info['layers']}")
        print(f"   Input shape: {info['input_shape']}")
        print(f"   Output shape: {info['output_shape']}")
        
        # Test inference
        print()
        exporter.test_inference()
        
        # Export all formats
        print()
        results = exporter.export_all(formats=formats)
        
        print(f"\n✅ Exported {len(results)} format(s):")
        for fmt, path in results.items():
            print(f"   {fmt}: {path}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

