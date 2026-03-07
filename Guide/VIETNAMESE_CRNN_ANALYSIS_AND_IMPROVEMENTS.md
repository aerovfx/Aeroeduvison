# 🎓 VIETNAMESE CRNN ANALYSIS & OCR IMPROVEMENTS

**Source:** `/Users/vietchung/Downloads/crnn/Vietnamese_Handwritten_Recognition_CRNN.ipynb`  
**Date:** 2024-10-12  
**Status:** ✅ Analysis Complete

---

## 📊 **CRNN NOTEBOOK ANALYSIS**

### **Model Architecture:**

```
Input: (118, 2167, 1) - Grayscale image
    ↓
Block 1: Conv2D(64) + MaxPool(3x3) + ReLU
    ↓ (39, 722, 64)
Block 2: Conv2D(128) + MaxPool(3x3) + ReLU
    ↓ (13, 240, 128)
Block 3: Conv2D(256) + BatchNorm + ReLU
    ↓ (13, 240, 256)
Block 4: Conv2D(256) + BatchNorm + Add(skip) + ReLU
    ↓ (13, 240, 256)
Block 5: Conv2D(512) + BatchNorm + ReLU
    ↓ (13, 240, 512)
Block 6: Conv2D(512) + BatchNorm + Add(skip) + ReLU
    ↓ (13, 240, 512)
Block 7: Conv2D(1024) + BatchNorm + MaxPool(3x1) + ReLU
    ↓ (4, 240, 1024)
MaxPool: (3x1)
    ↓ (1, 240, 1024)
Squeeze: Remove dimension
    ↓ (240, 1024)
BiLSTM 1: 512 units, dropout=0.2
    ↓ (240, 1024)
BiLSTM 2: 512 units, dropout=0.2
    ↓ (240, 1024)
Dense: len(char_list)+1 classes, softmax
    ↓ (240, 141) - 140 chars + 1 blank
```

### **Key Features:**

1. **Residual Connections** (Skip connections)
   ```python
   x_3 = Conv2D(256)(x)
   x_4 = Conv2D(256)(x_3)
   x = Add()([x, x_3])  # Skip connection!
   ```
   **Benefits:** Better gradient flow, deeper network

2. **Batch Normalization**
   ```python
   x = Conv2D(256)(x)
   x = BatchNormalization()(x)
   x = Activation('relu')(x)
   ```
   **Benefits:** Faster convergence, stable training

3. **Bidirectional LSTM**
   ```python
   blstm_1 = Bidirectional(LSTM(512, return_sequences=True, dropout=0.2))
   blstm_2 = Bidirectional(LSTM(512, return_sequences=True, dropout=0.2))
   ```
   **Benefits:** Context from both directions

4. **CTC Loss**
   ```python
   def ctc_lambda_func(args):
       y_pred, labels, input_length, label_length = args
       return K.ctc_batch_cost(labels, y_pred, input_length, label_length)
   ```
   **Benefits:** No alignment needed

---

## 📈 **RESULTS FROM NOTEBOOK**

### **Performance Metrics:**

```
Character Error Rate (CER): 4.76%  ✅ Excellent!
Word Error Rate (WER):      15.66% ✅ Good
Sequence Error Rate (SER):  80.98% ⚠️  (expected for full addresses)
```

### **Training:**

```
Dataset: Vietnamese addresses
Training samples: ~1400
Validation samples: ~360
Epochs: 100
Batch size: 32
Best epoch: 2 (early stopping)
Characters: 140 unique Vietnamese chars
```

### **Example Predictions:**

```
Original:  "Số 4/44 Ngô Quyền, Phường Xương Huân, Thành phố Nha Trang"
Predicted: "Số 4/44 Ngô Quyền, Phường Xương Huân, Thành pố Nha Trng"
                                                        ↑ Missing 'h'  ↑ Missing 'a'

Original:  "Số 172 đại lộ Tôn Đức Thắng, Xã An Đồng, Huyện An Dương"
Predicted: "Số N2 đại lộ Tôn Đức Thắng, Xã Au Đồng, Huyện Au Dương"
                ↑ '172'→'N2'           ↑ 'An'→'Au'    ↑ 'An'→'Au'
```

**Observations:**
- ✅ Very good with Vietnamese diacritics
- ✅ Good with common words
- ⚠️  Some errors on numbers (172 → N2)
- ⚠️  Substitution errors (An → Au, Trang → Trng)

---

## 🔍 **PREPROCESSING PIPELINE (From Notebook)**

