#!/bin/bash
set -e

# Wedding RSVP Platform Deployment Script
# Production-ready deployment with comprehensive validation and rollback

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV="${DEPLOY_ENV:-production}"
PROJECT_NAME="rsvp-platform"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
VERSION="${VERSION:-latest}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation functions
validate_environment() {
    log_info "Validating deployment environment..."
    
    # Check required environment variables
    local required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "SESSION_SECRET"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    # Check Docker availability
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    
    # Check Docker Compose availability
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        return 1
    fi
    
    log_success "Environment validation passed"
    return 0
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check disk space
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=2097152  # 2GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "Insufficient disk space. Required: 2GB, Available: $((available_space/1024/1024))GB"
        return 1
    fi
    
    # Check if services are running
    if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
        log_info "Existing services detected, preparing for rolling update"
    else
        log_info "No existing services detected, preparing for fresh deployment"
    fi
    
    # Validate Docker images
    if [[ -n "$DOCKER_REGISTRY" ]]; then
        log_info "Validating Docker image: ${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}"
        
        if ! docker pull "${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}"; then
            log_error "Failed to pull Docker image"
            return 1
        fi
    fi
    
    log_success "Pre-deployment checks passed"
    return 0
}

# Build application
build_application() {
    log_info "Building application..."
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -t "${PROJECT_NAME}:${VERSION}" .
    
    if [[ $? -ne 0 ]]; then
        log_error "Docker build failed"
        return 1
    fi
    
    # Tag for registry if specified
    if [[ -n "$DOCKER_REGISTRY" ]]; then
        docker tag "${PROJECT_NAME}:${VERSION}" "${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}"
        
        log_info "Pushing to registry..."
        docker push "${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}"
        
        if [[ $? -ne 0 ]]; then
            log_error "Failed to push to registry"
            return 1
        fi
    fi
    
    log_success "Application build completed"
    return 0
}

# Database migration
run_database_migrations() {
    log_info "Running database migrations..."
    
    # Create a temporary container to run migrations
    docker-compose -f docker-compose.production.yml run --rm app npm run migrate
    
    if [[ $? -ne 0 ]]; then
        log_error "Database migration failed"
        return 1
    fi
    
    log_success "Database migrations completed"
    return 0
}

# Deploy services
deploy_services() {
    log_info "Deploying services..."
    
    # Backup current state for rollback
    if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
        log_info "Creating backup of current deployment..."
        docker-compose -f docker-compose.production.yml config > docker-compose.backup.yml
    fi
    
    # Deploy with rolling update strategy
    log_info "Starting rolling deployment..."
    
    # Update services one by one to ensure zero downtime
    docker-compose -f docker-compose.production.yml up -d --no-deps app
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to deploy application services"
        return 1
    fi
    
    # Wait for services to be healthy
    log_info "Waiting for services to become healthy..."
    sleep 30
    
    # Update supporting services
    docker-compose -f docker-compose.production.yml up -d
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to deploy supporting services"
        return 1
    fi
    
    log_success "Services deployed successfully"
    return 0
}

# Health checks
perform_health_checks() {
    log_info "Performing health checks..."
    
    local health_check_url="http://localhost/health"
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 10))
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts..."
        
        # Check if health endpoint responds
        if curl -f -s "$health_check_url" > /dev/null; then
            local health_status=$(curl -s "$health_check_url" | jq -r '.data.status' 2>/dev/null || echo "unknown")
            
            if [[ "$health_status" == "healthy" ]]; then
                log_success "Health check passed - service is healthy"
                return 0
            elif [[ "$health_status" == "degraded" ]]; then
                log_warning "Service is degraded but functional"
                return 0
            else
                log_warning "Service status: $health_status"
            fi
        else
            log_warning "Health check failed, retrying in 10 seconds..."
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

# Smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    local base_url="http://localhost"
    local tests_passed=0
    local tests_total=0
    
    # Test basic endpoints
    local endpoints=(
        "/health"
        "/health/ready" 
        "/health/live"
        "/api/system/info"
    )
    
    for endpoint in "${endpoints[@]}"; do
        ((tests_total++))
        log_info "Testing endpoint: $endpoint"
        
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$base_url$endpoint")
        
        if [[ $response_code -eq 200 || $response_code -eq 206 ]]; then
            log_success "✓ $endpoint responded with $response_code"
            ((tests_passed++))
        else
            log_error "✗ $endpoint responded with $response_code"
        fi
    done
    
    # Test database connectivity
    ((tests_total++))
    log_info "Testing database connectivity..."
    
    if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-rsvp_user}" > /dev/null; then
        log_success "✓ Database is accessible"
        ((tests_passed++))
    else
        log_error "✗ Database connectivity failed"
    fi
    
    # Test Redis connectivity  
    ((tests_total++))
    log_info "Testing Redis connectivity..."
    
    if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "✓ Redis is accessible"
        ((tests_passed++))
    else
        log_error "✗ Redis connectivity failed"
    fi
    
    log_info "Smoke tests completed: $tests_passed/$tests_total passed"
    
    if [[ $tests_passed -eq $tests_total ]]; then
        log_success "All smoke tests passed"
        return 0
    else
        log_error "Some smoke tests failed"
        return 1
    fi
}

# Rollback function
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    if [[ -f "docker-compose.backup.yml" ]]; then
        log_info "Restoring previous deployment state..."
        
        # Stop current services
        docker-compose -f docker-compose.production.yml down
        
        # Restore backup
        mv docker-compose.backup.yml docker-compose.production.yml
        
        # Start restored services
        docker-compose -f docker-compose.production.yml up -d
        
        # Wait for rollback to complete
        sleep 30
        
        # Verify rollback
        if perform_health_checks; then
            log_success "Rollback completed successfully"
            return 0
        else
            log_error "Rollback failed - manual intervention required"
            return 1
        fi
    else
        log_error "No backup found for rollback"
        return 1
    fi
}

# Cleanup function
cleanup_deployment() {
    log_info "Cleaning up deployment artifacts..."
    
    # Remove backup files
    if [[ -f "docker-compose.backup.yml" ]]; then
        rm -f docker-compose.backup.yml
    fi
    
    # Prune unused Docker resources
    docker system prune -f
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting deployment of $PROJECT_NAME (version: $VERSION) to $DEPLOY_ENV"
    
    # Validation phase
    if ! validate_environment; then
        log_error "Environment validation failed"
        exit 1
    fi
    
    if ! pre_deployment_checks; then
        log_error "Pre-deployment checks failed"
        exit 1
    fi
    
    # Build phase
    if ! build_application; then
        log_error "Application build failed"
        exit 1
    fi
    
    # Database migration phase
    if ! run_database_migrations; then
        log_error "Database migration failed"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback_deployment
        fi
        
        exit 1
    fi
    
    # Deployment phase
    if ! deploy_services; then
        log_error "Service deployment failed"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback_deployment
        fi
        
        exit 1
    fi
    
    # Verification phase
    if ! perform_health_checks; then
        log_error "Health checks failed"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback_deployment
        fi
        
        exit 1
    fi
    
    if ! run_smoke_tests; then
        log_error "Smoke tests failed"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback_deployment
        fi
        
        exit 1
    fi
    
    # Success
    cleanup_deployment
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Application is now running at: http://localhost"
    log_info "Health check: http://localhost/health"
    log_info "Metrics: http://localhost/metrics/prometheus"
}

# Handle script termination
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Execute main function
main "$@"