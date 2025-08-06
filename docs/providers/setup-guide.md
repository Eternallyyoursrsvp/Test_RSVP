# Provider Setup Guide

## Initial Setup Wizard

The RSVP Platform includes a comprehensive setup wizard that guides you through configuring your providers for the first time. This wizard automatically detects your environment and recommends optimal provider configurations.

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ installed
- Admin access to the platform
- Necessary credentials for chosen providers

### Starting the Setup Wizard

1. **Access the Setup Wizard**
   ```bash
   npm run setup:wizard
   ```
   Or navigate to `/admin/setup` in your browser

2. **Choose Provider Type**
   - **All-in-One**: Supabase, PocketBase, or Firebase for complete backend
   - **Modular**: Mix and match individual providers

3. **Follow the Wizard Steps**
   - Provider selection and configuration
   - Credential validation and testing
   - Database schema setup and migration
   - Initial data seeding

## 📋 Step-by-Step Setup

### Step 1: Provider Type Selection

The wizard first asks you to choose your provider strategy:

#### All-in-One Solutions (Recommended for beginners)
- **Supabase**: Complete PostgreSQL database, authentication, storage, and real-time features
- **PocketBase**: Self-hosted solution with built-in database, auth, and file storage
- **Firebase**: Google's complete backend platform

#### Modular Approach (Advanced users)
- **Database**: PostgreSQL, MySQL, SQLite
- **Authentication**: Database Auth (default) or Supabase Auth (advanced)
- **Email**: SMTP, SendGrid, Mailgun, Resend
- **Storage**: Local, AWS S3, Cloud Storage

### Step 1.5: Authentication Method Selection (NEW!)

*The platform now includes a dedicated authentication configuration step:*

#### **Database Authentication (Default & Recommended)**
- **Enterprise-grade security**: bcrypt 12 rounds, OTP generation
- **Zero dependencies**: No external auth services required
- **Bootstrap-ready**: Automatic first-time setup with console credentials
- **Production-proven**: Secure password policies and account locking

#### **Supabase Authentication (Advanced Features)**
- **Magic links**: Passwordless authentication via email
- **OAuth providers**: Google, GitHub, Facebook, Apple integration
- **Row Level Security**: Automatic database security policies
- **User management**: Built-in admin dashboard for user management

#### **UI-Based Method Switching**
- **Runtime switching**: Change authentication methods without downtime
- **Admin-controlled**: Secure switching requires admin authentication
- **Fallback protection**: Automatic fallback to Database Auth if needed
- **Configuration persistence**: Settings survive server restarts

### Step 2: Configuration

Each provider requires specific configuration parameters:

#### Database Configuration
```json
{
  "type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "database": "rsvp_platform",
  "username": "your_username",
  "password": "your_password",
  "ssl": true,
  "connectionLimit": 10
}
```

#### Authentication Configuration
*The platform now supports dual authentication architectures with UI-based switching:*

**Database Authentication (Default)**
```json
{
  "type": "database",
  "method": "database",
  "jwtSecret": "auto-generated-during-setup",
  "sessionTimeout": 86400,
  "passwordPolicy": {
    "minLength": 12,
    "requireMixedCase": true,
    "requireNumbers": true,
    "requireSymbols": true
  },
  "security": {
    "bcryptRounds": 12,
    "maxFailedAttempts": 5,
    "lockoutDuration": 900
  }
}
```

**Supabase Authentication (Optional)**
```json
{
  "type": "supabase",
  "method": "supabase",
  "config": {
    "url": "https://your-project.supabase.co",
    "anonKey": "your-anon-key",
    "serviceRoleKey": "your-service-key"
  },
  "features": {
    "magicLinks": true,
    "oauthProviders": ["google", "github", "facebook"],
    "emailVerification": true,
    "rowLevelSecurity": true
  }
}
```

**Authentication Method Switching**
```json
{
  "allowSwitching": true,
  "currentMethod": "database",
  "fallbackMethod": "database",
  "switchingRequiresAdmin": true,
  "bootstrapMode": "database-only"
}
```

#### Email Configuration
```json
{
  "type": "sendgrid",
  "apiKey": "your_sendgrid_api_key",
  "fromEmail": "noreply@yourwedding.com",
  "fromName": "Your Wedding Platform",
  "templates": {
    "welcome": "d-xxxxxxxxx",
    "rsvp_confirmation": "d-yyyyyyyyy"
  }
}
```

#### Storage Configuration
```json
{
  "type": "aws_s3",
  "bucket": "your-wedding-assets",
  "region": "us-east-1",
  "accessKeyId": "your_access_key",
  "secretAccessKey": "your_secret_key",
  "publicUrl": "https://your-bucket.s3.amazonaws.com"
}
```

### Step 3: Validation and Testing

The wizard automatically validates each configuration:

- **Connectivity Tests**: Verifies connection to services
- **Credential Validation**: Confirms authentication works
- **Permission Checks**: Ensures required permissions are available
- **Performance Tests**: Measures response times and throughput

### Step 4: Database Setup

For database providers, the wizard handles:

- **Schema Creation**: Creates all necessary tables and indexes
- **Initial Data**: Seeds required system data
- **User Creation**: Sets up initial admin user
- **Constraints**: Applies foreign keys and constraints

### Step 5: Final Configuration

The wizard completes setup by:

- **Environment Variables**: Updates `.env` files
- **Configuration Files**: Generates provider config files
- **Service Registration**: Registers providers with the system
- **Health Checks**: Runs final validation tests

