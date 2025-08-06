# Provider Troubleshooting Guide

## Overview

This guide provides solutions to common provider-related issues, diagnostic procedures, and recovery strategies for the RSVP Platform's provider system.

## 🚨 Common Issues and Solutions

### Database Connection Issues

#### Issue: "Connection refused" or "Connection timeout"
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: connect ETIMEDOUT
```

**Causes**:
- Database server is not running
- Incorrect host or port configuration
- Firewall blocking connections
- Network connectivity issues

**Solutions**:
1. **Verify Database Status**
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Start PostgreSQL if stopped
   sudo systemctl start postgresql
   
   # Check MySQL status
   sudo systemctl status mysql
   ```

2. **Test Connection**
   ```bash
   # Test PostgreSQL connection
   psql -h localhost -p 5432 -U username -d database_name
   
   # Test MySQL connection
   mysql -h localhost -P 3306 -u username -p database_name
   ```

3. **Check Firewall**
   ```bash
   # Check if port is open (Linux)
   sudo ufw status
   sudo ufw allow 5432/tcp
   
   # Check port binding
   netstat -tlnp | grep :5432
   ```

4. **Validate Configuration**
   ```bash
   # Run provider validation
   npm run providers:validate database --verbose
   
   # Test connectivity
   npm run providers:test-connection database
   ```

#### Issue: "Authentication failed" or "Access denied"
```
Error: password authentication failed for user "username"
Error: Access denied for user 'username'@'localhost'
```

**Solutions**:
1. **Verify Credentials**
   ```bash
   # Test credentials manually
   psql -h localhost -U username -d database_name
   
   # Check environment variables
   echo $DATABASE_USER
   echo $DATABASE_PASSWORD
   ```

2. **Reset Database User Password**
   ```sql
   -- PostgreSQL
   ALTER USER username PASSWORD 'new_password';
   
   -- MySQL
   ALTER USER 'username'@'localhost' IDENTIFIED BY 'new_password';
   ```

3. **Check User Permissions**
   ```sql
   -- PostgreSQL
   GRANT ALL PRIVILEGES ON DATABASE database_name TO username;
   
   -- MySQL
   GRANT ALL PRIVILEGES ON database_name.* TO 'username'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Authentication Provider Issues

#### Issue: OAuth callback errors
```
Error: OAuth callback failed - invalid state parameter
Error: OAuth provider returned error: access_denied
```

**Solutions**:
1. **Verify OAuth Configuration**
   ```json
   {
     "google": {
       "clientId": "correct_client_id",
       "clientSecret": "correct_client_secret",
       "callbackUrl": "https://yourdomain.com/auth/google/callback"
     }
   }
   ```

2. **Check OAuth App Settings**
   - Verify redirect URIs in provider console
   - Ensure client ID and secret are correct
   - Check OAuth app status (enabled/disabled)

3. **Debug OAuth Flow**
   ```bash
   # Enable OAuth debugging
   DEBUG=oauth:* npm start
   
   # Test OAuth endpoints
   curl -X GET "https://yourdomain.com/auth/google"
   ```

#### Issue: JWT token validation failures
```
Error: JsonWebTokenError: invalid signature
Error: TokenExpiredError: jwt expired
```

**Solutions**:
1. **Verify JWT Configuration**
   ```json
   {
     "jwt": {
       "secret": "your-super-secure-jwt-secret",
       "expiresIn": "7d",
       "algorithm": "HS256"
     }
   }
   ```

2. **Check Token Generation**
   ```bash
   # Generate new JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Test JWT validation
   npm run auth:test-jwt
   ```

### Email Provider Issues

#### Issue: SMTP connection failures
```
Error: Invalid login: 534-5.7.9 Application-specific password required
Error: Connection timeout
```

**Solutions**:
1. **SMTP Configuration Check**
   ```json
   {
     "host": "smtp.gmail.com",
     "port": 587,
     "secure": false,
     "auth": {
       "user": "your-email@gmail.com",
       "pass": "app-specific-password"
     }
   }
   ```

2. **Gmail App Passwords**
   - Enable 2-factor authentication
   - Generate app-specific password
   - Use app password instead of regular password

3. **Test SMTP Connection**
   ```bash
   # Test SMTP connectivity
   telnet smtp.gmail.com 587
   
   # Test email sending
   npm run email:test-smtp
   ```

#### Issue: SendGrid API errors
```
Error: HTTP Error 401: Unauthorized
Error: HTTP Error 403: Forbidden
```

**Solutions**:
1. **Verify API Key**
   ```bash
   # Test SendGrid API key
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -H "Content-Type: application/json"
   ```

2. **Check API Key Permissions**
   - Verify API key has "Mail Send" permissions
   - Check sender authentication settings
   - Verify domain authentication if applicable

### Storage Provider Issues

#### Issue: AWS S3 access denied
```
Error: AccessDenied: Access Denied
Error: SignatureDoesNotMatch: The request signature we calculated does not match
```

**Solutions**:
1. **Verify IAM Permissions**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::your-bucket/*"
       }
     ]
   }
   ```

