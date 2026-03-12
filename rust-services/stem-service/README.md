# Aeroeduvison STEM Service

Rust STEM service handling:
- Physics simulations (motion, projectile, harmonic)
- Chemistry labs (3D molecule, balance, enthalpy)
- STEM projects
- Lab completion tracking

## Quick Start

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/stem-service
cargo run
```

Default: `http://127.0.0.1:8097`

## Environment Variables

```bash
# Server
STEM_SERVICE_ADDR=127.0.0.1:8097

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aeroeduvison

# JWT (for auth validation)
JWT_SECRET=your-super-secret-key-min-32-chars
```

## API Endpoints

### Physics Simulations
- `POST /api/physics/motion` - Motion simulation
- `POST /api/physics/projectile` - Projectile motion
- `POST /api/physics/harmonic` - Harmonic motion

### Chemistry Labs
- `POST /api/chemistry/balance` - Chemical balance
- `POST /api/chemistry/enthalpy` - Enthalpy calculation
- `GET /api/chemistry/molecule/3d` - 3D molecule viewer

### STEM Projects
- `GET /api/stem/projects` - List projects
- `POST /api/stem/projects` - Create project
- `GET /api/stem/projects/:id` - Get project
- `PUT /api/stem/projects/:id` - Update project
- `DELETE /api/stem/projects/:id` - Delete project

### Lab Tracking
- `GET /api/lab-completion` - List completions
- `POST /api/lab-completion` - Record completion

## Health Check

```bash
curl http://127.0.0.1:8097/health
```

## Testing

```bash
cargo test
```