## 🔧 Manual Configuration

If you prefer manual setup or need to configure providers outside the wizard:

### Environment Variables

Create or update your `.env` file:

```bash
# Database
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Authentication (Multi-Provider Support)
# Default: Database Authentication (Enterprise-grade)
AUTH_METHOD=database
JWT_SECRET=auto-generated-during-first-time-setup
SESSION_SECRET=auto-generated-during-first-time-setup

# Optional: Supabase Authentication Service
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Authentication Security Settings
AUTH_BCRYPT_ROUNDS=12
AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCKOUT_DURATION=900
AUTH_SESSION_TIMEOUT=86400

# Email
EMAIL_PROVIDER=sendgrid
EMAIL_SENDGRID_API_KEY=your-api-key
EMAIL_FROM_ADDRESS=noreply@yourwedding.com

# Storage
STORAGE_PROVIDER=aws_s3
STORAGE_S3_BUCKET=your-bucket
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY=your-access-key
STORAGE_S3_SECRET_KEY=your-secret-key
```

### Configuration Files

Create provider-specific configuration files in `/config/providers/`:

```javascript
// config/providers/database.js
module.exports = {
  provider: 'postgresql',
  config: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'rsvp_platform',
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000
    }
  }
};
```

### Manual Database Setup

Run database migrations manually:

```bash
# Create database schema
npm run db:create

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

## 🏗️ All-in-One Provider Setups

### Supabase Complete Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and anon key

2. **Configure in Wizard**
   ```json
   {
     "type": "supabase",
     "projectUrl": "https://your-project.supabase.co",
     "anonKey": "your-anon-key",
     "serviceRoleKey": "your-service-key"
   }
   ```

3. **Enable Required Services**
   - Authentication: Enable email/password and OAuth providers
   - Database: RLS policies will be automatically configured
   - Storage: Create buckets for wedding assets

### PocketBase Complete Setup

1. **Download PocketBase**
   ```bash
   wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.0/pocketbase_0.20.0_linux_amd64.zip
   unzip pocketbase_0.20.0_linux_amd64.zip
   ```

2. **Start PocketBase**
   ```bash
   ./pocketbase serve --http=0.0.0.0:8090
   ```

3. **Configure in Wizard**
   ```json
   {
     "type": "pocketbase",
     "baseUrl": "http://localhost:8090",
     "adminEmail": "admin@yourwedding.com",
     "adminPassword": "your-secure-password"
   }
   ```

## 🔍 Validation and Testing

### Automated Validation

The setup wizard runs comprehensive validation:

```bash
# Run validation manually
npm run providers:validate

# Test specific provider
npm run providers:test database
npm run providers:test auth
npm run providers:test email
npm run providers:test storage

# Test authentication methods specifically
npm run auth:test database
npm run auth:test supabase
npm run auth:test switching
npm run auth:test fallback

# Run comprehensive authentication test suite
npx playwright test tests/auth-system.spec.js
```

### Health Checks

Monitor provider health after setup:

```bash
# Check all providers
npm run providers:health

# Detailed provider status
npm run providers:status --detailed
```

### Performance Testing

Test provider performance:

```bash
# Run performance benchmarks
npm run providers:benchmark

# Load testing
npm run providers:load-test --duration=60s
```

## 🚨 Troubleshooting

### Common Issues

#### Connection Failures
- Verify network connectivity
- Check firewall settings
- Confirm credentials are correct
- Ensure services are running

#### Permission Errors
- Verify user permissions on database
- Check API key permissions
- Confirm bucket policies for storage
- Review OAuth app settings

#### Configuration Errors
- Validate JSON syntax in config files
- Check environment variable names
- Confirm all required fields are provided
- Review provider-specific requirements

#### Authentication Setup Issues
- **Bootstrap mode not detected**: Check if .env file exists or set `BOOTSTRAP_MODE=true`
- **Admin credentials not shown**: Check console output for credentials display box
- **Authentication method not switching**: Verify admin authentication and configuration permissions
- **Supabase connection failed**: Verify URL and keys are correct and project is active
- **Circular dependency errors**: Ensure proper module loading order during bootstrap

#### First-Time Setup Problems
- **OTP not generated**: Check crypto module availability and server startup logs
- **Password change not enforced**: Verify user has `passwordChangeRequired=true`
- **Users table not created**: Check database permissions and schema migration status
- **Factory initialization errors**: Check for auth-config.json conflicts

### Validation Errors

If validation fails, check:

1. **Provider Status**: Is the service running?
2. **Credentials**: Are they correct and not expired?
3. **Permissions**: Does the account have required permissions?
4. **Network**: Can the application reach the service?
5. **Configuration**: Are all required fields provided?

### Getting Help

- Check the [Troubleshooting Guide](./troubleshooting.md)
- Review provider-specific documentation
- Run validation with verbose logging: `npm run providers:validate --verbose`
- Check system logs for detailed error messages

## 📈 Next Steps

After successful setup:

1. **Review Security Settings**: Ensure production-ready security
2. **Configure Monitoring**: Set up health checks and alerts
3. **Plan Backups**: Implement backup strategies
4. **Test Switching**: Practice switching between providers in staging
5. **Document Configuration**: Keep records of your setup for team reference

---

Continue to [Provider Switching Guide](./switching-guide.md) to learn about safely switching providers after initial setup.