2. **Test S3 Access**
   ```bash
   # Test S3 credentials
   aws s3 ls s3://your-bucket --profile your-profile
   
   # Test upload
   aws s3 cp test.txt s3://your-bucket/test.txt
   ```

3. **Check Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::account-id:user/username"
         },
         "Action": "s3:*",
         "Resource": [
           "arn:aws:s3:::your-bucket",
           "arn:aws:s3:::your-bucket/*"
         ]
       }
     ]
   }
   ```

#### Issue: Local storage permissions
```
Error: EACCES: permission denied, mkdir '/uploads'
Error: ENOENT: no such file or directory
```

**Solutions**:
1. **Check Directory Permissions**
   ```bash
   # Create upload directory
   mkdir -p ./uploads
   
   # Set correct permissions
   chmod 755 ./uploads
   chown www-data:www-data ./uploads
   ```

2. **Verify Path Configuration**
   ```json
   {
     "basePath": "./uploads",
     "publicPath": "/uploads"
   }
   ```

## 🔍 Diagnostic Tools

### Built-in Diagnostics

#### Provider Health Check
```bash
# Check all providers
npm run providers:health

# Check specific provider
npm run providers:health database

# Detailed health report
npm run providers:health --detailed --output=json
```

#### Configuration Validation
```bash
# Validate all configurations
npm run providers:validate --all

# Validate with strict mode
npm run providers:validate --strict

# Validate specific provider
npm run providers:validate postgresql --verbose
```

#### Connection Testing
```bash
# Test all provider connections
npm run providers:test-connections

# Test specific provider
npm run providers:test database

# Performance benchmarking
npm run providers:benchmark --duration=30s
```

### Manual Diagnostic Steps

#### Database Diagnostics
```bash
# Check database connectivity
npm run db:check-connection

# Verify schema integrity
npm run db:verify-schema

# Check database performance
npm run db:performance-test

# View connection pool status
npm run db:pool-status
```

#### Authentication Diagnostics
```bash
# Test authentication flow
npm run auth:test-flow

# Verify JWT configuration
npm run auth:verify-jwt

# Test OAuth providers
npm run auth:test-oauth google
npm run auth:test-oauth github
```

#### Email Diagnostics
```bash
# Test email configuration
npm run email:test-config

# Send test email
npm run email:send-test --to=test@example.com

# Check email queue status
npm run email:queue-status
```

#### Storage Diagnostics
```bash
# Test file upload
npm run storage:test-upload

# Check storage permissions
npm run storage:check-permissions

# Verify storage connectivity
npm run storage:test-connection
```

## 🔧 Recovery Procedures

### Database Recovery

#### Connection Pool Exhaustion
```bash
# Reset connection pool
npm run db:reset-pool

# Restart database connections
npm run db:reconnect

# Monitor active connections
npm run db:monitor-connections
```

#### Schema Corruption
```bash
# Restore from backup
npm run db:restore --backup-id=backup_20240131_142530

# Verify schema integrity
npm run db:verify-schema --fix

# Rebuild indexes if needed
npm run db:rebuild-indexes
```

### Authentication Recovery

#### Session Issues
```bash
# Clear all sessions
npm run auth:clear-sessions

# Reset JWT secrets (requires user re-login)
npm run auth:rotate-jwt-secret

# Verify authentication system
npm run auth:system-check
```

#### OAuth Provider Issues
```bash
# Refresh OAuth tokens
npm run auth:refresh-tokens

# Re-register OAuth callbacks
npm run auth:register-callbacks

# Test OAuth flow
npm run auth:test-oauth-flow
```

### Email Recovery

#### Queue Backup
```bash
# Process stuck email queue
npm run email:process-queue --force

# Clear failed emails
npm run email:clear-failed

