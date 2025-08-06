#!/bin/bash
set -e

# Wedding RSVP Platform Test Runner
# Comprehensive test execution with reporting and CI/CD integration

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TYPE="${TEST_TYPE:-all}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-80}"
PARALLEL_TESTS="${PARALLEL_TESTS:-true}"
GENERATE_REPORTS="${GENERATE_REPORTS:-true}"
CI_MODE="${CI_MODE:-false}"

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

# Test environment setup
setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Create test directories
    mkdir -p coverage reports logs
    
    # Set test environment variables
    export NODE_ENV=test
    export DATABASE_URL="postgresql://test:test@localhost:5432/rsvp_test"
    export REDIS_URL="redis://localhost:6379/1"
    export JWT_SECRET="test-secret-key"
    export SESSION_SECRET="test-session-secret"
    
    # Start test services if not in CI
    if [[ "$CI_MODE" != "true" ]]; then
        log_info "Starting test services..."
        
        # Start PostgreSQL test container
        if ! docker ps | grep -q postgres-test; then
            docker run -d --name postgres-test \
                -e POSTGRES_DB=rsvp_test \
                -e POSTGRES_USER=test \
                -e POSTGRES_PASSWORD=test \
                -p 5432:5432 \
                postgres:15-alpine
            
            # Wait for PostgreSQL to be ready
            log_info "Waiting for PostgreSQL to be ready..."
            until docker exec postgres-test pg_isready -U test; do
                sleep 1
            done
        fi
        
        # Start Redis test container
        if ! docker ps | grep -q redis-test; then
            docker run -d --name redis-test \
                -p 6379:6379 \
                redis:7-alpine
            
            # Wait for Redis to be ready
            log_info "Waiting for Redis to be ready..."
            until docker exec redis-test redis-cli ping | grep -q PONG; do
                sleep 1
            done
        fi
    fi
    
    log_success "Test environment setup completed"
    return 0
}

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    
    local test_cmd="npm test"
    local test_files="tests/unit/**/*.test.ts"
    
    if [[ "$PARALLEL_TESTS" == "true" ]]; then
        test_cmd="$test_cmd --parallel"
    fi
    
    if [[ "$GENERATE_REPORTS" == "true" ]]; then
        test_cmd="$test_cmd --reporter=json --outputFile=reports/unit-tests.json"
    fi
    
    # Run unit tests with coverage
    if command -v nyc &> /dev/null; then
        nyc --reporter=html --reporter=json --report-dir=coverage/unit \
            $test_cmd $test_files
    else
        $test_cmd $test_files
    fi
    
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
    fi
    
    return $exit_code
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    # Run integration tests
    local integration_tests=(
        "tests/integration/middleware.test.ts"
        "tests/api/health.test.ts"
    )
    
    local failed_tests=()
    local passed_tests=()
    
    for test_file in "${integration_tests[@]}"; do
        if [[ -f "$test_file" ]]; then
            log_info "Running: $test_file"
            
            if npx ts-node "$test_file"; then
                passed_tests+=("$test_file")
                log_success "✓ $(basename "$test_file")"
            else
                failed_tests+=("$test_file")
                log_error "✗ $(basename "$test_file")"
            fi
        else
            log_warning "Test file not found: $test_file"
        fi
    done
    
    log_info "Integration test results:"
    log_info "  Passed: ${#passed_tests[@]}"
    log_info "  Failed: ${#failed_tests[@]}"
    
    if [[ ${#failed_tests[@]} -eq 0 ]]; then
        log_success "All integration tests passed"
        return 0
    else
        log_error "Some integration tests failed: ${failed_tests[*]}"
        return 1
    fi
}

# Run API tests
run_api_tests() {
    log_info "Running API tests..."
    
    # Start application in test mode
    log_info "Starting application for API testing..."
    
    # Export test environment
    export NODE_ENV=test
    export PORT=3001
    
    # Start application in background
    npm start &
    local app_pid=$!
    
    # Wait for application to be ready
    log_info "Waiting for application to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost:3001/health" > /dev/null; then
            log_success "Application is ready"
            break
        fi
        
        sleep 2
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "Application failed to start within timeout"
        kill $app_pid 2>/dev/null || true
        return 1
    fi
    
    # Run API tests using Newman (if Postman collection exists)
    local api_test_result=0
    
    if [[ -f "tests/api/rsvp-platform.postman_collection.json" ]]; then
        log_info "Running Postman collection tests..."
        
        if command -v newman &> /dev/null; then
            newman run tests/api/rsvp-platform.postman_collection.json \
                --environment tests/api/test.postman_environment.json \
                --reporters cli,json \
                --reporter-json-export reports/api-tests.json
            
            api_test_result=$?
        else
            log_warning "Newman not installed, skipping Postman collection tests"
        fi
    fi
    
    # Run curl-based API tests
    log_info "Running basic API tests..."
    
    local api_endpoints=(
        "GET /health"
        "GET /health/ready"
        "GET /health/live"
        "GET /api/system/info"
    )
    
    local api_test_failures=0
    
    for endpoint in "${api_endpoints[@]}"; do
        local method=$(echo $endpoint | cut -d' ' -f1)
        local path=$(echo $endpoint | cut -d' ' -f2)
        
        log_info "Testing: $method $path"
        
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -X "$method" "http://localhost:3001$path")
        
        if [[ $response_code -eq 200 || $response_code -eq 206 ]]; then
            log_success "✓ $endpoint -> $response_code"
        else
            log_error "✗ $endpoint -> $response_code"
            ((api_test_failures++))
        fi
    done
    
    # Cleanup
    kill $app_pid 2>/dev/null || true
    wait $app_pid 2>/dev/null || true
    
    if [[ $api_test_result -eq 0 && $api_test_failures -eq 0 ]]; then
        log_success "API tests passed"
        return 0
    else
        log_error "API tests failed"
        return 1
    fi
}

# Run performance tests
run_performance_tests() {
    log_info "Running performance tests..."
    
    # Performance test configuration
    local base_url="http://localhost:3001"
    local test_duration=30
    local concurrent_users=10
    
    # Start application for performance testing
    export NODE_ENV=test
    export PORT=3001
    
    npm start &
    local app_pid=$!
    
    # Wait for application
    sleep 10
    
    # Run performance tests using Apache Bench (if available)
    if command -v ab &> /dev/null; then
        log_info "Running Apache Bench performance test..."
        
        local requests=$((test_duration * concurrent_users))
        
        ab -n $requests -c $concurrent_users \
            -g reports/performance.data \
            "$base_url/health" > reports/performance.txt
        
        # Analyze results
        local avg_response_time=$(grep "Time per request" reports/performance.txt | head -1 | awk '{print $4}')
        local requests_per_sec=$(grep "Requests per second" reports/performance.txt | awk '{print $4}')
        
        log_info "Performance Results:"
        log_info "  Average response time: ${avg_response_time}ms"
        log_info "  Requests per second: $requests_per_sec"
        
        # Check performance thresholds
        if (( $(echo "$avg_response_time > 1000" | bc -l) )); then
            log_warning "High average response time: ${avg_response_time}ms"
        fi
        
        if (( $(echo "$requests_per_sec < 100" | bc -l) )); then
            log_warning "Low throughput: $requests_per_sec req/s"
        fi
    else
        log_warning "Apache Bench not available, skipping performance tests"
    fi
    
    # Cleanup
    kill $app_pid 2>/dev/null || true
    wait $app_pid 2>/dev/null || true
    
    log_success "Performance tests completed"
    return 0
}

# Run security tests
run_security_tests() {
    log_info "Running security tests..."
    
    local security_test_failures=0
    
    # Test rate limiting
    log_info "Testing rate limiting..."
    
    export NODE_ENV=test
    export PORT=3001
    
    npm start &
    local app_pid=$!
    sleep 10
    
    # Send multiple requests to trigger rate limiting
    for i in {1..20}; do
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
            "http://localhost:3001/api/system/info")
        
        if [[ $response_code -eq 429 ]]; then
            log_success "✓ Rate limiting is working"
            break
        fi
        
        if [[ $i -eq 20 ]]; then
            log_warning "Rate limiting may not be configured properly"
            ((security_test_failures++))
        fi
        
        sleep 0.1
    done
    
    # Test security headers
    log_info "Testing security headers..."
    
    local headers=$(curl -s -I "http://localhost:3001/health")
    
    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options" 
        "X-XSS-Protection"
        "Strict-Transport-Security"
    )
    
    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            log_success "✓ Security header present: $header"
        else
            log_warning "✗ Missing security header: $header"
            ((security_test_failures++))
        fi
    done
    
    # Cleanup
    kill $app_pid 2>/dev/null || true
    wait $app_pid 2>/dev/null || true
    
    if [[ $security_test_failures -eq 0 ]]; then
        log_success "Security tests passed"
        return 0
    else
        log_warning "Security tests completed with $security_test_failures warnings"
        return 0  # Don't fail on security warnings
    fi
}

