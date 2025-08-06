# Provider Configuration Reference

## Overview

This reference guide provides detailed configuration options for all supported providers. Each provider type has specific configuration parameters, validation rules, and best practices.

## 🗄️ Database Providers

### PostgreSQL

**Provider ID**: `postgresql`

**Configuration Schema**:
```json
{
  "type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "database": "rsvp_platform",
  "username": "rsvp_user",
  "password": "secure_password",
  "ssl": {
    "enabled": true,
    "rejectUnauthorized": false,
    "ca": "path/to/ca-certificate.crt",
    "key": "path/to/client-key.key",
    "cert": "path/to/client-certificate.crt"
  },
  "pool": {
    "min": 2,
    "max": 10,
    "acquireTimeoutMillis": 30000,
    "idleTimeoutMillis": 30000
  },
  "migrations": {
    "directory": "./migrations",
    "tableName": "migrations",
    "schemaName": "public"
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "slowQueryThreshold": 1000
  }
}
```

**Environment Variables**:
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=rsvp_platform
DATABASE_USER=rsvp_user
DATABASE_PASSWORD=secure_password
DATABASE_SSL_ENABLED=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

**Validation Rules**:
- Host must be reachable
- Port must be open and accepting connections
- Database must exist or be creatable
- User must have CREATE, SELECT, INSERT, UPDATE, DELETE permissions
- SSL configuration must be valid if enabled

### MySQL

**Provider ID**: `mysql`

**Configuration Schema**:
```json
{
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "database": "rsvp_platform",
  "username": "rsvp_user",
  "password": "secure_password",
  "charset": "utf8mb4",
  "collation": "utf8mb4_unicode_ci",
  "ssl": {
    "enabled": false,
    "ca": "path/to/ca.pem",
    "cert": "path/to/client-cert.pem",
    "key": "path/to/client-key.pem"
  },
  "pool": {
    "connectionLimit": 10,
    "acquireTimeout": 30000,
    "timeout": 30000
  },
  "options": {
    "dateStrings": false,
    "supportBigNumbers": true,
    "bigNumberStrings": false
  }
}
```

### SQLite

**Provider ID**: `sqlite`

**Configuration Schema**:
```json
{
  "type": "sqlite",
  "database": "./data/rsvp_platform.db",
  "options": {
    "verbose": false,
    "readOnly": false,
    "fileMustExist": false,
    "timeout": 5000
  },
  "pragmas": {
    "journal_mode": "WAL",
    "cache_size": 1000,
    "temp_store": "memory",
    "synchronous": "NORMAL",
    "foreign_keys": "ON"
  }
}
```

### Supabase Database

**Provider ID**: `supabase`

**Configuration Schema**:
```json
{
  "type": "supabase",
  "projectUrl": "https://your-project.supabase.co",
  "anonKey": "your-anon-key",
  "serviceRoleKey": "your-service-role-key",
  "database": {
    "schema": "public",
    "enableRLS": true,
    "connectionPool": {
      "min": 1,
      "max": 5
    }
  },
  "options": {
    "autoConnect": true,
    "persistSession": true,
    "detectSessionInUrl": true
  }
}
```

### PocketBase

**Provider ID**: `pocketbase`

**Configuration Schema**:
```json
{
  "type": "pocketbase",
  "baseUrl": "http://localhost:8090",
  "adminEmail": "admin@yourwedding.com",
  "adminPassword": "secure_admin_password",
  "options": {
    "timeout": 30000,
    "retries": 3,
    "language": "en"
  },
  "collections": {
    "autoCreate": true,
    "enableAuth": true,
    "enableFiles": true
  }
}
```

## 🔐 Authentication Providers

### OAuth2

**Provider ID**: `oauth2`

**Configuration Schema**:
```json
{
  "type": "oauth2",
  "providers": {
    "google": {
      "clientId": "your_google_client_id",
      "clientSecret": "your_google_client_secret",
      "callbackUrl": "http://localhost:3000/auth/google/callback",
      "scope": ["profile", "email"],
      "enabled": true
    },
    "github": {
      "clientId": "your_github_client_id",
      "clientSecret": "your_github_client_secret",
      "callbackUrl": "http://localhost:3000/auth/github/callback",
      "scope": ["user:email"],
      "enabled": true
    },
    "microsoft": {
      "clientId": "your_microsoft_client_id",
      "clientSecret": "your_microsoft_client_secret",
      "callbackUrl": "http://localhost:3000/auth/microsoft/callback",
      "scope": ["openid", "profile", "email"],
      "enabled": false
    }
  },
  "jwt": {
    "secret": "your-super-secure-jwt-secret",
    "expiresIn": "7d",
    "refreshExpiresIn": "30d",
    "algorithm": "HS256"
  },
  "session": {
    "name": "rsvp_session",
    "secret": "your-session-secret",
    "maxAge": 604800000,
    "secure": true,
    "httpOnly": true,
    "sameSite": "strict"
  }
}
```