### **Steps:**

```python
# 1. Read image & convert to grayscale
img = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2GRAY)

# 2. Resize to fixed height (118px), maintain aspect ratio
img = cv2.resize(img, (int(118/height*width), 118))

# 3. Padding to fixed width (2167px)
img = np.pad(img, ((0,0),(0, 2167-width)), 'median')

# 4. Gaussian Blur (noise removal)
img = cv2.GaussianBlur(img, (5,5), 0)

# 5. Adaptive Threshold (binarization)
img = cv2.adaptiveThreshold(img, 255, 
                            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                            cv2.THRESH_BINARY_INV, 11, 4)

# 6. Add channel dimension
img = np.expand_dims(img, axis=2)

# 7. Normalize
img = img / 255.0
```

### **Key Differences vs Our Current Pipeline:**

| Feature | CRNN Notebook | Our Current | Improvement Needed |
|---------|---------------|-------------|-------------------|
| **Resize** | Fixed height 118px | Min 500px | ✅ Both valid |
| **Padding** | To 2167px width | None | ⚠️  Add padding |
| **Blur** | Gaussian (5,5) | Gaussian (3,3) + NLM | ✅ Ours better |
| **Threshold** | BINARY_INV | BINARY | ⚠️  Try INV |
| **Normalization** | /255 | /255 | ✅ Same |
| **Channel** | Expand dim | None (RGB/Gray) | ⚠️  For CNN input |

---

## 💡 **KEY IMPROVEMENTS TO APPLY**

### **1. Add Padding to Fixed Width**

**Current Problem:**
- Variable width images → inconsistent CNN input
- No padding → model sees different aspect ratios

**Solution from CRNN:**
```python
# After resize, pad to fixed width
max_width = 2167  # Or calculate from dataset
img = np.pad(img, ((0,0),(0, max_width - width)), 'median')
```

**Benefits:**
- Consistent input size
- Better batch processing
- Easier for CNN layers

---

### **2. Use BINARY_INV Thresholding**

**Current:**
```python
cv2.adaptiveThreshold(img, 255, 
                      cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                      cv2.THRESH_BINARY, 11, 2)  # BINARY
```

**CRNN Approach:**
```python
cv2.adaptiveThreshold(img, 255,
                      cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                      cv2.THRESH_BINARY_INV, 11, 4)  # BINARY_INV
```

**Why INV (Inverted):**
- Black text on white background → White text on black background
- Better for CNNs (features are "lit up" = white)
- Standard in many OCR papers

**Test both:** Try BINARY_INV vs BINARY and compare results

---

### **3. Implement Residual Connections in CNN**

**From Notebook:**
```python
# Block 3
x_3 = Conv2D(256, (3,3), padding='same')(x)
x_3 = BatchNormalization()(x_3)
x_3 = Activation('relu')(x_3)

# Block 4 with skip connection
x_4 = Conv2D(256, (3,3), padding='same')(x_3)
x_4 = BatchNormalization()(x_4)
x_4 = Add()([x_4, x_3])  # ← Residual/skip connection
x_4 = Activation('relu')(x_4)
```

**Benefits:**
- Deeper networks without degradation
- Better gradient flow
- Higher accuracy

**Current:** We use Tesseract (no custom CNN)
**Improvement:** If building CRNN, use residual blocks

---

### **4. CTC Decoding Implementation**

**From Notebook:**
```python
# Greedy decoding (fast)
out = K.ctc_decode(prediction, 
                   input_length=np.ones(prediction.shape[0])*prediction.shape[1],
                   greedy=True)[0][0]

# Convert indices to characters
pred_text = ""
for p in out[0]:
    if int(p) != -1:  # -1 is blank/padding
        pred_text += char_list[int(p)]
```

**Current:** Using Tesseract (no CTC)
**Improvement:** If using CRNN model, implement CTC decoder

---

### **5. Training Callbacks (Best Practices)**

**From Notebook:**
```python
callbacks = [
    # Monitor validation loss, save best weights
    ModelCheckpoint(filepath='checkpoint_weights.hdf5',
                   monitor='val_loss',
                   save_best_only=True,
                   save_weights_only=True),
    
    # Stop if no improvement for 20 epochs
    EarlyStopping(monitor='val_loss',
                 patience=20,
                 restore_best_weights=True),
    
    # Reduce learning rate if plateau
    ReduceLROnPlateau(monitor='val_loss',
                     factor=0.2,
                     patience=10),
    
    # TensorBoard logging
    TensorBoard(log_dir='./logs')
]
```

