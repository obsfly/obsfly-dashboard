#!/bin/bash
#==============================================================================
# ObsFly Complete Stack Launcher
# Single command to run: Frontend, Backend, License Server, Databases
# Supports: Dev/Prod modes, Configurable ports, Prometheus metrics
#==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default configuration
ENVIRONMENT="${ENVIRONMENT:-dev}"
CONFIG_FILE="${CONFIG_FILE:-.env}"

#==============================================================================
# FUNCTIONS
#==============================================================================

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}           ${BLUE}ObsFly Complete Stack${NC}                    ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}     Frontend + Backend + License Server          ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_step() { echo -e "${BLUE}▶${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_info() { echo -e "${CYAN}ℹ${NC} $1"; }

load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        log_step "Loading configuration from $CONFIG_FILE"
        set -a
        source "$CONFIG_FILE"
        set +a
        log_success "Configuration loaded"
    else
        log_warning "Config file $CONFIG_FILE not found, using defaults"
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Created .env from .env.example"
            set -a
            source .env
            set +a
        fi
    fi
    
    # Set defaults if not in config
    export ENVIRONMENT="${ENVIRONMENT:-dev}"
    export POSTGRES_PORT="${POSTGRES_PORT:-5433}"
    export CLICKHOUSE_HTTP_PORT="${CLICKHOUSE_HTTP_PORT:-8123}"
    export REDIS_PORT="${REDIS_PORT:-6379}"
    export BACKEND_PORT="${BACKEND_PORT:-8082}"
    export FRONTEND_PORT="${FRONTEND_PORT:-3000}"
    export LICENSE_SERVER_PORT="${LICENSE_SERVER_PORT:-8081}"
    export BACKEND_METRICS_PORT="${BACKEND_METRICS_PORT:-9093}"
    export LICENSE_METRICS_PORT="${LICENSE_METRICS_PORT:-9091}"
    export FRONTEND_METRICS_PORT="${FRONTEND_METRICS_PORT:-9092}"
}

check_requirements() {
    log_step "Checking requirements..."
    
    local missing=0
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not installed"
        missing=1
    fi
    
    if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose not installed"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker daemon not running"
        exit 1
    fi
    
    log_success "All requirements met"
}

run_migrations() {
    local migration_bin="${MIGRATION_CONTROLLER_PATH:-./bin/migration-controller}"
    
    if [ -f "$migration_bin" ]; then
        log_step "Running migrations with controller: $migration_bin"
        $migration_bin migrate --all || log_warning "Migration controller failed, will use Docker init scripts"
        log_success "Migrations completed"
    else
        log_info "Migration controller not found, using Docker init scripts"
    fi
}

build_images() {
    log_step "Building Docker images..."
    
    docker compose build --parallel 2>&1 | grep -E '(Step|Successfully|ERROR)' || true
    
    log_success "Docker images built"
}

start_databases() {
    log_step "Starting databases (PostgreSQL, ClickHouse, Redis)..."
    
    docker compose up -d postgres clickhouse redis
    
    log_info "Waiting for databases to initialize (30s)..."
    sleep 30
    
    # Health check
    if docker compose ps postgres | grep -q "Up"; then
        log_success "PostgreSQL started on port $POSTGRES_PORT"
    fi
    
    if docker compose ps clickhouse | grep -q "Up"; then
        log_success "ClickHouse started on ports $CLICKHOUSE_HTTP_PORT/9000"
    fi
    
    if docker compose ps redis | grep -q "Up"; then
        log_success "Redis started on port $REDIS_PORT"
    fi
}

start_services() {
    log_step "Starting application services..."
    
    # License Server
    docker compose up -d license-server
    sleep 5
    log_success "License Server started (port $LICENSE_SERVER_PORT, metrics $LICENSE_METRICS_PORT)"
    
    # Backend (if exists)
    if docker compose config --services 2>/dev/null | grep -q "backend"; then
        docker compose up -d backend
        sleep 5
        log_success "Backend started (port $BACKEND_PORT, metrics $BACKEND_METRICS_PORT)"
    fi
    
    # Frontend (if exists)
    if docker compose config --services 2>/dev/null | grep -q "frontend"; then
        docker compose up -d frontend
        log_success "Frontend started (port $FRONTEND_PORT)"
    fi
}

verify_health() {
    log_step "Verifying service health..."
    
    sleep 5
    
    # License Server
    if curl -f -s http://localhost:${LICENSE_SERVER_PORT}/health > /dev/null 2>&1; then
        log_success "License Server healthy"
    else
        log_warning "License Server health check pending"
    fi
    
    # Backend
    if curl -f -s http://localhost:${BACKEND_PORT}/health > /dev/null 2>&1; then
        log_success "Backend healthy"
    fi
    
    # Metrics endpoints
    if [ "${ENABLE_LICENSE_METRICS:-true}" = "true" ]; then
        if curl -f -s http://localhost:${LICENSE_METRICS_PORT}/metrics > /dev/null 2>&1; then
            log_success "License Server metrics available"
        fi
    fi
}