### JWT Authentication

**Provider ID**: `jwt`

**Configuration Schema**:
```json
{
  "type": "jwt",
  "secret": "your-super-secure-jwt-secret",
  "algorithms": ["HS256"],
  "expiresIn": "7d",
  "refreshToken": {
    "enabled": true,
    "secret": "your-refresh-token-secret",
    "expiresIn": "30d"
  },
  "claims": {
    "issuer": "rsvp-platform",
    "audience": "wedding-guests"
  },
  "options": {
    "clockTolerance": 10,
    "ignoreExpiration": false,
    "ignoreNotBefore": false
  }
}
```

### Local Authentication

**Provider ID**: `local`

**Configuration Schema**:
```json
{
  "type": "local",
  "passwordPolicy": {
    "minLength": 8,
    "maxLength": 128,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSymbols": true,
    "forbiddenPasswords": ["password", "123456"]
  },
  "registration": {
    "enabled": true,
    "requireEmailVerification": true,
    "allowedDomains": [],
    "blockedDomains": ["tempmail.com"]
  },
  "login": {
    "maxAttempts": 5,
    "lockoutDuration": 900000,
    "requireTwoFactor": false
  },
  "session": {
    "name": "rsvp_local_session",
    "secret": "your-session-secret",
    "maxAge": 86400000,
    "rolling": true
  }
}
```

### Supabase Auth

**Provider ID**: `supabase_auth`

**Configuration Schema**:
```json
{
  "type": "supabase_auth",
  "projectUrl": "https://your-project.supabase.co",
  "anonKey": "your-anon-key",
  "settings": {
    "autoRefreshToken": true,
    "persistSession": true,
    "detectSessionInUrl": true,
    "storage": "localStorage"
  },
  "providers": {
    "email": {
      "enabled": true,
      "confirmEmail": true
    },
    "phone": {
      "enabled": false
    },
    "google": {
      "enabled": true,
      "redirectTo": "http://localhost:3000/auth/callback"
    },
    "github": {
      "enabled": true,
      "redirectTo": "http://localhost:3000/auth/callback"
    }
  }
}
```

### PocketBase Auth

**Provider ID**: `pocketbase_auth`

**Configuration Schema**:
```json
{
  "type": "pocketbase_auth",
  "baseUrl": "http://localhost:8090",
  "settings": {
    "autoRefresh": true,
    "language": "en"
  },
  "providers": {
    "email": {
      "enabled": true,
      "requireEmailVerification": true
    },
    "oauth": {
      "google": {
        "enabled": true,
        "clientId": "your_google_client_id",
        "clientSecret": "your_google_client_secret"
      },
      "github": {
        "enabled": true,
        "clientId": "your_github_client_id",
        "clientSecret": "your_github_client_secret"
      }
    }
  }
}
```

## 📧 Email Providers

### SMTP

**Provider ID**: `smtp`

**Configuration Schema**:
```json
{
  "type": "smtp",
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@gmail.com",
    "pass": "your-app-password"
  },
  "tls": {
    "rejectUnauthorized": false,
    "ciphers": "SSLv3"
  },
  "defaults": {
    "from": {
      "name": "Your Wedding Platform",
      "address": "noreply@yourwedding.com"
    },
    "replyTo": "support@yourwedding.com"
  },
  "pool": {
    "enabled": true,
    "maxConnections": 5,
    "maxMessages": 100
  }
}
```

### SendGrid

**Provider ID**: `sendgrid`

**Configuration Schema**:
```json
{
  "type": "sendgrid",
  "apiKey": "SG.your-sendgrid-api-key",
  "defaults": {
    "from": {
      "email": "noreply@yourwedding.com",
      "name": "Your Wedding Platform"
    },
    "replyTo": {
      "email": "support@yourwedding.com",
      "name": "Support Team"
    }
  },
  "templates": {
    "welcome": "d-xxxxxxxxx",
    "rsvp_confirmation": "d-yyyyyyyyy",
    "rsvp_reminder": "d-zzzzzzzzz",
    "event_update": "d-aaaaaaaaa"
  },
  "tracking": {
    "clickTracking": true,
    "openTracking": true,
    "subscriptionTracking": false,
    "ganalytics": {
      "enabled": true,
      "utmSource": "wedding-platform",
      "utmMedium": "email"
    }
  },
  "sandbox": {
    "enabled": false
  }
}
```

