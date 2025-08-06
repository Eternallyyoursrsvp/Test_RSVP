# Enterprise Data Encryption System

The RSVP Platform includes a comprehensive enterprise-grade encryption system designed to protect sensitive data at rest and in transit. This system provides field-level encryption, automated key rotation, and comprehensive audit logging.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The encryption system protects sensitive data including:

- **Personal Information**: Email addresses, phone numbers, names
- **Authentication Data**: API keys, OAuth tokens, passwords
- **Communication Content**: Messages, email content, metadata
- **Financial Information**: Payment details, billing data
- **Internal Data**: System configurations, audit logs

## Features

### 🔐 Field-Level Encryption
- **AES-256-GCM** encryption for maximum security
- **Context-based encryption** with different keys for different data types
- **Transparent integration** with database operations
- **Automatic compression** for large data fields

### 🔄 Automated Key Rotation
- **Scheduled rotation** based on configurable policies
- **Context-specific schedules** (e.g., auth tokens rotate every 15 days)
- **Emergency rotation** capabilities
- **Health monitoring** with automatic alerts

### 📊 Comprehensive Auditing
- **Full audit trail** of all encryption/decryption operations
- **Performance metrics** and monitoring
- **Security event logging**
- **Compliance reporting**

### 🛡️ Enterprise Security
- **Multiple encryption contexts** for data segregation
- **Key derivation** from master key with unique salts
- **Secure backup and recovery** procedures
- **Production-ready** configuration validation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Express Middleware  │  API Endpoints  │  Database Operations   │
├─────────────────────────────────────────────────────────────────┤
│                 Encryption Middleware                           │
├─────────────────────────────────────────────────────────────────┤
│  EncryptionService   │  KeyManagement  │  DatabaseInterceptor   │
├─────────────────────────────────────────────────────────────────┤
│                    Core Encryption                              │
├─────────────────────────────────────────────────────────────────┤
│    AES-256-GCM     │   Key Derivation  │    Context Isolation   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Environment Setup

```bash
# Required environment variables
export MASTER_ENCRYPTION_KEY="your-256-bit-key-in-hex-format"
export KEY_DERIVATION_SALT="your-256-bit-salt-in-hex-format"

# Optional configuration
export ENABLE_KEY_ROTATION=true
export ENABLE_DATABASE_ENCRYPTION=true
export ENABLE_ENCRYPTION_AUDIT=true
export ENABLE_ENCRYPTION_COMPRESSION=true
```

### 2. Generate Strong Keys

```bash
# Generate master encryption key (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate key derivation salt (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Initialize in Application

```typescript
import { initializeEncryptionSystem } from './server/init/encryption-init';
import { app, db } from './server/app';

// Initialize encryption system
await initializeEncryptionSystem(app, db, {
  enableKeyRotation: true,
  enableDatabaseEncryption: true,
  enableAuditLogging: true
});
```

### 4. Use in Database Operations

```typescript
import { getEncryptionService, EncryptionContext } from './server/services/encryption-service';
import { getDatabaseEncryptionInterceptor } from './server/middleware/encryption-middleware';

const encryptionService = getEncryptionService();
const dbInterceptor = getDatabaseEncryptionInterceptor();

// Encrypt data before storing
const encryptedEmail = await encryptionService.encrypt(
  'user@example.com', 
  EncryptionContext.USER_PII
);

// Database operations with automatic encryption/decryption
const userData = { email: 'user@example.com', apiKey: 'secret-key' };
const encryptedData = await dbInterceptor.encryptForStorage('users', userData);
const decryptedData = await dbInterceptor.decryptFromStorage('users', encryptedData);
```

## Configuration

### Encryption Contexts

The system uses different encryption contexts for data segregation:

| Context | Purpose | Default Rotation |
|---------|---------|------------------|
| `USER_PII` | Personal identifiable information | 60 days |
| `AUTH_TOKENS` | Authentication tokens and sessions | 15 days |
| `API_KEYS` | Third-party API keys and secrets | 30 days |
| `COMMUNICATIONS` | Email/SMS content and metadata | 45 days |
| `FINANCIAL` | Payment and financial data | 7 days |
| `METADATA` | General sensitive metadata | 90 days |
| `INTERNAL` | Internal system data | 120 days |

### Field Configuration

Fields are configured for encryption in `server/config/encryption-fields.ts`:

```typescript
export const USER_ENCRYPTION_FIELDS = {
  email: EncryptionContext.USER_PII,
  password: EncryptionContext.AUTH_TOKENS,
} as const;

export const WEDDING_EVENT_ENCRYPTION_FIELDS = {
  emailApiKey: EncryptionContext.API_KEYS,
  whatsappAccessToken: EncryptionContext.API_KEYS,
  gmailClientSecret: EncryptionContext.API_KEYS,
  // ... more fields
} as const;
```

### Key Rotation Schedules

Customize rotation schedules via environment variables:

```bash
# Rotate auth tokens every 7 days at 2 AM
export KEY_ROTATION_AUTH_TOKENS="0 2 */7 * *"