show_status() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}              ${GREEN}Stack Successfully Started!${NC}              ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${YELLOW}Environment:${NC} $ENVIRONMENT"
    echo ""
    
    echo -e "${YELLOW}🌐 Application URLs:${NC}"
    echo "   Frontend:        http://localhost:${FRONTEND_PORT}"
    echo "   Backend API:     http://localhost:${BACKEND_PORT}"
    echo "   License Server:  http://localhost:${LICENSE_SERVER_PORT}"
    echo ""
    
    echo -e "${YELLOW}📊 Prometheus Metrics:${NC}"
    [ "${ENABLE_LICENSE_METRICS:-true}" = "true" ] && \
        echo "   License Server:  http://localhost:${LICENSE_METRICS_PORT}/metrics"
    [ "${ENABLE_BACKEND_METRICS:-true}" = "true" ] && \
        echo "   Backend:         http://localhost:${BACKEND_METRICS_PORT}/metrics"
    [ "${ENABLE_FRONTEND_METRICS:-false}" = "true" ] && \
        echo "   Frontend:        http://localhost:${FRONTEND_METRICS_PORT}/metrics"
    echo ""
    
    echo -e "${YELLOW}🗄️  Databases:${NC}"
    echo "   PostgreSQL:      localhost:${POSTGRES_PORT}"
    echo "   ClickHouse:      localhost:${CLICKHOUSE_HTTP_PORT}"
    echo "   Redis:           localhost:${REDIS_PORT}"
    echo ""
    
    if [ "${ENABLE_DATA_GENERATOR:-true}" = "true" ]; then
        echo -e "${YELLOW}🔧 Data Generator:${NC}"
        echo "   Embedded in:     Backend Service"
        echo "   Nodes:           ${NUM_NODES:-100}"
        echo "   Services/Node:   ${SERVICES_PER_NODE:-10}"
        echo "   Interval:        ${GENERATION_INTERVAL_SECONDS:-10}s"
        echo "   Config:          apps/backend/configs/data-config.yaml"
        echo ""
    fi
    
    echo -e "${YELLOW}📋 Service Status:${NC}"
    docker compose ps
    echo ""
    
    echo -e "${YELLOW}💡 Useful Commands:${NC}"
    echo "   View logs:       docker compose logs -f [service]"
    echo "   Stop all:        docker compose stop"
    echo "   Restart:         docker compose restart [service]"
    echo "   Shutdown:        docker compose down"
    echo "   Reset data:      docker compose down -v"
    echo ""
    
    echo -e "${YELLOW}🔐 Test Credentials:${NC}"
    echo "   Admin:           admin@acme-demo.com / Acme@2024!"
    echo "   Super Admin:     admin@obsfly.local / change-me-immediately"
    echo ""
}

cleanup() {
    log_step "Cleaning up old containers..."
    docker compose down 2>/dev/null || true
    log_success "Cleanup complete"
}

#==============================================================================
# MAIN EXECUTION
#==============================================================================

print_banner

# Parse arguments
SKIP_BUILD=false
SKIP_MIGRATION=false
CLEANUP_FIRST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            export ENVIRONMENT=dev
            shift ;;
        --prod)
            export ENVIRONMENT=prod
            shift ;;
        --skip-build)
            SKIP_BUILD=true
            shift ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift ;;
        --cleanup)
            CLEANUP_FIRST=true
            shift ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev              Run in development mode (with data generator)"
            echo "  --prod             Run in production mode (no data generator)"
            echo "  --skip-build       Skip Docker image build"
            echo "  --skip-migration   Skip database migrations"
            echo "  --cleanup          Remove old containers before starting"
            echo "  --help             Show this help"
            echo ""
            echo "Environment variables (override with .env file):"
            echo "  FRONTEND_PORT              Default: 3000"
            echo "  BACKEND_PORT               Default: 8080"
            echo "  LICENSE_SERVER_PORT        Default: 8081"
            echo "  BACKEND_METRICS_PORT       Default: 9090"
            echo "  LICENSE_METRICS_PORT       Default: 9091"
            echo "  ENABLE_BACKEND_METRICS     Default: true"
            echo "  ENABLE_LICENSE_METRICS     Default: true"
            echo ""
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Execute startup sequence
load_config
check_requirements

[ "$CLEANUP_FIRST" = "true" ] && cleanup

[ "$SKIP_MIGRATION" = "false" ] && run_migrations
[ "$SKIP_BUILD" = "false" ] && build_images

start_databases
start_services

verify_health
show_status

log_success "ObsFly stack is ready!"
echo ""
