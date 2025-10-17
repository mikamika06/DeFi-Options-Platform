#!/usr/bin/env bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌${NC} $1"
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local max_attempts=$2
    local attempt=1
    
    print_status "Waiting for ${service_name} to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        # Check if container is running
        if docker ps --format "table {{.Names}}" | grep -q "^${service_name}$"; then
            # For specific service health checks
            case ${service_name} in
                "defi-postgres")
                    if docker exec ${service_name} pg_isready -U defi_options >/dev/null 2>&1; then
                        print_success "${service_name} is ready!"
                        return 0
                    fi
                    ;;
                "defi-redis")
                    if docker exec ${service_name} redis-cli ping >/dev/null 2>&1; then
                        print_success "${service_name} is ready!"
                        return 0
                    fi
                    ;;
                "defi-anvil")
                    if curl -s -X POST -H "Content-Type: application/json" \
                        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                        http://127.0.0.1:8545 >/dev/null 2>&1; then
                        print_success "${service_name} is ready!"
                        return 0
                    fi
                    ;;
                *)
                    if docker exec ${service_name} echo "test" >/dev/null 2>&1; then
                        print_success "${service_name} is ready!"
                        return 0
                    fi
                    ;;
            esac
        fi
        
        echo -n "."
        sleep 3
        ((attempt++))
    done
    
    print_error "${service_name} failed to start after ${max_attempts} attempts"
    return 1
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed"
    exit 1
fi

if ! command_exists pnpm; then
    print_error "pnpm is not installed. Install it with: npm install -g pnpm"
    exit 1
fi

if ! command_exists forge; then
    print_error "Foundry is not installed. Install it from: https://getfoundry.sh/"
    exit 1
fi

# Check if .env exists
if [[ ! -f ".env" ]]; then
    print_warning ".env file not found, copying from .env.example"
    cp .env.example .env
fi

print_success "Prerequisites check passed"

# Step 1: Install dependencies
print_status "Installing dependencies..."
pnpm install --frozen-lockfile=false

# Step 2: Start infrastructure services
print_status "Starting infrastructure services..."
docker compose -f docker/docker-compose.yml down --remove-orphans
docker compose -f docker/docker-compose.yml up -d postgres redis zookeeper kafka anvil

# Wait for services to be ready
wait_for_service "defi-postgres" 30
wait_for_service "defi-redis" 15
wait_for_service "defi-anvil" 20

# Step 3: Initialize database
print_status "Initializing database..."
cd backend
pnpm run prisma:generate
pnpm run prisma:deploy
pnpm run db:seed
cd ..

# Step 4: Deploy contracts
print_status "Deploying smart contracts..."
./scripts/deploy_contracts.sh

# Step 5: Start backend API
print_status "Starting backend API..."
cd backend
pnpm run dev &
BACKEND_PID=$!
cd ..

# Wait a bit for API to start
sleep 5

# Step 6: Start workers
print_status "Starting background workers..."
cd backend
./start-all-workers.sh &
WORKERS_PID=$!
cd ..

# Step 7: Start frontend
print_status "Starting frontend..."
cd defi-options-frontend
pnpm run dev &
FRONTEND_PID=$!
cd ..

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down services..."
    kill $BACKEND_PID $WORKERS_PID $FRONTEND_PID 2>/dev/null || true
    docker compose -f docker/docker-compose.yml down
    print_success "Cleanup completed"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

print_success "🚀 DeFi Options Platform is running!"
echo ""
echo "📊 Services:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - GraphQL: http://localhost:4000/graphql"
echo "   - Anvil RPC: http://localhost:8545"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "📝 View logs:"
echo "   - Docker services: docker compose -f docker/docker-compose.yml logs -f"
echo "   - Anvil: docker logs -f defi-anvil"
echo ""
echo "⏹️  Press Ctrl+C to stop all services"

# Keep the script running
wait