# Rotate API keys every 14 days at 3 AM
export KEY_ROTATION_API_KEYS="0 3 */14 * *"
```

## API Reference

### Admin Endpoints

#### Health Check
```
GET /api/admin/encryption/health
```

Returns encryption system health status and statistics.

#### Manual Key Rotation
```
POST /api/admin/encryption/rotate-key
Content-Type: application/json

{
  "context": "AUTH_TOKENS"
}
```

#### Emergency Key Rotation
```
POST /api/admin/encryption/emergency-rotate
```

Rotates all encryption keys immediately.

#### Audit Logs
```
GET /api/admin/encryption/audit?context=USER_PII&limit=100
```

#### Key Management Events
```
GET /api/admin/encryption/events?type=rotation&limit=50
```

### Programmatic API

#### Basic Encryption
```typescript
import { getEncryptionService, EncryptionContext } from './services/encryption-service';

const service = getEncryptionService();

// Encrypt data
const encrypted = await service.encrypt('sensitive-data', EncryptionContext.USER_PII);

// Decrypt data
const decrypted = await service.decrypt(encrypted, EncryptionContext.USER_PII);

// Check if data is encrypted
const isEncrypted = service.isEncrypted(someString);
```

#### Field-Level Encryption
```typescript
// Encrypt multiple fields
const data = {
  email: 'user@example.com',
  apiKey: 'secret-key'
};

const fieldMap = {
  email: EncryptionContext.USER_PII,
  apiKey: EncryptionContext.API_KEYS
};

const encrypted = await service.encryptFields(data, fieldMap);
const decrypted = await service.decryptFields(encrypted, fieldMap);
```

#### Database Integration
```typescript
import { drizzleEncryptionHelper } from './middleware/encryption-middleware';

// Wrap Drizzle operations
const user = await drizzleEncryptionHelper.wrapInsert(
  'users',
  (data) => db.insert(users).values(data).returning(),
  { email: 'user@example.com', name: 'John Doe' }
);
```

## Best Practices

### Security

1. **Strong Master Keys**: Use cryptographically secure random keys (256-bit minimum)
2. **Environment Isolation**: Different keys for development, staging, and production
3. **Key Rotation**: Enable automatic key rotation for production environments
4. **Audit Logging**: Always enable audit logging in production
5. **Access Control**: Restrict access to encryption endpoints and admin functions

### Performance

1. **Batch Operations**: Use field-level encryption for multiple fields
2. **Connection Pooling**: Ensure database connections are properly pooled
3. **Monitoring**: Enable performance metrics to track encryption overhead
4. **Compression**: Enable compression for large data fields

### Operations

1. **Backup Strategy**: Implement secure backup procedures for encryption keys
2. **Disaster Recovery**: Test key recovery procedures regularly
3. **Monitoring**: Set up alerts for key rotation failures and security events
4. **Documentation**: Maintain up-to-date documentation of encrypted fields

### Data Migration

Use the migration utility for existing data:

```typescript
import { createMigrationService } from './utils/data-migration';

const migrationService = createMigrationService(db, {
  batchSize: 100,
  backupEnabled: true,
  validateAfterMigration: true,
  dryRun: false // Set to true for testing
});

// Migrate all tables
const result = await migrationService.migrateAllTables();
console.log(`Migration completed: ${result.encryptedRecords} records encrypted`);
```

## Troubleshooting

### Common Issues

#### "Master encryption key is required"
- Set the `MASTER_ENCRYPTION_KEY` environment variable
- Ensure the key is at least 256 bits (64 hex characters)

#### "Encryption service not initialized"
- Call `initializeEncryptionSystem()` during application startup
- Ensure all required environment variables are set

#### "Decryption failed"
- Check if the data is actually encrypted using `service.isEncrypted()`
- Verify the correct encryption context is being used
- Ensure key rotation hasn't invalidated old keys

#### Performance Issues
- Enable compression for large fields
- Monitor encryption metrics via `/api/admin/encryption/health`
- Consider batch processing for bulk operations

### Debugging

Enable debug logging:

```bash
export DEBUG=encryption:*
export NODE_ENV=development
```

Check system health:

```bash
curl http://localhost:3000/api/admin/encryption/health
```

View audit logs:

```bash
curl http://localhost:3000/api/admin/encryption/audit?limit=10
```

### Support

For additional support:

1. Check the audit logs for specific error messages
2. Review the system health endpoint for service status
3. Verify environment variable configuration
4. Test with the migration utility's dry-run mode

## Security Considerations

### Data Classification

- **PII Data**: Use `USER_PII` context with strict access controls
- **Authentication**: Use `AUTH_TOKENS` with frequent rotation
- **Financial**: Use `FINANCIAL` context with daily rotation
- **Internal**: Use appropriate context based on sensitivity

### Compliance

The encryption system supports:

- **GDPR**: PII data encryption and right to erasure
- **HIPAA**: Healthcare data protection (if applicable)
- **SOC 2**: Security controls and audit trails
- **ISO 27001**: Information security management

### Key Management

- Keys are derived from master key using PBKDF2 with 100,000 iterations
- Each context uses a unique salt for key derivation
- Keys are rotated automatically based on configured schedules
- Old keys are retained for decrypting existing data

### Audit Trail

All encryption operations are logged with:

- Timestamp and user context
- Operation type (encrypt/decrypt/rotate)
- Data context and key version
- Success/failure status
- Performance metrics