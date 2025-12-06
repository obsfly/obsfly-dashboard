# ObsFly Stack - Complete Deployment Guide

## 🚀 Quick Start

```bash
# Development mode (with data generator)
./run.sh --dev

# Production mode (no dummy data)
./run.sh --prod
```

That's it! One command starts everything.

---

## 📋 What Gets Started

1. **PostgreSQL** - License database (port 5433)
2. **ClickHouse** - Metrics storage (port 8123)
3. **Redis** - Session management (port 6379)
4. **License Server** - Multi-tenant licensing (port 8081)
5. **Backend** - Metrics API (port 8080) [when ready]
6. **Frontend** - Dashboard UI (port 3000) [when ready]
7. **Data Generator** - Simulates infrastructure (**dev only**)

---

## ⚙️ Configuration

### Environment File

Copy and edit `.env`:
```bash
cp .env.example .env
nano .env
```

### Key Settings

```bash
# Switch between dev/prod
ENVIRONMENT=dev

# Customize ports
FRONTEND_PORT=3000
BACKEND_PORT=8080
LICENSE_SERVER_PORT=8081

# Prometheus metrics ports
BACKEND_METRICS_PORT=9090
LICENSE_METRICS_PORT=9091

# Enable/disable metrics
ENABLE_BACKEND_METRICS=true
ENABLE_LICENSE_METRICS=true

# Data generator (dev only)
NUM_HOSTS=20
BATCH_INTERVAL_SECONDS=30
```

---

## 📊 Prometheus Metrics

### Exposed Metrics

All services expose Prometheus metrics on dedicated ports:

**License Server** (`:9091/metrics`):
- `http_requests_total{method,path,status}` - Total requests
- `http_request_duration_seconds{method,path}` - Latency
- `http_request_duration_seconds_p90` - P90 latency
- `http_request_duration_seconds_p95` - P95 latency
- `http_request_duration_seconds_p99` - P99 latency
- `http_requests_success_total` - Successful requests
- `http_requests_error_total{status}` - Failed requests

**Backend** (`:9090/metrics`):
- Same as above, plus:
- `clickhouse_queries_total` - ClickHouse queries
- `clickhouse_query_duration_seconds` - Query latency

### Access Metrics

```bash
# License Server
curl http://localhost:909/metrics

# Backend
curl http://localhost:9090/metrics

# Frontend (if enabled)
curl http://localhost:9092/metrics
```

### Prometheus Configuration

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'license-server'
    static_configs:
      - targets: ['localhost:9091']
  
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:9090']
```

### Grafana Dashboards

Import these metrics to visualize:
- API latency (p90, p95, p99)
- Success vs error rates
- Request throughput
- Database query performance

---

## 🔧 Migration Controller

If you have a migration controller binary:

1. **Place it:**
   ```bash
   mkdir -p bin
   cp /path/to/migration-controller bin/
   chmod +x bin/migration-controller
   ```

2. **Configure:**
   ```bash
   # In .env
   MIGRATION_CONTROLLER_PATH=./bin/migration-controller
   AUTO_MIGRATE=true
   ```

3. **Automatic:** Migrations run on startup

### Manual Migration

```bash
# All databases
./bin/migration-controller migrate --all

# Specific
./bin/migration-controller migrate --clickhouse
./bin/migration-controller migrate --postgres
./bin/migration-controller migrate --redis
```

---

## 💻 Commands

### Start/Stop

```bash
# Start (dev mode)
./run.sh --dev

# Start (prod mode)
./run.sh --prod

# Start without building
./run.sh --dev --skip-build

# Start without migrations
./run.sh --dev --skip-migration

# Clean start
./run.sh --dev --cleanup

# Stop all
docker-compose stop

# Restart service
docker-compose restart license-server

# Shutdown
docker-compose down

# Reset all data
docker-compose down -v
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f license-server