**If training CRNN:** Use these callbacks!

---

## 🚀 **IMMEDIATE IMPROVEMENTS FOR OUR OCR**

### **Improvement 1: Better Thresholding**

```python
# Add to ocr_pipeline_tesseract.py

def preprocess_image(self, image, progress_callback=None):
    # ... existing steps ...
    
    # Step 6: Try both thresholding methods
    
    # Method A: BINARY (current)
    binary = cv2.adaptiveThreshold(enhanced, 255,
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 11, 2)
    
    # Method B: BINARY_INV (from CRNN)
    binary_inv = cv2.adaptiveThreshold(enhanced, 255,
                                       cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY_INV, 11, 4)
    
    # Test both and use better one
    # For now, let's try INV as it worked better in CRNN
    
    return binary_inv  # Try inverted
```

---

### **Improvement 2: Add Padding for Consistent Width**

```python
def preprocess_image(self, image, progress_callback=None):
    # ... after resizing ...
    
    # New Step: Padding to fixed width
    height, width = gray.shape
    
    # Calculate target width (use max from dataset or fixed value)
    target_width = 2000  # Adjust based on your dataset
    
    if width < target_width:
        # Pad with median value
        pad_width = target_width - width
        gray = np.pad(gray, ((0, 0), (0, pad_width)), 'median')
    elif width > target_width:
        # Resize down if too wide
        gray = cv2.resize(gray, (target_width, height), 
                         interpolation=cv2.INTER_AREA)
    
    # Now all images have same width!
    return gray
```

---

### **Improvement 3: Enhanced Gaussian Blur**

```python
# Current: (3, 3) kernel
gray = cv2.GaussianBlur(gray, (3, 3), 0)

# CRNN uses: (5, 5) kernel - more aggressive
gray = cv2.GaussianBlur(gray, (5, 5), 0)
```

**Recommendation:** Try (5, 5) for handwritten text (more noise)

---

### **Improvement 4: OCR Metrics Implementation**

```python
def calculate_ocr_metrics(predictions, ground_truths):
    """
    Calculate CER, WER, SER like in CRNN notebook
    """
    import editdistance
    
    cer_list, wer_list, ser_list = [], [], []
    
    for pred, gt in zip(predictions, ground_truths):
        # Character Error Rate
        pred_chars = list(pred.lower())
        gt_chars = list(gt.lower())
        cer = editdistance.eval(pred_chars, gt_chars) / max(len(pred_chars), len(gt_chars))
        cer_list.append(cer)
        
        # Word Error Rate
        pred_words = pred.lower().split()
        gt_words = gt.lower().split()
        wer = editdistance.eval(pred_words, gt_words) / max(len(pred_words), len(gt_words))
        wer_list.append(wer)
        
        # Sequence Error Rate
        ser = 1.0 if pred != gt else 0.0
        ser_list.append(ser)
    
    return {
        'CER': sum(cer_list) / len(cer_list),
        'WER': sum(wer_list) / len(wer_list),
        'SER': sum(ser_list) / len(ser_list)
    }
```

**Add to quality_metrics!**

---

## 🎯 **RECOMMENDATIONS FOR OUR OCR**

### **Short-term (Immediate):**

1. **✅ Test BINARY_INV thresholding**
   - Change `THRESH_BINARY` → `THRESH_BINARY_INV`
   - Compare results
   - Use better performing method

2. **✅ Increase Gaussian Blur kernel**
   - Change `(3, 3)` → `(5, 5)`
   - Better for noisy handwritten text

3. **✅ Add CER/WER/SER metrics**
   - Install: `pip install editdistance`
   - Implement metrics function
   - Show in quality tab

4. **✅ Add padding option**
   - Detect max width in dataset
   - Pad images to consistent width
   - Better for batch processing

---

### **Medium-term (1-2 weeks):**

1. **Train Custom CRNN Model**
   ```
   Architecture: Use notebook architecture
   Dataset: Vietnamese addresses or your custom data
   Training: 100 epochs with callbacks
   Expected: 4-5% CER, 15-20% WER
   ```

2. **Implement Attention Mechanism**
   ```python
   # Add between CNN and LSTM
   attention = Attention()([cnn_output, lstm_hidden])
   ```
   **Benefits:** Focus on relevant features

3. **Data Augmentation**
   ```python
   - Rotation: ±5°
   - Scaling: 0.9-1.1x
   - Noise: Gaussian noise
   - Blur: Random blur
   ```

