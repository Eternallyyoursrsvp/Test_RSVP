# Provider Test Suite

Comprehensive test suite for the RSVP Platform's modular provider system, covering all provider types with unit, integration, performance, and end-to-end testing.

## 📋 Test Structure

```
tests/providers/
├── setup/
│   └── test-environment.ts     # Comprehensive test environment setup
├── unit/
│   ├── database-providers.test.ts   # Database provider unit tests
│   ├── email-providers.test.ts      # Email provider unit tests
│   └── storage-providers.test.ts    # Storage provider unit tests
├── integration/
│   └── provider-switching.test.ts   # Provider switching workflows
├── performance/
│   └── provider-benchmarks.test.ts  # Performance benchmarks
├── e2e/
│   └── end-to-end-workflows.test.ts # Complete user workflows
├── vitest.config.ts                 # Test configuration
└── README.md                        # This file
```

## 🧪 Test Categories

### Unit Tests
- **Database Providers**: PostgreSQL, SQLite, Supabase, PocketBase
- **Email Providers**: SendGrid, SMTP
- **Storage Providers**: AWS S3, Local Storage
- **Authentication Providers**: Local, OAuth, JWT

**Coverage**: Individual provider functionality, CRUD operations, connection management, error handling

### Integration Tests
- **Provider Switching**: Database → Database, Email → Email, Storage → Storage
- **Multi-Provider Operations**: Atomic switches, rollback scenarios
- **Data Migration**: Schema transformation, data integrity validation
- **Failover Testing**: Automatic failover, manual recovery

### Performance Tests
- **Throughput Benchmarks**: Operations per second for each provider
- **Latency Measurements**: Response time analysis under various loads
- **Resource Usage**: Memory consumption, connection pooling efficiency
- **Scalability Testing**: Performance under high concurrency

### End-to-End Tests
- **Complete Wedding Workflows**: Event creation → Guest management → Email communication
- **Multi-Event Management**: Concurrent event handling, data isolation
- **Disaster Recovery**: Full backup/restore, partial recovery scenarios
- **Load Testing**: High-volume operations, consistency under pressure

## 🚀 Running Tests

### All Tests
```bash
# Run complete provider test suite
npm run test:providers

# Run with coverage
npm run test:providers:coverage

# Run in watch mode
npm run test:providers:watch
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:providers:unit

# Integration tests
npm run test:providers:integration

# Performance benchmarks
npm run test:providers:performance

# End-to-end workflows
npm run test:providers:e2e
```

### Individual Provider Tests
```bash
# Database providers only
npm run test -- tests/providers/unit/database-providers.test.ts

# Email providers only
npm run test -- tests/providers/unit/email-providers.test.ts

# Storage providers only
npm run test -- tests/providers/unit/storage-providers.test.ts
```

## ⚙️ Test Configuration

### Environment Variables
```bash
# Database Testing
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=rsvp_test
TEST_DB_USER=test_user
TEST_DB_PASSWORD=test_password

# Email Testing
TEST_SENDGRID_API_KEY=SG.test-api-key
TEST_SMTP_HOST=localhost
TEST_SMTP_PORT=1025

# Storage Testing
TEST_S3_BUCKET=test-bucket
TEST_S3_REGION=us-east-1
TEST_S3_ACCESS_KEY=test-access-key
TEST_S3_SECRET_KEY=test-secret-key
TEST_LOCAL_STORAGE_PATH=./test-uploads

# Performance Testing
BENCHMARK_ENABLED=true
VITEST_VERBOSE=true
```

### Test Timeouts
- **Unit Tests**: 10 seconds
- **Integration Tests**: 45 seconds
- **Performance Tests**: 2 minutes
- **E2E Tests**: 3 minutes

## 🎯 Coverage Targets

### Overall Coverage Requirements
- **Lines**: 85%
- **Functions**: 85%
- **Branches**: 80%
- **Statements**: 85%

### Critical Components (Higher Thresholds)
- **Provider Core (`server/providers/core/**`)**: 90%+ across all metrics
- **Provider Interfaces**: 95%+ function coverage
- **Data Migration Logic**: 90%+ branch coverage

## 🔧 Test Environment Setup

The test suite uses comprehensive mocking for external services:

### Mocked Services
- **PostgreSQL**: In-memory mock with query simulation
- **SQLite**: `:memory:` database for fast, isolated tests
- **SendGrid**: API response mocking with webhook simulation
- **SMTP**: Local test server simulation
- **AWS S3**: MinIO local instance or complete mocking
- **File System**: In-memory file operations

