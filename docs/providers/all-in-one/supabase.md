# Supabase Complete Setup Guide

## Overview

Supabase is a comprehensive backend-as-a-service platform that provides PostgreSQL database, authentication, real-time subscriptions, edge functions, and file storage. This guide covers setting up Supabase as a complete solution for the RSVP Platform.

## 🚀 Quick Start

### Prerequisites
- Supabase account (free tier available)
- Admin access to RSVP Platform
- Basic understanding of PostgreSQL and REST APIs

### 1. Create Supabase Project

1. **Sign up** at [supabase.com](https://supabase.com)
2. **Create new project**:
   - Project name: `wedding-rsvp-platform`
   - Database password: Generate strong password
   - Region: Choose closest to your users
3. **Wait for setup** (usually 2-3 minutes)

### 2. Configure RSVP Platform

#### Environment Variables
```bash
# Add to your .env file
PROVIDER_TYPE=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Configuration File
```json
{
  "type": "supabase_complete",
  "projectUrl": "https://your-project-ref.supabase.co",
  "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serviceRoleKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
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
      "github": false
    }
  },
  "storage": {
    "buckets": {
      "wedding-photos": {
        "name": "wedding-photos",
        "public": true,
        "fileSizeLimit": 52428800,
        "allowedMimeTypes": ["image/*"]
      },
      "documents": {
        "name": "documents",
        "public": false,
        "fileSizeLimit": 10485760,
        "allowedMimeTypes": ["application/pdf"]
      }
    }
  },
  "realtime": {
    "enabled": true,
    "channels": ["rsvp_updates", "event_changes"]
  }
}
```

## 🗄️ Database Setup

### Schema Migration

The RSVP Platform automatically creates the necessary tables and relationships:

```sql
-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  max_guests INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guests table
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  rsvp_status VARCHAR(20) DEFAULT 'pending',
  plus_ones INTEGER DEFAULT 0,
  dietary_restrictions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Event owners can manage their events
CREATE POLICY "Event owners can manage events" ON events
  FOR ALL USING (auth.uid() = owner_id);

-- Guests can view and update their own RSVP
CREATE POLICY "Guests can manage their RSVP" ON guests
  FOR ALL USING (auth.uid() = user_id OR email = auth.email());
```

### Run Migration

```bash
# Apply database schema
npm run db:migrate

# Seed initial data
npm run db:seed
```

## 🔐 Authentication Setup

### Email Authentication

Email authentication is enabled by default:

1. **Configure Email Templates** (optional):
   - Go to Authentication → Email Templates
   - Customize confirmation and recovery emails
   - Add your branding and styling

2. **Email Settings**:
   - **Confirm email**: Enabled for security
   - **Double confirm email changes**: Recommended
   - **Enable email confirmations**: Yes

### OAuth Providers

#### Google OAuth Setup

1. **Google Cloud Console**:
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`

2. **Supabase Configuration**:
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO auth.config (key, value) VALUES 
   ('google_client_id', 'your-google-client-id'),
   ('google_client_secret', 'your-google-client-secret');
   ```

3. **Enable in Dashboard**:
   - Go to Authentication → Providers
   - Enable Google provider
   - Add Client ID and Client Secret

#### GitHub OAuth Setup

1. **GitHub Settings**:
   - Go to Settings → Developer settings → OAuth Apps
   - Create new OAuth App
   - Authorization callback URL: `https://your-project-ref.supabase.co/auth/v1/callback`

2. **Enable in Supabase**:
   - Authentication → Providers → GitHub
   - Add Client ID and Client Secret
   - Enable provider

### JWT Configuration

Supabase handles JWT automatically, but you can customize:

```json
{
  "jwt": {
    "secret": "your-jwt-secret",
    "exp": 3600,
    "aud": "authenticated",
    "role": "authenticated"
  }
}
```

## 📁 Storage Configuration

### Create Storage Buckets

```sql
-- Create public bucket for wedding photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wedding-photos',
  'wedding-photos',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create private bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
  ARRAY['application/pdf', 'text/plain']
);
```

### Storage Policies

