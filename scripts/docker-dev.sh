#!/bin/bash
# Upfirst Docker Development Helper Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${NC}→ $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if .env exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found!"
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env and add your API keys before running docker-compose up"
        exit 1
    fi
    print_success ".env file exists"
}

# Start services
start() {
    print_info "Starting Upfirst development environment..."
    check_docker
    check_env
    
    if [ "$1" == "build" ]; then
        print_info "Building containers..."
        docker-compose up --build -d
    else
        docker-compose up -d
    fi
    
    print_success "Services started successfully!"
    print_info "Access the app at: http://localhost"
    print_info "Health check: http://localhost/api/health"
    print_info ""
    print_info "View logs with: ./scripts/docker-dev.sh logs"
}

# Stop services
stop() {
    print_info "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

# Restart services
restart() {
    print_info "Restarting services..."
    docker-compose restart
    print_success "Services restarted"
}

# View logs
logs() {
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

# Check service health
health() {
    print_info "Checking service health..."
    docker-compose ps
}

# Database shell
db_shell() {
    print_info "Opening PostgreSQL shell..."
    docker-compose exec postgres psql -U postgres -d upfirst_dev
}

# Database backup
db_backup() {
    BACKUP_FILE="backups/upfirst_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups
    print_info "Backing up database to $BACKUP_FILE..."
    docker-compose exec -T postgres pg_dump -U postgres upfirst_dev > "$BACKUP_FILE"
    print_success "Database backed up successfully"
}

# Run migrations
migrate() {
    print_info "Running database migrations..."
    docker-compose exec legacy-app npm run db:push
    print_success "Migrations complete"
}

# Clean up everything
clean() {
    print_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning up..."
        docker-compose down -v
        print_success "Cleanup complete"
    fi
}

# Show help
show_help() {
    echo "Upfirst Docker Development Helper"
    echo ""
    echo "Usage: ./scripts/docker-dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start [build]  - Start all services (add 'build' to rebuild)"
    echo "  stop           - Stop all services"
    echo "  restart        - Restart all services"
    echo "  logs [service] - View logs (optional: specific service)"
    echo "  health         - Check service health status"
    echo "  db-shell       - Open PostgreSQL shell"
    echo "  db-backup      - Backup database"
    echo "  migrate        - Run database migrations"
    echo "  clean          - Remove all containers and volumes"
    echo "  help           - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/docker-dev.sh start"
    echo "  ./scripts/docker-dev.sh start build"
    echo "  ./scripts/docker-dev.sh logs legacy-app"
    echo "  ./scripts/docker-dev.sh db-shell"
}

# Main command router
case "$1" in
    start)
        start "$2"
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$2"
        ;;
    health)
        health
        ;;
    db-shell)
        db_shell
        ;;
    db-backup)
        db_backup
        ;;
    migrate)
        migrate
        ;;
    clean)
        clean
        ;;
    help|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