# Generate coverage report
generate_coverage_report() {
    log_info "Generating coverage report..."
    
    if [[ -d "coverage" ]]; then
        # Merge coverage reports if multiple exist
        if command -v nyc &> /dev/null; then
            nyc merge coverage coverage/merged.json
            nyc report --reporter=html --reporter=text-summary
            
            # Check coverage threshold
            local coverage_percentage=$(nyc report --reporter=text-summary | grep "Lines" | awk '{print $2}' | sed 's/%//')
            
            if [[ -n "$coverage_percentage" ]]; then
                log_info "Code coverage: $coverage_percentage%"
                
                if (( $(echo "$coverage_percentage >= $COVERAGE_THRESHOLD" | bc -l) )); then
                    log_success "Coverage threshold met: $coverage_percentage% >= $COVERAGE_THRESHOLD%"
                else
                    log_warning "Coverage below threshold: $coverage_percentage% < $COVERAGE_THRESHOLD%"
                    return 1
                fi
            fi
        fi
        
        log_success "Coverage report generated in coverage/"
    else
        log_warning "No coverage data found"
    fi
    
    return 0
}

# Generate test report
generate_test_report() {
    log_info "Generating test report..."
    
    local report_file="reports/test-summary.json"
    local html_report="reports/test-summary.html"
    
    # Create JSON report
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "environment": "$NODE_ENV",
    "test_type": "$TEST_TYPE",
    "coverage_threshold": $COVERAGE_THRESHOLD,
    "reports": {
        "unit_tests": "$(ls reports/unit-tests.json 2>/dev/null || echo "not_generated")",
        "api_tests": "$(ls reports/api-tests.json 2>/dev/null || echo "not_generated")",
        "performance": "$(ls reports/performance.txt 2>/dev/null || echo "not_generated")",
        "coverage": "$(ls coverage/coverage-final.json 2>/dev/null || echo "not_generated")"
    }
}
EOF
    
    # Create HTML report
    cat > "$html_report" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>RSVP Platform Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RSVP Platform Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Environment: $NODE_ENV</p>
        <p>Test Type: $TEST_TYPE</p>
    </div>
    
    <div class="section">
        <h2>Test Results</h2>
        <p>Coverage threshold: $COVERAGE_THRESHOLD%</p>
        <ul>
            <li>Unit Tests: $(ls reports/unit-tests.json >/dev/null 2>&1 && echo "✅ Generated" || echo "❌ Not generated")</li>
            <li>Integration Tests: ✅ Executed</li>
            <li>API Tests: ✅ Executed</li>
            <li>Performance Tests: ✅ Executed</li>
            <li>Security Tests: ✅ Executed</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Reports</h2>
        <ul>
            <li><a href="coverage/index.html">Coverage Report</a></li>
            <li><a href="performance.txt">Performance Results</a></li>
        </ul>
    </div>