# Retry failed emails
npm run email:retry-failed --max-attempts=3
```

#### Provider Failover
```bash
# Switch to backup email provider
npm run email:failover --provider=backup-smtp

# Test failover configuration
npm run email:test-failover
```

### Storage Recovery

#### File System Issues
```bash
# Check disk space
df -h

# Fix file permissions
npm run storage:fix-permissions

# Verify file integrity
npm run storage:verify-files
```

#### Cloud Storage Issues
```bash
# Sync local to cloud
npm run storage:sync --direction=up

# Restore from backup
npm run storage:restore --backup-id=storage_backup_20240131

# Verify cloud connectivity
npm run storage:test-cloud-connection
```

## 📊 Monitoring and Alerts

### Health Monitoring

#### Set up automated health checks
```bash
# Install monitoring agent
npm install @rsvp-platform/monitoring

# Configure health checks
npm run monitoring:setup

# Start monitoring
npm run monitoring:start
```

#### Monitor key metrics
- Database connection count and response time
- Authentication success/failure rates
- Email delivery rates and bounce rates
- Storage usage and upload success rates

### Alert Configuration

#### Create alert rules
```json
{
  "alerts": {
    "database": {
      "connectionFailures": {
        "threshold": 5,
        "window": "5m",
        "action": "email"
      },
      "slowQueries": {
        "threshold": 1000,
        "window": "1m",
        "action": "slack"
      }
    },
    "auth": {
      "loginFailures": {
        "threshold": 10,
        "window": "5m",
        "action": "email"
      }
    },
    "email": {
      "deliveryFailures": {
        "threshold": 50,
        "window": "10m",
        "action": "pagerduty"
      }
    }
  }
}
```

### Log Analysis

#### Enable detailed logging
```bash
# Set log level
export LOG_LEVEL=debug

# Enable provider-specific logging
export DATABASE_LOG_QUERIES=true
export AUTH_LOG_ATTEMPTS=true
export EMAIL_LOG_SENDS=true
export STORAGE_LOG_OPERATIONS=true
```

#### Analyze logs
```bash
# View provider logs
npm run logs:providers --tail

# Search for specific errors
npm run logs:search "connection refused"

# Generate log report
npm run logs:report --from="2024-01-31" --to="2024-02-01"
```

## 🆘 Emergency Procedures

### Critical System Failures

#### Complete System Recovery
1. **Stop all services**
   ```bash
   npm run services:stop
   ```

2. **Restore from last known good backup**
   ```bash
   npm run system:restore --backup-id=system_backup_latest
   ```

3. **Verify all providers**
   ```bash
   npm run providers:verify-all --strict
   ```

4. **Start services gradually**
   ```bash
   npm run services:start --progressive
   ```

#### Provider Failover
```bash
# Automatic failover to backup providers
npm run providers:failover --auto

# Manual failover to specific provider
npm run providers:failover database --to=backup-postgresql

# Verify failover success
npm run providers:verify-failover
```

### Data Loss Prevention

#### Immediate Backup
```bash
# Create emergency backup
npm run backup:emergency --include-all

# Verify backup integrity
npm run backup:verify --backup-id=emergency_backup_latest
```

#### Data Integrity Check
```bash
# Check data consistency
npm run data:integrity-check --full

# Repair data inconsistencies
npm run data:repair --auto-fix=safe
```

## 📞 Getting Help

### Support Channels

1. **Documentation**: Check provider-specific guides first
2. **Community**: Search existing issues and discussions
3. **Support**: Contact support with detailed error information

### Information to Provide

When reporting issues, include:

1. **Error Messages**: Complete error logs and stack traces
2. **Configuration**: Sanitized provider configuration (remove secrets)
3. **Environment**: System information and versions
4. **Steps to Reproduce**: Detailed reproduction steps
5. **Recent Changes**: Any recent configuration or code changes

### Diagnostic Report

Generate a comprehensive diagnostic report:

```bash
# Generate support report
npm run support:generate-report

# Include logs in report
npm run support:generate-report --include-logs

# Sanitize sensitive information
npm run support:generate-report --sanitize
```

### Emergency Contacts

For critical production issues:
- Priority 1 (System Down): Use emergency escalation procedures
- Priority 2 (Degraded Service): Standard support channels
- Priority 3 (Questions/Issues): Documentation and community resources

---

For additional help, refer to the [Configuration Reference](./configuration-reference.md) or provider-specific documentation in the respective provider folders.