```sql
-- Allow authenticated users to upload wedding photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wedding-photos' AND
    auth.role() = 'authenticated'
  );

-- Allow public read access to wedding photos
CREATE POLICY "Public can view wedding photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'wedding-photos');

-- Allow event owners to manage documents
CREATE POLICY "Event owners can manage documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### File Upload Example

```javascript
// Upload wedding photo
const uploadPhoto = async (file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `wedding-photos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('wedding-photos')
    .upload(filePath, file);

  if (error) throw error;
  return data;
};

// Get public URL
const getPhotoUrl = (path) => {
  const { data } = supabase.storage
    .from('wedding-photos')
    .getPublicUrl(path);
  
  return data.publicUrl;
};
```

## 🔄 Real-time Features

### Enable Real-time

```sql
-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE guests;
```

### Real-time Subscriptions

```javascript
// Subscribe to RSVP updates
const subscribeToRSVPUpdates = (eventId, callback) => {
  return supabase
    .channel('rsvp_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'guests',
        filter: `event_id=eq.${eventId}`
      },
      callback
    )
    .subscribe();
};

// Usage
const subscription = subscribeToRSVPUpdates(eventId, (payload) => {
  console.log('RSVP update:', payload);
  // Update UI accordingly
});

// Cleanup
subscription.unsubscribe();
```

## ⚡ Edge Functions (Optional)

### Create Edge Function

```bash
# Initialize Supabase CLI
npm install -g supabase-cli
supabase login

# Create edge function
supabase functions new send-rsvp-email

# Deploy function
supabase functions deploy send-rsvp-email
```

### Example Edge Function

```typescript
// supabase/functions/send-rsvp-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { guestId, eventId } = await req.json();
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get guest and event data
    const { data: guest } = await supabase
      .from('guests')
      .select('*, events(*)')
      .eq('id', guestId)
      .single();

    // Send email logic here
    // ...

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

## 🔧 Advanced Configuration

### Connection Pooling

For high-traffic applications:

1. **Enable Connection Pooling**:
   - Go to Settings → Database
   - Enable connection pooling
   - Configure pool size and settings

2. **Use Pool Connection String**:
   ```bash
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true
   ```

### Custom Domains

1. **Add Custom Domain**:
   - Go to Settings → Custom Domains
   - Add your domain (e.g., `api.yourwedding.com`)
   - Configure DNS records

2. **Update Configuration**:
   ```json
   {
     "projectUrl": "https://api.yourwedding.com",
     "customDomain": true
   }
   ```

### Backup Configuration

```sql
-- Enable point-in-time recovery
SELECT pg_create_restore_point('before_wedding_event');

-- Create manual backup
SELECT pg_dump('postgres') AS backup_data;
```

## 📊 Monitoring and Analytics

### Built-in Analytics

1. **Database Usage**:
   - Monitor query performance
   - Track connection counts
   - Review slow queries

2. **Authentication Metrics**:
   - User sign-ups and logins
   - Provider usage statistics
   - Failed authentication attempts

3. **Storage Analytics**:
   - File upload/download statistics
   - Storage usage by bucket
   - Bandwidth consumption

4. **API Usage**:
   - Request volume and patterns
   - Response times
   - Error rates

### Custom Monitoring

```sql
-- Create monitoring views
CREATE VIEW rsvp_analytics AS
SELECT 
  e.title as event_name,
  COUNT(g.id) as total_invites,
  COUNT(CASE WHEN g.rsvp_status = 'accepted' THEN 1 END) as accepted,
  COUNT(CASE WHEN g.rsvp_status = 'declined' THEN 1 END) as declined,
  COUNT(CASE WHEN g.rsvp_status = 'pending' THEN 1 END) as pending
FROM events e
LEFT JOIN guests g ON e.id = g.event_id
GROUP BY e.id, e.title;
```

## 🚨 Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Test connection
curl -H "apikey: your-anon-key" \
     -H "Authorization: Bearer your-anon-key" \
     https://your-project-ref.supabase.co/rest/v1/

# Check project status
supabase status --project-ref your-project-ref
```

#### RLS Policy Issues
```sql
-- Debug RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'your_table';

-- Test policy
SELECT * FROM your_table; -- Should respect RLS
```

#### Storage Issues
```sql
-- Check bucket configuration
SELECT * FROM storage.buckets WHERE id = 'your-bucket';

-- Check storage policies
SELECT * FROM storage.policies WHERE bucket_id = 'your-bucket';
```

### Support Resources

- **Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Community**: [GitHub Discussions](https://github.com/supabase/supabase/discussions)
- **Support**: [Supabase Support](https://supabase.com/support)

## 📈 Scaling Considerations

### Performance Optimization

1. **Database Indexes**:
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_guests_event_id ON guests(event_id);
   CREATE INDEX idx_guests_email ON guests(email);
   CREATE INDEX idx_events_date ON events(date);
   ```

2. **Query Optimization**:
   - Use appropriate filtering
   - Limit result sets
   - Use database functions for complex operations

3. **Caching Strategy**:
   - Enable Supabase Edge caching
   - Implement client-side caching
   - Use CDN for static assets

### Scaling Limits

- **Free Tier**: 500MB database, 1GB bandwidth, 50MB storage
- **Pro Tier**: 8GB database, 250GB bandwidth, 100GB storage
- **Enterprise**: Custom limits and dedicated resources

---

Continue to [PocketBase Complete Setup](./pocketbase.md) for an alternative all-in-one solution or [Database Providers](../database/README.md) for individual database provider options.