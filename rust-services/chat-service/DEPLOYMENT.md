# Deployment Guide

This guide covers deploying the Chat Service to production.

## Pre-Deployment Checklist

### Security
- [ ] Change `JWT_SECRET` to a strong random value (minimum 32 characters)
  ```bash
  openssl rand -base64 32
  ```
- [ ] Configure HTTPS/TLS for all endpoints
- [ ] Enable CORS only for your domain (not `*` in production)
- [ ] Set appropriate database passwords
- [ ] Restrict database access to service IP only
- [ ] Enable PostgreSQL SSL/TLS connections
- [ ] Implement rate limiting on API endpoints
- [ ] Set up WAF rules if using cloud provider

### Performance
- [ ] Set appropriate database connection pool size (default: 5)
- [ ] Configure PostgreSQL max_connections for expected load
- [ ] Test WebSocket performance with multiple concurrent clients
- [ ] Enable compression for HTTP responses
- [ ] Consider using CDN for static files (if any)

### Reliability
- [ ] Set up PostgreSQL backups with point-in-time recovery
- [ ] Configure database replication/HA if needed
- [ ] Set up health check monitoring
- [ ] Configure auto-restart on failure
- [ ] Plan for graceful shutdown handling
- [ ] Test disaster recovery procedures

### Operations
- [ ] Set up structured logging to log aggregation service
- [ ] Configure log rotation and retention
- [ ] Set up alerting for errors and performance degradation
- [ ] Document runbooks for common issues
- [ ] Plan for database scaling
- [ ] Set up monitoring dashboards

## Development to Production Migration

### Step 1: Environment Configuration

Update `.env` for production:

```env
# Production database - must be PostgreSQL 12+
DATABASE_URL=postgres://chat_user:STRONG_PASSWORD@db.prod.example.com:5432/aeroedu

# Use FQDN or load balancer address
CHAT_SERVICE_ADDR=0.0.0.0:8096

# Generate strong secret
JWT_SECRET=your-very-long-random-secret-generated-with-openssl

# Production logging
RUST_LOG=info
```

### Step 2: Database Preparation

```bash
# Create production database and user
createdb aeroedu
createuser chat_user
psql -c "ALTER USER chat_user WITH PASSWORD 'STRONG_PASSWORD';"

# Apply migrations
PGPASSWORD='STRONG_PASSWORD' psql -h db.prod.example.com \
  -U chat_user -d aeroedu < migrations/001_chat.sql

# Create appropriate indexes (included in migration)
# Verify indexes exist
psql -h db.prod.example.com -U chat_user -d aeroedu -c "\di"
```

### Step 3: Build for Production

```bash
# Build optimized release binary
cargo build --release

# Binary location: target/release/chat-service
# Size: ~30MB (can be stripped further if needed)

# Optional: Strip binary to reduce size
strip target/release/chat-service
```

### Step 4: Docker Deployment

```bash
# Build production image
docker build -t aeroedu/chat-service:1.0.0 .

# Test image locally
docker run --rm \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  -p 8096:8096 \
  aeroedu/chat-service:1.0.0

# Push to registry
docker login registry.example.com
docker tag aeroedu/chat-service:1.0.0 registry.example.com/aeroedu/chat-service:1.0.0
docker push registry.example.com/aeroedu/chat-service:1.0.0
```

## Kubernetes Deployment

### ConfigMap for non-sensitive configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chat-service-config
  namespace: aeroedu
data:
  CHAT_SERVICE_ADDR: "0.0.0.0:8096"
  RUST_LOG: "info"
```

### Secret for sensitive data

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: chat-service-secrets
  namespace: aeroedu
type: Opaque
stringData:
  DATABASE_URL: "postgres://chat_user:PASSWORD@postgres.aeroedu.svc.cluster.local:5432/aeroedu"
  JWT_SECRET: "your-very-long-random-secret"
```

### Deployment manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-service
  namespace: aeroedu
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chat-service
  template:
    metadata:
      labels:
        app: chat-service
    spec:
      containers:
      - name: chat-service
        image: registry.example.com/aeroedu/chat-service:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8096
          name: http
        envFrom:
        - configMapRef:
            name: chat-service-config
        - secretRef:
            name: chat-service-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 8096
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8096
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        securityContext:
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL

      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - chat-service
              topologyKey: kubernetes.io/hostname
```

### Service manifest

```yaml
apiVersion: v1
kind: Service
metadata:
  name: chat-service
  namespace: aeroedu
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8096
    protocol: TCP
    name: http
  selector:
    app: chat-service
```

### Ingress manifest (for HTTPS)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chat-service-ingress
  namespace: aeroedu
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/websocket-services: chat-service
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - chat.aeroedu.example.com
    secretName: chat-service-tls
  rules:
  - host: chat.aeroedu.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: chat-service
            port:
              number: 80
```