### Test Data Factories
```typescript
// Event test data
const testEvent = createTestData.event({
  title: 'Custom Wedding',
  date: new Date('2024-12-31')
});

// Guest test data
const testGuest = createTestData.guest({
  eventId: 'event-123',
  email: 'guest@example.com'
});

// File test data
const testFile = createTestFile({
  name: 'invitation.pdf',
  type: 'application/pdf',
  size: 1024
});
```

## 📊 Performance Benchmarks

### Database Performance Targets
- **CREATE Operations**: < 100ms average
- **READ Operations**: < 50ms average
- **Complex Queries**: < 200ms average
- **Bulk Operations**: < 1000ms for 100 records

### Email Performance Targets
- **Single Email**: < 2s (SendGrid), < 3s (SMTP)
- **Bulk Email**: < 1s per email in batch
- **Template Processing**: < 500ms per email

### Storage Performance Targets
- **Small File Upload** (< 1MB): < 2s (S3), < 100ms (Local)
- **Large File Upload** (10MB): < 30s (S3), < 5s (Local)
- **File Download**: < 1s (S3), < 50ms (Local)
- **File Listing**: < 500ms (100 files)

## 🛠️ Debugging Tests

### Verbose Output
```bash
# Enable detailed test output
VITEST_VERBOSE=true npm run test:providers

# Run specific test with debug info
DEBUG=provider:* npm run test -- tests/providers/unit/database-providers.test.ts
```

### Test Isolation
```bash
# Run single test case
npm run test -- --grep "should connect to PostgreSQL"

# Run tests for specific provider
npm run test -- --grep "PostgreSQL Provider"
```

### Coverage Analysis
```bash
# Generate detailed coverage report
npm run test:providers:coverage

# View coverage in browser
npm run coverage:open
```

## 🔍 Common Test Patterns

### Provider Testing Pattern
```typescript
describe('Provider Name', () => {
  let provider: ProviderType;

  beforeEach(() => {
    provider = new ProviderType(TEST_CONFIGS.providerName);
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      await expect(provider.connect()).resolves.not.toThrow();
      expect(provider.isConnected()).toBe(true);
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    afterEach(async () => {
      await provider.disconnect();
    });

    // Test cases...
  });
});
```

### Error Testing Pattern
```typescript
it('should handle connection failures', async () => {
  const badConfig = { ...TEST_CONFIGS.provider, host: 'invalid-host' };
  const failProvider = new ProviderType(badConfig);
  
  await expect(failProvider.connect()).rejects.toThrow('Connection failed');
  expect(failProvider.isConnected()).toBe(false);
});
```

### Performance Testing Pattern
```typescript
it('should meet performance benchmarks', async () => {
  const startTime = performance.now();
  
  await provider.performOperation();
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  expect(duration).toBeLessThan(100); // 100ms threshold
});
```

## 📈 Continuous Integration

### CI Pipeline Integration
The test suite is designed for CI/CD environments:

```yaml
# GitHub Actions example
- name: Run Provider Tests
  env:
    NODE_ENV: test
    TEST_DB_URL: postgres://test:test@localhost:5432/test_db
  run: |
    npm run test:providers:ci
    npm run test:providers:coverage
```

### Docker Testing Environment
```bash
# Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# Run tests with real services
npm run test:providers:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## 🚨 Troubleshooting

### Common Issues

**Tests timing out**
- Check test timeouts in `vitest.config.ts`
- Verify mock services are responding
- Enable verbose logging for debugging

**Provider connection failures**
- Verify test configurations in `test-environment.ts`
- Check that required services are running
- Review environment variable setup

**Flaky tests**
- Enable test retry for integration tests
- Check for race conditions in async operations
- Verify proper test isolation and cleanup

**Performance test failures**
- Adjust thresholds based on CI environment
- Check system resources during test execution
- Review concurrent test execution settings

### Debug Commands
```bash
# Enable all debugging
DEBUG=* npm run test:providers

# Provider-specific debugging
DEBUG=provider:database npm run test:providers:unit

# Memory usage analysis
NODE_OPTIONS="--max-old-space-size=4096" npm run test:providers:performance
```

## 📚 Additional Resources

- [Provider System Documentation](../../docs/providers/README.md)
- [Provider API Reference](../../docs/providers/api/README.md)
- [Setup Guide](../../docs/providers/setup-guide.md)
- [Performance Optimization Guide](../../docs/providers/performance.md)
- [Troubleshooting Guide](../../docs/providers/troubleshooting.md)

---

For questions or issues with the test suite, please refer to the main project documentation or create an issue in the project repository.