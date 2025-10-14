# WFC Builder - Wave Function Collapse 3D 🏗️

Procedural generation system sử dụng thuật toán Wave Function Collapse để tạo cấu trúc 3D modular.

## Tính năng

- ✅ **WFC Algorithm**: Thuật toán Wave Function Collapse 3D đầy đủ
- ✅ **Multiple Tilesets**: Simple blocks, Building blocks, Dungeon tiles
- ✅ **AI Pattern Generator**: Tạo patterns procedurally theo style
- ✅ **Constraint System**: Adjacency rules cho từng tile
- ✅ **3D Visualization**: Isometric voxel renderer
- ✅ **Export JSON**: Xuất cấu trúc ra JSON format

## Cài đặt

```bash
# Install dependencies
pip install -r requirements.txt

# Build static data
python build.py

# Start API server
./start_api.sh
# hoặc
python api.py
```

## API Endpoints

### POST /generate
Generate cấu trúc 3D mới:

```json
{
  "width": 10,
  "height": 10,
  "depth": 10,
  "tileset": "building_blocks",
  "seed": 42,
  "max_iterations": 1000
}
```

### POST /patterns/generate
Generate AI pattern:

```json
{
  "style": "modern"
}
```

### GET /patterns/styles
Lấy danh sách pattern styles

### GET /tilesets
Lấy danh sách tilesets

### GET /presets
Lấy presets có sẵn

## Thuật toán WFC

### Các bước

1. **Initialization**: Mỗi cell có thể là bất kỳ tile nào
2. **Observe**: Tìm cell với entropy thấp nhất
3. **Collapse**: Chọn ngẫu nhiên một tile
4. **Propagate**: Cập nhật constraints cho neighbors
5. **Repeat**: Lặp lại cho đến khi hoàn thành

### Entropy

```
Entropy(cell) = số lượng tiles có thể đặt ở cell đó
```

Cell với entropy = 1: Chỉ có 1 lựa chọn  
Cell với entropy = 0: Contradiction (thất bại)

### Adjacency Rules

Mỗi tile định nghĩa tiles nào có thể nằm kế bên:

```python
tile = Tile(
    id='wall',
    adjacent_rules={
        '+x': ['wall', 'door', 'window'],  # Bên phải
        '-x': ['wall', 'door', 'window'],  # Bên trái
        '+y': ['wall', 'roof'],            # Phía trên
        '-y': ['floor'],                   # Phía dưới
        '+z': ['wall', 'window'],          # Phía trước
        '-z': ['wall', 'window']           # Phía sau
    }
)
```

## Tilesets

### 1. Simple Blocks
- `solid`: Khối đặc
- `empty`: Không gian trống

### 2. Building Blocks
- `floor`: Sàn nhà
- `wall`: Tường
- `window`: Cửa sổ
- `door`: Cửa ra vào
- `roof`: Mái nhà
- `corner`: Góc
- `empty`: Không gian

### 3. Dungeon
- `corridor`: Hành lang
- `junction`: Ngã tư
- `room`: Phòng
- `wall`: Tường
- `empty`: Không gian

## AI Pattern Styles

### Modern
- Glass walls
- Concrete structure
- Steel beams
- Contemporary architecture

### Medieval
- Stone walls
- Towers
- Battlements
- Castle architecture

### Futuristic
- Energy panels
- Metal panels
- Tech cores
- Sci-fi architecture

### Nature
- Tree trunks
- Leaves
- Branches
- Organic structures

## Ví dụ sử dụng

### Python

```python
from main import run_wfc_simulation

# Generate small house
config = {
    'width': 8,
    'height': 6,
    'depth': 8,
    'tileset': 'building_blocks',
    'seed': 42,
    'max_iterations': 1000
}

result = run_wfc_simulation(config)
print(f"Generated {len(result['voxels'])} voxels")
print(f"Success: {result['statistics']['success']}")
```

### API

```bash
# Generate structure
curl -X POST http://localhost:8008/generate \
  -H "Content-Type: application/json" \
  -d '{
    "width": 10,
    "height": 8,
    "depth": 10,
    "tileset": "dungeon",
    "seed": 123,
    "max_iterations": 1000
  }'

# Get pattern styles
curl http://localhost:8008/patterns/styles

# Generate AI pattern
curl -X POST http://localhost:8008/patterns/generate \
  -H "Content-Type: application/json" \
  -d '{"style": "medieval"}'
```

## Xử lý Contradictions

WFC có thể gặp contradiction khi constraints không thể thỏa mãn:

- **Backtracking**: Quay lại và thử lựa chọn khác (chưa implement)
- **Restart**: Bắt đầu lại với seed khác
- **Relaxing constraints**: Giảm độ strict của rules

## Performance

- **Small (5×5×5)**: ~0.1s, 100-200 iterations
- **Medium (10×10×10)**: ~1-2s, 300-500 iterations  
- **Large (20×20×20)**: ~10-30s, 1000-2000 iterations

## Tham khảo

- [Original WFC Paper](https://github.com/mxgmn/WaveFunctionCollapse)
- [WFC Explained](https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/)
- [Constraint Satisfaction](https://en.wikipedia.org/wiki/Constraint_satisfaction_problem)

## License

MIT