### Mailgun

**Provider ID**: `mailgun`

**Configuration Schema**:
```json
{
  "type": "mailgun",
  "apiKey": "your-mailgun-api-key",
  "domain": "mg.yourwedding.com",
  "region": "us",
  "defaults": {
    "from": "Your Wedding Platform <noreply@yourwedding.com>",
    "replyTo": "support@yourwedding.com"
  },
  "templates": {
    "welcome": "welcome-template",
    "rsvp_confirmation": "rsvp-confirmation-template"
  },
  "options": {
    "testMode": false,
    "tracking": true,
    "trackingClicks": true,
    "trackingOpens": true
  }
}
```

### Resend

**Provider ID**: `resend`

**Configuration Schema**:
```json
{
  "type": "resend",
  "apiKey": "re_your-resend-api-key",
  "defaults": {
    "from": "Your Wedding Platform <noreply@yourwedding.com>",
    "replyTo": "support@yourwedding.com"
  },
  "templates": {
    "welcome": "welcome-template-id",
    "rsvp_confirmation": "rsvp-confirmation-template-id"
  },
  "options": {
    "trackOpens": true,
    "trackClicks": true
  }
}
```

## 📁 Storage Providers

### Local Storage

**Provider ID**: `local`

**Configuration Schema**:
```json
{
  "type": "local",
  "basePath": "./uploads",
  "publicPath": "/uploads",
  "maxFileSize": 10485760,
  "allowedMimeTypes": [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain"
  ],
  "organization": {
    "byDate": true,
    "byType": true,
    "structure": "yyyy/mm/dd"
  },
  "security": {
    "preventExecutables": true,
    "sanitizeFilenames": true,
    "generateUniqueNames": true
  }
}
```

### AWS S3

**Provider ID**: `aws_s3`

**Configuration Schema**:
```json
{
  "type": "aws_s3",
  "bucket": "your-wedding-assets",
  "region": "us-east-1",
  "accessKeyId": "AKIAXXXXXXXXXXXXX",
  "secretAccessKey": "your-secret-access-key",
  "sessionToken": "optional-session-token",
  "endpoint": "https://s3.amazonaws.com",
  "s3ForcePathStyle": false,
  "signatureVersion": "v4",
  "publicUrl": "https://your-bucket.s3.amazonaws.com",
  "cdn": {
    "enabled": true,
    "distributionId": "E1234567890123",
    "domain": "https://cdn.yourwedding.com"
  },
  "options": {
    "maxFileSize": 52428800,
    "allowedMimeTypes": ["image/*", "video/*", "application/pdf"],
    "serverSideEncryption": "AES256",
    "storageClass": "STANDARD",
    "expires": 31536000
  }
}
```

### Supabase Storage

**Provider ID**: `supabase_storage`

**Configuration Schema**:
```json
{
  "type": "supabase_storage",
  "projectUrl": "https://your-project.supabase.co",
  "anonKey": "your-anon-key",
  "serviceRoleKey": "your-service-role-key",
  "buckets": {
    "public": {
      "name": "wedding-assets",
      "public": true,
      "fileSizeLimit": 52428800,
      "allowedMimeTypes": ["image/*", "video/*"]
    },
    "private": {
      "name": "private-documents",
      "public": false,
      "fileSizeLimit": 10485760,
      "allowedMimeTypes": ["application/pdf"]
    }
  },
  "options": {
    "duplex": "half",
    "upsert": false
  }
}
```

### PocketBase Storage

**Provider ID**: `pocketbase_storage`

**Configuration Schema**:
```json
{
  "type": "pocketbase_storage",
  "baseUrl": "http://localhost:8090",
  "collections": {
    "files": {
      "name": "files",
      "maxSize": 52428800,
      "mimeTypes": ["image/jpeg", "image/png", "image/gif", "video/mp4"],
      "thumbs": ["100x100", "300x300", "800x600"]
    },
    "documents": {
      "name": "documents",
      "maxSize": 10485760,
      "mimeTypes": ["application/pdf", "text/plain"],
      "thumbs": []
    }
  }
}
```

## 🔄 All-in-One Solutions

### Supabase Complete

**Provider ID**: `supabase_complete`