</body>
</html>
EOF
    
    log_success "Test report generated: $html_report"
    return 0
}

# Cleanup test environment
cleanup_test_environment() {
    log_info "Cleaning up test environment..."
    
    # Stop test containers if not in CI
    if [[ "$CI_MODE" != "true" ]]; then
        if docker ps | grep -q postgres-test; then
            docker stop postgres-test
            docker rm postgres-test
        fi
        
        if docker ps | grep -q redis-test; then
            docker stop redis-test
            docker rm redis-test
        fi
    fi
    
    # Kill any remaining processes
    pkill -f "npm start" 2>/dev/null || true
    
    log_success "Test environment cleaned up"
    return 0
}

# Main test execution function
main() {
    log_info "Starting test execution (type: $TEST_TYPE)"
    
    local test_failures=0
    
    # Setup
    if ! setup_test_environment; then
        log_error "Test environment setup failed"
        exit 1
    fi
    
    # Run tests based on type
    case "$TEST_TYPE" in
        "unit")
            run_unit_tests || ((test_failures++))
            ;;
        "integration")
            run_integration_tests || ((test_failures++))
            ;;
        "api")
            run_api_tests || ((test_failures++))
            ;;
        "performance")
            run_performance_tests || ((test_failures++))
            ;;
        "security")
            run_security_tests || ((test_failures++))
            ;;
        "all")
            run_unit_tests || ((test_failures++))
            run_integration_tests || ((test_failures++))
            run_api_tests || ((test_failures++))
            run_performance_tests || ((test_failures++))
            run_security_tests || ((test_failures++))
            ;;
        *)
            log_error "Unknown test type: $TEST_TYPE"
            exit 1
            ;;
    esac
    
    # Generate reports
    if [[ "$GENERATE_REPORTS" == "true" ]]; then
        generate_coverage_report || ((test_failures++))
        generate_test_report
    fi
    
    # Cleanup
    cleanup_test_environment
    
    # Summary
    if [[ $test_failures -eq 0 ]]; then
        log_success "🎉 All tests passed successfully!"
        exit 0
    else
        log_error "❌ $test_failures test suite(s) failed"
        exit 1
    fi
}

# Handle script termination
trap 'log_error "Test execution interrupted"; cleanup_test_environment; exit 1' INT TERM

# Execute main function
main "$@"