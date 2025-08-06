# PocketBase Complete Setup Guide

## Overview

PocketBase is a self-hosted, open-source backend that provides SQLite database, authentication, file storage, and real-time subscriptions in a single executable. This guide covers setting up PocketBase as a complete solution for the RSVP Platform.

## 🚀 Quick Start

### Prerequisites
- Server with at least 1GB RAM and 10GB storage
- Admin access to server and RSVP Platform
- Basic understanding of SQLite and REST APIs

### 1. Install PocketBase

#### Option 1: Download Precompiled Binary

```bash
# Download latest release (Linux)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.0/pocketbase_0.20.0_linux_amd64.zip

# Extract
unzip pocketbase_0.20.0_linux_amd64.zip

# Make executable
chmod +x pocketbase

# Start PocketBase
./pocketbase serve --http=0.0.0.0:8090
```

#### Option 2: Docker

```bash
# Pull PocketBase image
docker pull pocketbase/pocketbase:latest

# Run PocketBase
docker run -d \
  --name pocketbase \
  -p 8090:8090 \
  -v /path/to/data:/pb_data \
  pocketbase/pocketbase:latest
```

#### Option 3: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  pocketbase:
    image: pocketbase/pocketbase:latest
    container_name: wedding-pocketbase
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb_data
      - ./pb_public:/pb_public
    environment:
      - POCKETBASE_ADMIN_EMAIL=admin@yourwedding.com
      - POCKETBASE_ADMIN_PASSWORD=secure_admin_password
```

### 2. Initial Setup

1. **Access Admin UI**: Navigate to `http://localhost:8090/_/`
2. **Create Admin Account**:
   - Email: `admin@yourwedding.com`
   - Password: Strong password (min 8 characters)
3. **Admin Dashboard**: You'll be redirected to the admin interface

### 3. Configure RSVP Platform

#### Environment Variables
```bash
# Add to your .env file
PROVIDER_TYPE=pocketbase
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@yourwedding.com
POCKETBASE_ADMIN_PASSWORD=secure_admin_password
```

#### Configuration File
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
  "auth": {
    "emailAuth": {
      "enabled": true,
      "requireEmailVerification": true,
      "minPasswordLength": 8
    },
    "oauth": {
      "google": {
        "enabled": true,
        "clientId": "your-google-client-id",
        "clientSecret": "your-google-client-secret"
      }
    }
  },
  "storage": {
    "maxFileSize": 52428800,
    "thumbSizes": ["100x100", "300x300", "800x600"]
  },
  "backups": {
    "enabled": true,
    "cron": "0 2 * * *"
  }
}
```

## 🗄️ Database Setup

### Schema Creation

PocketBase uses collections instead of traditional database tables. Create collections through the admin UI or via API:

#### Events Collection

```json
{
  "name": "events",
  "type": "base",
  "schema": [
    {
      "name": "title",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 255
      }
    },
    {
      "name": "description",
      "type": "editor",
      "required": false
    },
    {
      "name": "date",
      "type": "date",
      "required": true
    },
    {
      "name": "location",
      "type": "text",
      "required": false
    },
    {
      "name": "max_guests",
      "type": "number",
      "required": false
    },
    {
      "name": "owner",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "users",
        "cascadeDelete": false
      }
    },
    {
      "name": "photos",
      "type": "file",
      "required": false,
      "options": {
        "maxSelect": 10,
        "maxSize": 5242880,
        "mimeTypes": ["image/jpeg", "image/png", "image/gif"]
      }
    }
  ],
  "listRule": "@request.auth.id != \"\"",
  "viewRule": "@request.auth.id != \"\"",
  "createRule": "@request.auth.id != \"\"",
  "updateRule": "@request.auth.id = owner.id",
  "deleteRule": "@request.auth.id = owner.id"
}
```

#### Guests Collection

```json
{
  "name": "guests",
  "type": "base",
  "schema": [
    {
      "name": "event",
      "type": "relation",
      "required": true,
      "options": {
        "collectionId": "events",
        "cascadeDelete": true
      }
    },
    {
      "name": "email",
      "type": "email",
      "required": true
    },
    {
      "name": "name",
      "type": "text",
      "required": true,
      "options": {
        "min": 1,
        "max": 255
      }
    },
    {
      "name": "phone",
      "type": "text",
      "required": false
    },
    {
      "name": "rsvp_status",
      "type": "select",
      "required": true,
      "options": {
        "maxSelect": 1,
        "values": ["pending", "accepted", "declined"]
      }
    },
    {
      "name": "plus_ones",
      "type": "number",
      "required": false,
      "options": {
        "min": 0,
        "max": 10
      }
    },
    {
      "name": "dietary_restrictions",
      "type": "text",
      "required": false
    },
    {
      "name": "transport_needed",
      "type": "bool",
      "required": false
    },
    {
      "name": "accommodation_needed",
      "type": "bool",
      "required": false
    }
  ],
  "listRule": "@request.auth.id = event.owner.id || email = @request.auth.email",
  "viewRule": "@request.auth.id = event.owner.id || email = @request.auth.email",
  "createRule": "@request.auth.id != \"\"",
  "updateRule": "@request.auth.id = event.owner.id || email = @request.auth.email",
  "deleteRule": "@request.auth.id = event.owner.id"
}
```

### Automated Schema Setup

Create collections programmatically:

```javascript
// setup/pocketbase-schema.js
const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://localhost:8090');

