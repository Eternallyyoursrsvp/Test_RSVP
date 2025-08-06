# Provider Management API Reference

## Overview

The Provider Management API provides endpoints for configuring, validating, switching, and monitoring providers in the RSVP Platform. All endpoints require admin authentication.

## Authentication

All API endpoints require authentication using an admin JWT token:

```bash
Authorization: Bearer <admin-jwt-token>
```

## Base URL

```
/api/admin/providers
```

## 📋 Provider Information

### Get All Providers

**GET** `/api/admin/providers`

Returns information about all configured providers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "postgresql_primary",
      "name": "PostgreSQL Primary",
      "type": "database",
      "category": "PostgreSQL Database",
      "status": "active",
      "isDefault": true,
      "lastChecked": "2024-01-31T10:30:00Z",
      "healthScore": 95,
      "performance": {
        "responseTime": 45,
        "uptime": 99.9,
        "errorRate": 0.01
      },
      "capabilities": ["ACID", "transactions", "indexes", "foreign_keys"],
      "dependencies": ["postgresql_server"],
      "version": "15.4"
    }
  ]
}
```

### Get Provider Details

**GET** `/api/admin/providers/{providerId}`

Returns detailed information about a specific provider.

**Parameters:**
- `providerId` (string): Unique provider identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "postgresql_primary",
    "name": "PostgreSQL Primary",
    "type": "database",
    "configuration": {
      "host": "localhost",
      "port": 5432,
      "database": "rsvp_platform",
      "ssl": true,
      "poolSize": 10
    },
    "validationResults": {
      "isValid": true,
      "lastValidated": "2024-01-31T10:30:00Z",
      "checks": [
        {
          "name": "Connection Test",
          "status": "passed",
          "message": "Successfully connected to database"
        }
      ]
    }
  }
}
```

### Get Available Providers

**GET** `/api/admin/providers/available`