**Configuration Schema**:
```json
{
  "type": "supabase_complete",
  "projectUrl": "https://your-project.supabase.co",
  "anonKey": "your-anon-key",
  "serviceRoleKey": "your-service-role-key",
  "database": {
    "schema": "public",
    "enableRLS": true,
    "pooling": {
      "enabled": true,
      "mode": "transaction"
    }
  },
  "auth": {
    "autoRefreshToken": true,
    "detectSessionInUrl": true,
    "providers": {
      "email": true,
      "google": true,
      "github": true
    }
  },
  "storage": {
    "buckets": {
      "public": {
        "name": "public-assets",
        "public": true
      },
      "private": {
        "name": "private-files",
        "public": false
      }
    }
  },
  "realtime": {
    "enabled": true,
    "channels": ["rsvp_updates", "event_changes"]
  },
  "functions": {
    "enabled": true,
    "region": "us-east-1"
  }
}
```

### PocketBase Complete

**Provider ID**: `pocketbase_complete`

**Configuration Schema**:
```json
{
  "type": "pocketbase_complete",
  "baseUrl": "http://localhost:8090",
  "adminEmail": "admin@yourwedding.com",
  "adminPassword": "secure_admin_password",
  "settings": {
    "appName": "Wedding RSVP Platform",
    "appUrl": "https://yourwedding.com",
    "hideControls": false,
    "language": "en"
  },
  "smtp": {
    "enabled": true,
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "your-email@gmail.com",
    "password": "your-app-password",
    "tls": true
  },
  "s3": {
    "enabled": false,
    "bucket": "",
    "region": "",
    "endpoint": "",
    "accessKey": "",
    "secret": "",
    "forcePathStyle": false
  },
  "backups": {
    "enabled": true,
    "cron": "0 0 * * *",
    "s3": {
      "enabled": false
    }
  }
}
```

## 🔧 Configuration Validation

### Validation Rules

Each provider configuration is validated against:
- **Required Fields**: All mandatory configuration parameters
- **Data Types**: Correct types for each parameter
- **Format Validation**: URLs, emails, file paths
- **Range Validation**: Numeric limits and constraints
- **Dependency Validation**: Related configuration consistency

### Validation Examples

```bash
# Validate specific provider configuration
npm run providers:validate postgresql

# Validate all providers
npm run providers:validate --all

# Strict validation with extended checks
npm run providers:validate --strict

# Validate configuration file
npm run providers:validate --config=./config/providers.json
```

### Custom Validation Rules

You can define custom validation rules:

```javascript
// config/validation/custom-rules.js
module.exports = {
  postgresql: {
    customValidators: [
      {
        field: 'database',
        validator: (value) => value !== 'postgres',
        message: 'Database name cannot be "postgres"'
      }
    ]
  }
};
```

## 🔒 Security Considerations

### Credential Management
- Use environment variables for sensitive data
- Enable encryption for stored credentials
- Rotate credentials regularly
- Use least-privilege access policies

### Network Security
- Enable SSL/TLS where supported
- Use VPN or private networks for database connections
- Configure firewall rules appropriately
- Monitor for unauthorized access attempts

### Data Protection
- Enable encryption at rest and in transit
- Configure backup encryption
- Implement proper access controls
- Regular security audits and updates

## 📚 Environment-Specific Configurations

### Development
```json
{
  "database": {
    "type": "sqlite",
    "database": "./dev.db"
  },
  "auth": {
    "type": "local",
    "requireEmailVerification": false
  },
  "email": {
    "type": "smtp",
    "host": "localhost",
    "port": 1025
  },
  "storage": {
    "type": "local",
    "basePath": "./dev-uploads"
  }
}
```

### Staging
```json
{
  "database": {
    "type": "postgresql",
    "host": "staging-db.example.com"
  },
  "auth": {
    "type": "oauth2",
    "providers": {
      "google": {
        "enabled": true
      }
    }
  },
  "email": {
    "type": "sendgrid",
    "sandbox": {
      "enabled": true
    }
  },
  "storage": {
    "type": "aws_s3",
    "bucket": "staging-wedding-assets"
  }
}
```

### Production
```json
{
  "database": {
    "type": "postgresql",
    "host": "prod-db-cluster.example.com",
    "ssl": {
      "enabled": true
    },
    "pool": {
      "max": 20
    }
  },
  "auth": {
    "type": "oauth2",
    "providers": {
      "google": {
        "enabled": true
      },
      "microsoft": {
        "enabled": true
      }
    }
  },
  "email": {
    "type": "sendgrid",
    "tracking": {
      "clickTracking": true,
      "openTracking": true
    }
  },
  "storage": {
    "type": "aws_s3",
    "bucket": "prod-wedding-assets",
    "cdn": {
      "enabled": true
    }
  }
}
```

---

Continue to [Troubleshooting Guide](./troubleshooting.md) for help resolving common configuration and setup issues.