---

### **Long-term (1+ month):**

1. **Vietnamese Language Model**
   - Pre-trained embeddings
   - Contextual corrections
   - Dictionary-based post-processing

2. **Ensemble Models**
   - Multiple CRNN models
   - Vote/average predictions
   - Higher accuracy

3. **Production Optimization**
   - ONNX conversion
   - TensorRT inference
   - GPU acceleration

---

## 🔧 **IMPLEMENTATION PLAN**

### **Phase 1: Quick Wins (Today)**

```python
# File: ocr_pipeline_tesseract_improved.py

class ImprovedTesseractPipeline:
    
    def preprocess_image(self, image):
        # ... existing 5 steps ...
        
        # IMPROVEMENT 1: Use (5,5) Gaussian blur
        gray = cv2.GaussianBlur(gray, (5, 5), 0)  # Was (3,3)
        
        # IMPROVEMENT 2: Try BINARY_INV threshold
        binary = cv2.adaptiveThreshold(
            enhanced, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 4  # Was BINARY, 11, 2
        )
        
        # IMPROVEMENT 3: Add padding
        height, width = binary.shape
        target_width = 2000
        if width < target_width:
            binary = np.pad(binary, ((0,0), (0, target_width - width)), 'median')
        
        return binary
```

**Expected:** +5-10% accuracy improvement

---

### **Phase 2: Add Metrics (Today)**

```python
# File: ocr_metrics.py

import editdistance

def calculate_ocr_metrics(pred_text, true_text):
    """Calculate CER, WER, SER"""
    
    # Character Error Rate
    pred_chars = list(pred_text.lower())
    true_chars = list(true_text.lower())
    cer = editdistance.eval(pred_chars, true_chars) / max(len(pred_chars), len(true_chars))
    
    # Word Error Rate  
    pred_words = pred_text.lower().split()
    true_words = true_text.lower().split()
    wer = editdistance.eval(pred_words, true_words) / max(len(pred_words), len(true_words))
    
    # Sequence Error Rate
    ser = 1.0 if pred_text != true_text else 0.0
    
    return {'CER': cer, 'WER': wer, 'SER': ser}

# Add to quality_metrics response:
quality_metrics = {
    'average_confidence': 0.556,
    'extraction_success_rate': 0.25,
    'cer': 0.05,  # NEW
    'wer': 0.20,  # NEW
    'ser': 0.85   # NEW
}
```

---

### **Phase 3: Build CRNN Model (Future)**

```python
# File: crnn_model.py

def build_vietnamese_crnn(input_shape=(118, 2167, 1), num_classes=141):
    """
    Build CRNN model based on Vietnamese Handwritten notebook
    """
    
    inputs = Input(shape=input_shape)
    
    # CNN Blocks (7 blocks with residual connections)
    x = Conv2D(64, (3,3), padding='same')(inputs)
    x = MaxPool2D(pool_size=3, strides=3)(x)
    x = Activation('relu')(x)
    
    # ... (continue with all 7 blocks from notebook)
    
    # Bidirectional LSTM
    squeezed = Lambda(lambda x: K.squeeze(x, 1))(x)
    blstm_1 = Bidirectional(LSTM(512, return_sequences=True, dropout=0.2))(squeezed)
    blstm_2 = Bidirectional(LSTM(512, return_sequences=True, dropout=0.2))(blstm_1)
    
    # Output layer
    outputs = Dense(num_classes, activation='softmax')(blstm_2)
    
    model = Model(inputs, outputs)
    return model
```

---

## 📊 **COMPARISON: CRNN vs Current OCR**

| Aspect | CRNN (Notebook) | Our Current OCR |
|--------|-----------------|-----------------|
| **Architecture** | Custom CNN + BiLSTM + CTC | Tesseract (black box) |
| **Character Set** | 140 Vietnamese chars | Universal (100+ languages) |
| **Training** | Trained on addresses | Pre-trained (general) |
| **CER** | 4.76% | Unknown (no ground truth) |
| **WER** | 15.66% | Unknown |
| **Vietnamese Support** | ✅ Excellent (native) | ⚠️  Fair (needs vie data) |
| **Handwritten** | ✅ Trained for it | ❌ Not optimized |
| **Customization** | ✅ Full control | ❌ Limited |
| **Setup Complexity** | ⚠️  High (training needed) | ✅ Low (ready to use) |

---

## 🎯 **ACTIONABLE IMPROVEMENTS**

