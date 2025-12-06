# ObsFly License Server

Multi-tenant license and usage management system for ObsFly observability platform.

## Features

✅ **Multi-Account Management** - Main accounts with sub-accounts (teams/projects)  
✅ **License Key Generation** - Automatic license and API key generation  
✅ **Dual Usage Tracking** - Track both metric count and GB ingestion  
✅ **Configurable Quotas** - Per-account and per-sub-account limits  
✅ **Real-time Validation** - Fast license validation with quota checks  
✅ **Billing Support** - Usage aggregation for invoice generation  
✅ **Alert System** - Quota warnings and license expiration  

## Quick Start

### Prerequisites
- PostgreSQL 12+
- Go 1.21+

### Setup

```bash
cd /home/namlabs/personal/prod/obsfly/apps/license-server

# Run setup (creates DB and builds server)
./setup.sh

# Start server
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=obsfly_license
export PORT=8081

./license-server
```

### Using Docker

```bash
docker-compose up -d
```

## API Endpoints

### Account Management
- `POST /api/accounts` - Create new account with license
- `GET /api/accounts/{id}` - Get account details
- `POST /api/accounts/{id}/sub-accounts` - Create sub-account
- `GET /api/accounts/{id}/sub-accounts` - List sub-accounts

### License Validation
- `POST /api/licenses/validate` - Validate API key
- `GET /api/licenses/status?key={key}` - Check license status

### Usage Tracking
- `POST /api/usage/ingest` - Ingest usage data
- `GET /api/usage/{accountId}/current` - Get current usage
- `GET /api/usage/{accountId}/history?days=30` - Get historical usage

## Example Usage

### Create Account
```bash
curl -X POST http://localhost:8081/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "company": "Acme Corporation",
    "plan_type": "pro"
  }'
```

Response:
```json
{
  "account_id": 1,
  "license_key": "LIC-12345678-abcd-...",
  "name": "Acme Corp",
  "email": "admin@acme.com",
	"status": "active",
  "plan_type": "pro"
}
```

### Validate License
```bash
curl -X POST http://localhost:8081/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"api_key": "API-12345678-abcd-..."}'
```

Response:
```json
{
  "valid": true,
  "account_id": 1,
  "sub_account_id": 5,
  "status": "active",
  "quota_status": {
    "metric_count_remaining": 85000000,
    "storage_gb_remaining": 75.5,
    "is_blocked": false
  }
}
```

### Report Usage
```bash
curl -X POST http://localhost:8081/api/usage/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 1,
    "sub_account_id": 5,
    "metric_count": 10000,
    "storage_bytes": 5242880
  }'
```

## Database Schema

The system uses PostgreSQL with the following key tables:
- `accounts` - Organizations with license keys
- `sub_accounts` - Teams/projects with API keys
- `quotas` - Usage limits (metric count + GB)
- `usage_events` - Raw usage data
- `usage_hourly/daily/monthly` - Aggregated usage
- `alerts` - System alerts
- `invoices` - Billing records

## Integration with ObsFly

### 1. Validate on Every Request
```go
// In ObsFly backend middleware
func LicenseMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        apiKey := r.Header.Get("X-API-Key")
        
        // Call license server
        valid := validateLicense(apiKey)
        if !valid.IsValid || valid.QuotaStatus.IsBlocked {
            http.Error(w, "Invalid license or quota exceeded", 403)
            return
        }
        
        // Add account context to request
        ctx := context.WithValue(r.Context(), "account_id", valid.AccountID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### 2. Report Usage Periodically
```go
// Report every 5 minutes
func ReportUsage() {
    usage := collectUsage() // From local counters
    
    http.Post("http://license-server:8081/api/usage/ingest", 
        "application/json",
        marshalUsage(usage))
}
```

## Pricing Plans

| Plan | Base Price | Metrics | Storage | Overage |
|------|-----------|---------|---------|---------|
| Free | $0 | 1M | 1 GB | N/A |
| Starter | $29 | 10M | 10 GB | $5/M metrics, $2/GB |
| Pro | $99 | 100M | 100 GB | $3/M metrics, $1/GB |
| Enterprise | $499 | 1B | 1 TB | $1/M metrics, $0.50/GB |

## Development

### Running Tests
```bash
go test ./...
```

### Building
```bash
go build -o license-server cmd/server/main.go
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_USER | postgres | Database user |
| DB_PASSWORD | postgres | Database password |
| DB_NAME | obsfly_license | Database name |
| PORT | 8081 | Server port |

## License

MIT