Returns all available provider types that can be configured.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "postgresql",
      "name": "PostgreSQL",
      "type": "database",
      "description": "PostgreSQL relational database",
      "features": ["ACID", "transactions", "JSON support"],
      "configurationSchema": {
        "host": { "type": "string", "required": true },
        "port": { "type": "number", "default": 5432 },
        "database": { "type": "string", "required": true }
      }
    }
  ]
}
```

## 🔧 Provider Configuration

### Create Provider

**POST** `/api/admin/providers`

Creates a new provider configuration.

**Request Body:**
```json
{
  "type": "postgresql",
  "name": "PostgreSQL Secondary",
  "configuration": {
    "host": "db-secondary.example.com",
    "port": 5432,
    "database": "rsvp_platform",
    "username": "rsvp_user",
    "password": "secure_password",
    "ssl": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "postgresql_secondary",
    "message": "Provider created successfully"
  }
}
```

### Update Provider

**PUT** `/api/admin/providers/{providerId}`

Updates an existing provider configuration.

**Request Body:**
```json
{
  "configuration": {
    "host": "new-host.example.com",
    "poolSize": 15
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider updated successfully"
}
```

### Delete Provider

**DELETE** `/api/admin/providers/{providerId}`

Deletes a provider configuration. Cannot delete active providers.

**Response:**
```json
{
  "success": true,
  "message": "Provider deleted successfully"
}
```

## ✅ Provider Validation

### Validate Provider

**POST** `/api/admin/providers/{providerId}/validate`

Validates a provider configuration and connectivity.

**Request Body (optional):**
```json
{
  "configuration": {
    "host": "new-host.example.com"
  },
  "tests": ["connectivity", "performance", "security"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "providerId": "postgresql_primary",
    "checks": [
      {
        "name": "Connectivity Test",
        "status": "passed",
        "message": "Successfully connected to database",
        "duration": 150
      },
      {
        "name": "Performance Test",
        "status": "passed",
        "message": "Response time within acceptable limits",
        "metrics": {
          "responseTime": 45,
          "throughput": 1200
        }
      }
    ],
    "performance": {
      "responseTime": 45,
      "throughput": 1200,
      "errorRate": 0.0
    },
    "compatibility": {
      "isCompatible": true,
      "issues": [],
      "recommendations": ["Consider enabling connection pooling"]
    }
  }
}
```

### Validate All Providers

**POST** `/api/admin/providers/validate-all`

Validates all configured providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProviders": 4,
    "validProviders": 3,
    "invalidProviders": 1,
    "results": [
      {
        "providerId": "postgresql_primary",
        "isValid": true,
        "healthScore": 95
      }
    ]
  }
}
```

## 🔄 Provider Switching

### Generate Migration Plan

**POST** `/api/admin/providers/migration-plan`

Generates a detailed plan for switching between providers.

**Request Body:**
```json
{
  "fromProvider": "sqlite_dev",
  "toProvider": "postgresql_prod",
  "options": {
    "includeData": true,
    "validateCompatibility": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "migration_plan_20240131_143025",
    "fromProvider": "sqlite_dev",
    "toProvider": "postgresql_prod",
    "estimatedTime": 1800,
    "dataSize": 52428800,
    "steps": [
      {
        "id": "backup_creation",
        "name": "Create Backup",
        "description": "Create full backup of current data",
        "estimatedTime": 300,
        "dependencies": [],
        "riskLevel": "low"
      },
      {
        "id": "schema_migration",
        "name": "Migrate Schema",
        "description": "Create schema in target database",
        "estimatedTime": 120,
        "dependencies": ["backup_creation"],
        "riskLevel": "medium"
      }
    ],
    "backupRequired": true,
    "rollbackSupported": true,
    "warnings": [
      "Migration will require temporary downtime"
    ],
    "requirements": [
      "PostgreSQL server must be accessible",
      "Sufficient disk space for data migration"
    ]
  }
}
```

### Execute Provider Switch

**POST** `/api/admin/providers/switch`

Executes a provider switch operation.

**Request Body:**
```json
{
  "fromProvider": "sqlite_dev",
  "toProvider": "postgresql_prod",
  "configuration": {
    "host": "prod-db.example.com",
    "database": "rsvp_platform",
    "username": "rsvp_user",
    "password": "secure_password"
  },
  "options": {
    "createBackup": true,
    "validateData": true,
    "enableRollback": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "migrationId": "migration_20240131_143025",
    "status": "started",
    "message": "Provider switching initiated"
  }
}
```

### Get Migration Status

**GET** `/api/admin/providers/migration/{migrationId}/status`

Returns the current status of a migration operation.

**Response:**
```json
{
  "success": true,
  "data": {
    "migrationId": "migration_20240131_143025",
    "status": "running",
    "progress": 65,
    "currentStage": "Data Migration",
    "currentOperation": "Migrating guests table",
    "estimatedTimeRemaining": 450,
    "startTime": "2024-01-31T14:30:25Z",
    "stages": [
      {
        "id": "backup_creation",
        "name": "Create Backup",
        "status": "completed",
        "progress": 100,
        "startTime": "2024-01-31T14:30:25Z",
        "endTime": "2024-01-31T14:35:25Z"
      },
      {
        "id": "data_migration",
        "name": "Data Migration",
        "status": "running",
        "progress": 65,
        "startTime": "2024-01-31T14:35:25Z"
      }
    ],
    "warnings": [],
    "errors": []
  }
}
```

## 💾 Backup and Rollback

### Create Backup

**POST** `/api/admin/providers/backup`

Creates a backup of the current provider data and configuration.

**Request Body:**
```json
{
  "providerId": "postgresql_primary",
  "includeData": true,
  "includeConfiguration": true,
  "compression": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backupId": "backup_20240131_143025",
    "size": 52428800,
    "location": "/backups/backup_20240131_143025.zip",
    "checksum": "sha256:abcd1234...",
    "createdAt": "2024-01-31T14:30:25Z"
  }
}
```

### List Backups

**GET** `/api/admin/providers/backups`

Returns a list of available backups.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "backup_20240131_143025",
      "name": "PostgreSQL Primary Backup",
      "createdAt": "2024-01-31T14:30:25Z",
      "providerType": "database",
      "providerName": "postgresql_primary",
      "size": 52428800,
      "isValid": true,
      "canRestore": true,
      "status": "available"
    }
  ]
}
```

### Restore from Backup

**POST** `/api/admin/providers/restore`

Restores a provider from backup.

**Request Body:**
```json
{
  "backupId": "backup_20240131_143025",
  "targetProvider": "postgresql_primary",
  "options": {
    "validateBackup": true,
    "createCurrentBackup": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "restoreId": "restore_20240131_153025",
    "status": "started",
    "message": "Restore operation initiated"
  }
}
```

## 📊 Health and Monitoring

### Get Provider Health

**GET** `/api/admin/providers/{providerId}/health`

Returns current health status of a provider.

**Response:**
```json
{
  "success": true,
  "data": {
    "providerId": "postgresql_primary",
    "status": "healthy",
    "healthScore": 95,
    "lastChecked": "2024-01-31T14:30:25Z",
    "metrics": {
      "responseTime": 45,
      "uptime": 99.9,
      "errorRate": 0.01,
      "connectionCount": 8,
      "activeQueries": 3
    },
    "alerts": [],
    "recommendations": [
      "Consider enabling query caching for better performance"
    ]
  }
}
```

### Get System Health

**GET** `/api/admin/providers/health`

Returns health status of all providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "overallStatus": "healthy",
    "overallScore": 93,
    "providers": [
      {
        "providerId": "postgresql_primary",
        "status": "healthy",
        "healthScore": 95
      },
      {
        "providerId": "sendgrid_email",
        "status": "warning",
        "healthScore": 85
      }
    ],
    "alerts": [
      {
        "providerId": "sendgrid_email",
        "severity": "warning",
        "message": "Email delivery rate below threshold"
      }
    ]
  }
}
```