# Last 100 lines
docker-compose logs --tail=100 data-generator
```

### Health Checks

```bash
# License Server
curl http://localhost:8081/health

#Backend
curl http://localhost:8080/health

# All services status
docker-compose ps
```

---

## 🌍 Environment Modes

### Development Mode (`--dev`)

**Features:**
✅ Data generator running  
✅ Seed data loaded  
✅ Debug logging enabled  
✅ All metrics enabled  
✅ 20 simulated hosts  

**Use for:**
- Local development
- Testing
- Demo/POC

### Production Mode (`--prod`)

**Features:**
✅ No data generator  
✅ Production logging  
✅ Optimized builds  
✅ Security hardened  
✅ Configurable metrics  

**Use for:**
- Staging
- Production deployment
- Performance testing

---

## 📦 Service Details

### License Server

**Ports:**
- API: 8081
- Metrics: 9091

**Metrics:**
- All API endpoints
- Authentication latency
- Quota check performance
- Database query times

### Backend

**Ports:**
- API: 8080
- Metrics: 9090

**Metrics:**
- Dashboard query latency
- ClickHouse performance
- License validation time
- API endpoint metrics

### Frontend

**Ports:**
- UI: 3000
- Metrics: 9092 (optional)

**Metrics:**
- Page load times
- API call latency
- User interactions

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :8080

# Change port in .env
LICENSE_SERVER_PORT=8082

# Restart
./run.sh --dev
```

### Services Won't Start

```bash
# Check logs
docker-compose logs license-server

# Verify Docker
docker info

# Rebuild
docker-compose build --no-cache license-server
./run.sh --dev --skip-migration
```

### Metrics Not Showing

```bash
# Check if enabled
grep ENABLE_LICENSE_METRICS .env

# Test endpoint
curl http://localhost:9091/metrics

# Verify container port
docker-compose ps
```

### Data Generator Not Running

```bash
# Verify dev mode
echo $ENVIRONMENT  # Should be 'dev'

# Check logs
docker-compose logs data-generator

# Manual start
docker-compose --profile dev up -d data-generator
```

---

## 📈 Monitoring Setup

### Complete Stack with Prometheus & Grafana

```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Example Queries

**P95 Latency:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Error Rate:**
```promql
rate(http_requests_error_total[5m]) / rate(http_requests_total[5m])
```

**Throughput:**
```promql
rate(http_requests_total[1m])
```

---

## ✅ Verification

After starting, verify all services:

```bash
# License Server
curl http://localhost:8081/health
# Expected:{"status":"ok"}

# Metrics
curl http://localhost:9091/metrics | grep http_requests_total

# Database
docker-compose exec postgres psql -U postgres -d obsfly_license -c "SELECT COUNT(*) FROM accounts;"

# ClickHouse
docker-compose exec clickhouse clickhouse-client -q "SELECT count() FROM metrics.metrics_v1"
```

---

## 🔒 Production Checklist

Before deploying to production:

- [ ] Set `ENVIRONMENT=prod`
- [ ] Change all passwords in `.env`
- [ ] Generate secure `JWT_SECRET`
- [ ] Configure SSL/TLS
- [ ] Set up reverse proxy (nginx/traefik)
- [ ] Configure firewall rules
- [ ] Enable Prometheus monitoring
- [ ] Set up Grafana dashboards
- [ ] Configure log aggregation (ELK/Loki)
- [ ] Set up database backups
- [ ] Configure alerts (PagerDuty/Slack)
- [ ] Review metrics configuration

---

## 📚 Additional Resources

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Dashboards**: https://grafana.com/grafana/dashboards/
- **Docker Compose**: https://docs.docker.com/compose/

---

## 🆘 Support

For issues:
1. Check logs: `docker-compose logs [service]`
2. Verify config: `cat .env`
3. Test health: `curl http://localhost:8081/health`
4. Check metrics: `curl http://localhost:9091/metrics`
5. Review status: `docker-compose ps`