const setupSchema = async () => {
  // Authenticate as admin
  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL,
    process.env.POCKETBASE_ADMIN_PASSWORD
  );

  // Create events collection
  const eventsCollection = await pb.collections.create({
    name: 'events',
    type: 'base',
    schema: [
      // ... schema definition
    ]
  });

  // Create guests collection
  const guestsCollection = await pb.collections.create({
    name: 'guests',
    type: 'base',
    schema: [
      // ... schema definition
    ]
  });

  console.log('Schema setup complete!');
};

setupSchema().catch(console.error);
```

Run schema setup:
```bash
node setup/pocketbase-schema.js
```

## 🔐 Authentication Setup

### Email Authentication

Email authentication is enabled by default:

1. **Email Verification**: Configure in Settings → Auth
2. **Password Policy**: Set minimum requirements
3. **Email Templates**: Customize verification and reset emails

#### Custom Email Templates

```html
<!-- Email verification template -->
<h2>Welcome to {{.meta.appName}}!</h2>
<p>Please verify your email address by clicking the link below:</p>
<a href="{{.meta.appUrl}}/_/#/auth/confirm-verification/{{.token}}">
  Verify Email
</a>

<!-- Password reset template -->
<h2>Password Reset</h2>
<p>Click the link below to reset your password:</p>
<a href="{{.meta.appUrl}}/_/#/auth/confirm-password-reset/{{.token}}">
  Reset Password
</a>
```

### OAuth Providers

#### Google OAuth Setup

1. **Google Cloud Console**:
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:8090/api/oauth2-redirect`

2. **PocketBase Configuration**:
   ```javascript
   // Enable Google OAuth
   await pb.settings.update({
     'googleAuth.enabled': true,
     'googleAuth.clientId': 'your-google-client-id',
     'googleAuth.clientSecret': 'your-google-client-secret'
   });
   ```

#### GitHub OAuth Setup

1. **GitHub Settings**:
   - Create OAuth App
   - Authorization callback URL: `http://localhost:8090/api/oauth2-redirect`

2. **Enable in PocketBase**:
   ```javascript
   await pb.settings.update({
     'githubAuth.enabled': true,
     'githubAuth.clientId': 'your-github-client-id',
     'githubAuth.clientSecret': 'your-github-client-secret'
   });
   ```

### Authentication Rules

Define access rules for collections:

```javascript
// Event access rules
{
  "listRule": "@request.auth.id != \"\"",
  "viewRule": "@request.auth.id != \"\"",
  "createRule": "@request.auth.id != \"\"",
  "updateRule": "@request.auth.id = owner.id",
  "deleteRule": "@request.auth.id = owner.id"
}

// Guest access rules
{
  "listRule": "@request.auth.id = event.owner.id || email = @request.auth.email",
  "viewRule": "@request.auth.id = event.owner.id || email = @request.auth.email",
  "createRule": "@request.auth.id != \"\"",
  "updateRule": "@request.auth.id = event.owner.id || email = @request.auth.email",
  "deleteRule": "@request.auth.id = event.owner.id"
}
```

## 📁 File Storage

### Storage Configuration

PocketBase provides built-in file storage:

1. **File Fields**: Add file fields to collections
2. **Storage Location**: Files stored in `pb_data/storage`
3. **Public Access**: Files accessible via `/api/files/{collection}/{record}/{filename}`

#### File Upload Example

```javascript
// Upload wedding photo
const uploadPhoto = async (eventId, file) => {
  const formData = new FormData();
  formData.append('photos', file);
  formData.append('title', 'Wedding Photo');
  formData.append('event', eventId);

  const record = await pb.collection('photos').create(formData);
  return record;
};

// Get file URL
const getPhotoUrl = (record, filename) => {
  return pb.getFileUrl(record, filename);
};
```

### File Validation

Configure file upload restrictions:

```json
{
  "name": "photos",
  "type": "file",
  "options": {
    "maxSelect": 10,
    "maxSize": 5242880,
    "mimeTypes": [
      "image/jpeg",
      "image/png", 
      "image/gif",
      "image/webp"
    ],
    "thumbs": [
      "100x100",
      "300x300",
      "800x600"
    ]
  }
}
```

### Thumbnail Generation

PocketBase automatically generates thumbnails:

```javascript
// Get different thumbnail sizes
const getThumbnailUrl = (record, filename, size) => {
  return pb.getFileUrl(record, filename, { thumb: size });
};

// Examples
const smallThumb = getThumbnailUrl(record, 'photo.jpg', '100x100');
const mediumThumb = getThumbnailUrl(record, 'photo.jpg', '300x300');
const largeThumb = getThumbnailUrl(record, 'photo.jpg', '800x600');
```

## 🔄 Real-time Features

### Real-time Subscriptions

```javascript
// Subscribe to RSVP updates
const subscribeToRSVPUpdates = (eventId) => {
  pb.collection('guests').subscribe('*', (e) => {
    if (e.record.event === eventId) {
      console.log('RSVP update:', e.action, e.record);
      // Update UI accordingly
    }
  });
};

// Subscribe to specific record
const subscribeToEvent = (eventId) => {
  pb.collection('events').subscribe(eventId, (e) => {
    console.log('Event update:', e.action, e.record);
  });
};

// Unsubscribe
pb.collection('guests').unsubscribe();
```

### Server-Sent Events

PocketBase provides SSE endpoints:

```javascript
// Connect to SSE endpoint
const eventSource = new EventSource(
  `http://localhost:8090/api/realtime?channels=guests`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

## 📧 Email Configuration

### SMTP Setup

Configure SMTP for email notifications:

```javascript
// Update SMTP settings
await pb.settings.update({
  'smtp.enabled': true,
  'smtp.host': 'smtp.gmail.com',
  'smtp.port': 587,
  'smtp.username': 'your-email@gmail.com',
  'smtp.password': 'your-app-password',
  'smtp.tls': true,
  'meta.senderName': 'Wedding RSVP Platform',
  'meta.senderAddress': 'noreply@yourwedding.com'
});
```

### Email Templates

Customize email templates in the admin UI:

1. **Settings → Mail settings**
2. **Edit templates**:
   - Verification email
   - Password reset email
   - Email change confirmation

## 🔧 Advanced Configuration

### Custom Hooks

Extend PocketBase with custom server-side logic:

```go
// main.go
package main

import (
    "log"
    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
)

func main() {
    app := pocketbase.New()

    // Custom hook for RSVP notifications
    app.OnRecordAfterCreateRequest("guests").Add(func(e *core.RecordCreateEvent) error {
        // Send RSVP confirmation email
        sendRSVPConfirmation(e.Record)
        return nil
    })

    // Custom hook for event updates
    app.OnRecordAfterUpdateRequest("events").Add(func(e *core.RecordUpdateEvent) error {
        // Notify all guests of event changes
        notifyGuestsOfChanges(e.Record)
        return nil
    })

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

### Custom Endpoints

Add custom API endpoints:

```go
// Add custom endpoint
app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
    e.Router.POST("/api/custom/rsvp-stats", func(c echo.Context) error {
        // Custom RSVP statistics endpoint
        stats := calculateRSVPStats()
        return c.JSON(200, stats)
    })
    return nil
})
```

### Database Migrations

Handle schema migrations:

```javascript
// migrations/001_initial_schema.js
migrate((db) => {
  // Create initial collections and fields
  const collection = new Collection({
    name: "events",
    type: "base",
    schema: [
      // ... schema definition
    ]
  });
  
  return Dao(db).saveCollection(collection);
}, (db) => {
  // Rollback
  return Dao(db).deleteCollection("events");
});
```

## 📊 Monitoring and Backup

### Built-in Analytics

Access analytics through admin UI:
- Collection statistics
- User activity
- File storage usage
- API request metrics

### Automatic Backups

Configure automatic backups:

```bash
# Enable daily backups at 2 AM
./pocketbase serve --backup-cron="0 2 * * *"

# Backup to S3
./pocketbase serve \
  --backup-cron="0 2 * * *" \
  --backup-s3-bucket="wedding-backups" \
  --backup-s3-region="us-east-1" \
  --backup-s3-access-key="your-access-key" \
  --backup-s3-secret="your-secret-key"
```

### Manual Backup

```bash
# Create manual backup
curl -X POST http://localhost:8090/api/admin/backup \
  -H "Authorization: Bearer admin-token"

# Download backup
curl -X GET http://localhost:8090/api/admin/backup/filename.zip \
  -H "Authorization: Bearer admin-token" \
  -o backup.zip
```

### Health Monitoring

```bash
# Health check endpoint
curl http://localhost:8090/api/health

# Admin stats
curl -X GET http://localhost:8090/api/admin/stats \
  -H "Authorization: Bearer admin-token"
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 8090
lsof -i :8090

# Kill process
kill -9 <PID>

# Or use different port
./pocketbase serve --http=0.0.0.0:8091
```

#### Database Locked
```bash
# Stop PocketBase
pkill pocketbase

# Check for lock files
ls -la pb_data/

# Remove lock file if exists
rm pb_data/data.db-wal
rm pb_data/data.db-shm

# Restart PocketBase
./pocketbase serve
```

#### Email Delivery Issues
1. **Check SMTP Settings**: Verify host, port, credentials
2. **Test Email**: Use admin UI to send test email
3. **Check Logs**: Review PocketBase logs for errors
4. **Firewall**: Ensure SMTP ports are open

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_guests_event ON guests(event);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_events_date ON events(date);
```

#### File Storage Optimization
- Enable gzip compression
- Use CDN for static files
- Implement file cleanup for old uploads

### Scaling Considerations

#### Horizontal Scaling
- Use load balancer for multiple instances
- Shared file storage (NFS, S3)
- Database replication (requires custom setup)

#### Vertical Scaling
- Increase server resources
- Optimize database queries
- Enable connection pooling

## 🔐 Security Best Practices

### Access Control
- Use strong admin passwords
- Implement proper collection rules
- Regular security audits
- Monitor access logs

### Network Security
- Use HTTPS in production
- Configure proper firewall rules
- Use reverse proxy (nginx/Apache)
- Enable rate limiting

### Data Protection
- Regular backups
- Encrypt sensitive data
- Secure file permissions
- Monitor for suspicious activity

---

Continue to [Database Providers](../database/README.md) for individual database provider options or [Email Providers](../email/README.md) for standalone email service configuration.