## 🔍 Testing and Diagnostics

### Test Provider Connection

**POST** `/api/admin/providers/{providerId}/test-connection`

Tests connectivity to a provider.

**Response:**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "responseTime": 45,
    "message": "Connection successful",
    "timestamp": "2024-01-31T14:30:25Z"
  }
}
```

### Run Performance Benchmark

**POST** `/api/admin/providers/{providerId}/benchmark`

Runs performance benchmarks on a provider.

**Request Body:**
```json
{
  "duration": 30,
  "concurrency": 10,
  "operations": ["read", "write", "update"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "benchmarkId": "benchmark_20240131_143025",
    "duration": 30,
    "results": {
      "averageResponseTime": 45,
      "maxResponseTime": 120,
      "minResponseTime": 15,
      "throughput": 1200,
      "errorRate": 0.0,
      "operations": {
        "read": { "count": 18000, "avgTime": 35 },
        "write": { "count": 6000, "avgTime": 65 },
        "update": { "count": 3000, "avgTime": 55 }
      }
    }
  }
}
```

## ❌ Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_NOT_FOUND",
    "message": "Provider with ID 'invalid_provider' not found",
    "details": {
      "providerId": "invalid_provider",
      "availableProviders": ["postgresql_primary", "sendgrid_email"]
    }
  }
}
```

### Common Error Codes

- `PROVIDER_NOT_FOUND`: Provider does not exist
- `PROVIDER_INVALID_CONFIG`: Invalid configuration provided
- `PROVIDER_CONNECTION_FAILED`: Cannot connect to provider
- `PROVIDER_VALIDATION_FAILED`: Provider validation failed
- `MIGRATION_IN_PROGRESS`: Another migration is already running
- `BACKUP_NOT_FOUND`: Backup does not exist
- `INSUFFICIENT_PERMISSIONS`: Admin permissions required
- `OPERATION_NOT_SUPPORTED`: Operation not supported for provider type

## 📝 Rate Limiting

API endpoints are rate limited:
- **Provider operations**: 60 requests per minute
- **Validation/testing**: 30 requests per minute
- **Migration operations**: 5 requests per minute
- **Health checks**: 120 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706712625
```

## 🔒 Security

- All endpoints require admin authentication
- Sensitive configuration data is masked in responses
- API keys and passwords are encrypted at rest
- Audit logs are maintained for all provider operations
- SSL/TLS required for all API communication

## 📚 SDK and Client Libraries

Official SDKs are available for:
- **JavaScript/Node.js**: `@rsvp-platform/provider-client`
- **Python**: `rsvp-platform-providers`
- **Go**: `github.com/rsvp-platform/provider-go`

Example usage:
```javascript
import { ProviderClient } from '@rsvp-platform/provider-client';

const client = new ProviderClient({
  baseUrl: 'https://api.yourwedding.com',
  token: 'your-admin-token'
});

// Get all providers
const providers = await client.providers.list();

// Validate provider
const result = await client.providers.validate('postgresql_primary');
```

---

For more detailed examples and use cases, see the [Provider Setup Guide](../setup-guide.md) and provider-specific documentation.