## AWS ECS Deployment

### Task Definition

```json
{
  "family": "chat-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "chat-service",
      "image": "ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/aeroedu/chat-service:1.0.0",
      "portMappings": [
        {
          "containerPort": 8096,
          "hostPort": 8096,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "CHAT_SERVICE_ADDR",
          "value": "0.0.0.0:8096"
        },
        {
          "name": "RUST_LOG",
          "value": "info"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:chat-service/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:chat-service/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/chat-service",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8096/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      }
    }
  ]
}
```

## Azure Container Instances

```bash
# Create container instance
az container create \
  --resource-group aeroedu-rg \
  --name chat-service \
  --image registry.example.com/aeroedu/chat-service:1.0.0 \
  --ports 8096 \
  --environment-variables \
    CHAT_SERVICE_ADDR=0.0.0.0:8096 \
    RUST_LOG=info \
  --secrets \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="$JWT_SECRET" \
  --cpu 1 \
  --memory 1 \
  --ip-address Public \
  --dns-name-label chat-service
```

## Monitoring and Observability

### Prometheus Metrics

Consider adding prometheus metrics by adding dependency:

```toml
prometheus = "0.13"
```

Then create metrics for:
- HTTP request count/duration
- WebSocket connections
- Database query duration
- Message throughput

### Logging

Logs are structured with tracing. Parse fields like:
- `timestamp`: ISO 8601 timestamp
- `level`: ERROR, WARN, INFO, DEBUG
- `target`: Which module
- `message`: Log message
- `user_id`: If relevant
- `room_id`: If relevant

### Alerting

Set up alerts for:
- Service down (health check failures)
- Error rate > 1%
- Response time > 1000ms
- Database connection failures
- Memory usage > 80%
- Disk space < 20%

Example Prometheus alert:

```yaml
groups:
- name: chat-service
  rules:
  - alert: ChatServiceDown
    expr: up{job="chat-service"} == 0
    for: 2m
    annotations:
      summary: "Chat Service is down"
```

## Scaling Considerations

### Horizontal Scaling

The service is stateless except for WebSocket broadcast channels:

1. Multiple instances can run behind a load balancer
2. WebSocket clients must be sticky-routed to same instance
3. Or use Redis for distributed broadcast channels (not included)

### Vertical Scaling

Increase resources if:
- CPU > 80% consistently
- Memory > 80% consistently
- Database connections exhausted

### Database Scaling

For high load:
1. Implement read replicas for queries
2. Use connection pooling (pgbouncer)
3. Shard by room_id if message volume is extreme
4. Archive old messages to separate table

## Rollback Procedure

```bash
# If deployment fails, rollback to previous version
kubectl rollout undo deployment/chat-service -n aeroedu

# Or with docker-compose
docker-compose down
docker-compose up -d  # Uses previous image from compose file
```

## Zero-Downtime Deployment

```yaml
# Update deployment strategy in Kubernetes
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  minReadySeconds: 10
```

This ensures:
1. New pod starts and is ready
2. Old pod is only removed after new pod is ready
3. Requests are load balanced between versions during rollout

## Performance Tuning

### PostgreSQL Configuration

```sql
-- For moderate load (< 1000 concurrent)
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

SELECT pg_reload_conf();
```

### Application Tuning

For high message throughput, consider:
1. Increasing broadcast channel buffer: `broadcast::channel(1000)`
2. Batching database writes (trade latency for throughput)
3. Connection pool sizing: `sqlx::postgres::PgPoolOptions::new().max_connections(20)`

## Disaster Recovery

### Backup Strategy

```bash
# Daily full backup to S3
pg_dump -h db.prod.example.com -U chat_user aeroedu | \
  aws s3 cp - s3://aeroedu-backups/chat-db-$(date +%Y%m%d).sql.gz

# Enable WAL archiving for point-in-time recovery
# In postgres.conf:
# archive_mode = on
# archive_command = 'aws s3 cp %p s3://aeroedu-backups/wal/%f'
```

### Recovery Procedure

```bash
# 1. Restore from backup
aws s3 cp s3://aeroedu-backups/chat-db-20240409.sql.gz - | \
  gunzip | psql -h db.prod.example.com -U chat_user aeroedu

# 2. Restore to point-in-time if needed
# (requires WAL archiving to be enabled)
```

## Compliance and Audit

- [ ] Enable PostgreSQL logging for audit trail
- [ ] Implement request/response logging middleware
- [ ] Store logs for minimum 90 days
- [ ] Regular security audits
- [ ] GDPR data deletion capability
- [ ] Data retention policies

## Support and Troubleshooting

In production, collect:
1. Service logs (last 100 lines)
2. Database slow queries log
3. Health check status
4. Resource utilization metrics
5. Recent configuration changes

Then refer to [SETUP.md](./SETUP.md) troubleshooting section.