### **Today (Quick Fixes):**

```python
# 1. Update preprocessing
GAUSSIAN_KERNEL = (5, 5)  # Was (3, 3)
THRESHOLD_TYPE = cv2.THRESH_BINARY_INV  # Was BINARY
THRESHOLD_BLOCK = 11  # Same
THRESHOLD_C = 4  # Was 2

# 2. Add padding
TARGET_WIDTH = 2000
if width < TARGET_WIDTH:
    img = np.pad(img, ((0,0), (0, TARGET_WIDTH - width)), 'median')

# 3. Add metrics
pip install editdistance
# Implement CER/WER/SER calculation
```

**Expected impact:** +5-10% accuracy

---

### **This Week (Medium Effort):**

1. **A/B Test Preprocessing**
   - Test BINARY vs BINARY_INV
   - Test different blur kernels
   - Measure impact on confidence scores

2. **Add OCR Metrics**
   - Install editdistance library
   - Implement CER/WER/SER
   - Add to quality_metrics response
   - Display in frontend

3. **Copy Model Weights**
   ```bash
   cp /Users/vietchung/Downloads/crnn/model_checkpoint_weights.hdf5 \
      /Users/vietchung/lmsmath/python-simulations/ocr-simulation/models/
   ```

---

### **Next Month (High Effort):**

1. **Train CRNN on Your Data**
   - Collect Vietnamese student ID dataset
   - Label ground truth
   - Train using notebook architecture
   - Expected: 5-10% CER

2. **Integrate CRNN Model**
   - Load weights in pipeline
   - Replace Tesseract with CRNN
   - Implement CTC decoder
   - Compare performance

3. **Build Vietnamese-specific Pipeline**
   - Vietnamese character set (140 chars)
   - Diacritic handling
   - Common word corrections
   - Language model integration

---

## 📚 **LEARNING INSIGHTS**

### **From CRNN Notebook:**

1. **Preprocessing Matters:**
   - Simple pipeline: Resize → Blur → Threshold
   - But done right: 4.76% CER!

2. **Architecture:**
   - Residual connections help
   - Batch normalization stabilizes
   - BiLSTM captures context

3. **Training:**
   - Early stopping prevents overfitting
   - Best model at epoch 2! (out of 100)
   - Validation loss is key metric

4. **CTC Loss:**
   - Perfect for variable-length text
   - No alignment needed
   - Works great for addresses/handwriting

5. **Vietnamese Support:**
   - 140 unique characters
   - Handles diacritics well
   - 4.76% CER is excellent!

---

## ✅ **IMMEDIATE ACTION ITEMS**

### **Priority 1 (Today):**

- [ ] Test BINARY_INV threshold
- [ ] Increase Gaussian blur to (5,5)
- [ ] Add padding option
- [ ] Install editdistance: `pip install editdistance`

### **Priority 2 (This Week):**

- [ ] Implement CER/WER/SER metrics
- [ ] A/B test preprocessing variants
- [ ] Add metrics to quality tab
- [ ] Document results

### **Priority 3 (Future):**

- [ ] Copy CRNN model weights
- [ ] Implement CRNN inference
- [ ] Train on custom dataset
- [ ] Replace Tesseract with CRNN

---

## 🎉 **SUMMARY**

### **Key Takeaways:**

1. **CRNN achieves 4.76% CER** on Vietnamese handwriting
   - Much better than general Tesseract
   - Specifically trained for Vietnamese

2. **Simple but effective preprocessing:**
   - Resize to fixed height
   - Gaussian blur (5,5)
   - Adaptive threshold INV
   - Padding to fixed width

3. **Architecture works:**
   - 7 CNN blocks + residual
   - 2 BiLSTM layers
   - CTC loss
   - 140 Vietnamese characters

4. **We can apply these techniques immediately:**
   - Update preprocessing parameters
   - Add padding
   - Test threshold inversion
   - Implement metrics

---

## 📈 **EXPECTED IMPROVEMENTS**

### **After applying CRNN insights:**

| Metric | Current | Expected | Change |
|--------|---------|----------|--------|
| **CER** | Unknown | 8-12% | NEW metric |
| **WER** | Unknown | 20-30% | NEW metric |
| **Confidence** | 55.6% | 60-70% | +5-15% |
| **Extraction** | 25% | 35-45% | +10-20% |

---

**Status:** ✅ **Analysis Complete**  
**Next:** Implement improvements  
**Expected:** Significant quality boost!

