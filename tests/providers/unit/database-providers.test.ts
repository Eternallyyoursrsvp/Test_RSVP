/**
 * Unit Tests for Database Providers
 * 
 * Tests all database provider implementations including PostgreSQL, SQLite, 
 * Supabase, and PocketBase providers with comprehensive coverage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupProviderTestEnvironment, TEST_CONFIGS, createTestData } from '../setup/test-environment';

// Import database providers
import { PostgreSQLProvider } from '../../../server/providers/database/postgresql';
import { SQLiteProvider } from '../../../server/providers/database/sqlite';
import { SupabaseProvider } from '../../../server/providers/database/supabase';
import { PocketBaseProvider } from '../../../server/providers/database/pocketbase';

// Setup test environment
setupProviderTestEnvironment();

describe('Database Providers', () => {
  describe('PostgreSQL Provider', () => {
    let provider: PostgreSQLProvider;

    beforeEach(() => {
      provider = new PostgreSQLProvider(TEST_CONFIGS.postgresql);
    });

    describe('Connection Management', () => {
      it('should establish connection successfully', async () => {
        await expect(provider.connect()).resolves.not.toThrow();
        expect(provider.isConnected()).toBe(true);
      });

      it('should handle connection failures gracefully', async () => {
        const failProvider = new PostgreSQLProvider({
          ...TEST_CONFIGS.postgresql,
          host: 'invalid-host'
        });

        await expect(failProvider.connect()).rejects.toThrow();
        expect(failProvider.isConnected()).toBe(false);
      });

      it('should disconnect properly', async () => {
        await provider.connect();
        await provider.disconnect();
        expect(provider.isConnected()).toBe(false);
      });
    });

    describe('CRUD Operations', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should create records', async () => {
        const eventData = createTestData.event();
        const result = await provider.create('events', eventData);
        
        expect(result).toBeDefined();
        expect(result.id).toBe(eventData.id);
      });

      it('should read records with filters', async () => {
        const events = await provider.findMany('events', {
          where: { title: 'Test Wedding' }
        });
        
        expect(Array.isArray(events)).toBe(true);
      });

      it('should update records', async () => {
        const eventId = 'test-event-1';
        const updates = { title: 'Updated Wedding Title' };
        
        const result = await provider.update('events', eventId, updates);
        expect(result.title).toBe(updates.title);
      });

      it('should delete records', async () => {
        const eventId = 'test-event-1';
        await provider.delete('events', eventId);
        
        const deleted = await provider.findOne('events', eventId);
        expect(deleted).toBeNull();
      });
    });

    describe('Transaction Support', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should support transactions', async () => {
        const transaction = await provider.beginTransaction();
        expect(transaction).toBeDefined();
      });

      it('should commit transactions', async () => {
        const transaction = await provider.beginTransaction();
        
        await provider.create('events', createTestData.event(), { transaction });
        await provider.commitTransaction(transaction);
        
        // Verify data was committed
        const events = await provider.findMany('events');
        expect(events.length).toBeGreaterThan(0);
      });

      it('should rollback transactions', async () => {
        const transaction = await provider.beginTransaction();
        
        await provider.create('events', createTestData.event(), { transaction });
        await provider.rollbackTransaction(transaction);
        
        // Verify data was rolled back
        const events = await provider.findMany('events');
        expect(events.length).toBe(0);
      });
    });

    describe('Query Building', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should build complex queries with joins', async () => {
        const query = {
          include: {
            guests: true
          },
          where: {
            date: { gte: new Date() }
          },
          orderBy: { date: 'asc' }
        };

        const events = await provider.findMany('events', query);
        expect(Array.isArray(events)).toBe(true);
      });

      it('should support pagination', async () => {
        const page1 = await provider.findMany('events', {
          skip: 0,
          take: 10
        });

        const page2 = await provider.findMany('events', {
          skip: 10,
          take: 10
        });

        expect(Array.isArray(page1)).toBe(true);
        expect(Array.isArray(page2)).toBe(true);
      });
    });
  });

  describe('SQLite Provider', () => {
    let provider: SQLiteProvider;

    beforeEach(() => {
      provider = new SQLiteProvider(TEST_CONFIGS.sqlite);
    });

    describe('Connection Management', () => {
      it('should connect to in-memory database', async () => {
        await expect(provider.connect()).resolves.not.toThrow();
        expect(provider.isConnected()).toBe(true);
      });

      it('should handle file-based databases', async () => {
        const fileProvider = new SQLiteProvider({
          database: './test.db',
          options: { verbose: false }
        });

        await expect(fileProvider.connect()).resolves.not.toThrow();
        await fileProvider.disconnect();
      });
    });

    describe('Schema Management', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should create tables', async () => {
        await provider.createTable('test_table', {
          id: 'TEXT PRIMARY KEY',
          name: 'TEXT NOT NULL',
          created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
        });

        const tables = await provider.getTables();
        expect(tables).toContain('test_table');
      });

      it('should drop tables', async () => {
        await provider.createTable('temp_table', { id: 'TEXT' });
        await provider.dropTable('temp_table');

        const tables = await provider.getTables();
        expect(tables).not.toContain('temp_table');
      });
    });

    describe('Data Types', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should handle JSON data correctly', async () => {
        const jsonData = { nested: { value: 123 } };
        const record = await provider.create('events', {
          id: 'test-json',
          metadata: JSON.stringify(jsonData)
        });

        expect(record.metadata).toBeDefined();
      });

      it('should handle date values', async () => {
        const now = new Date();
        const record = await provider.create('events', {
          id: 'test-date',
          date: now.toISOString()
        });

        expect(record.date).toBeDefined();
      });
    });
  });

  describe('Supabase Provider', () => {
    let provider: SupabaseProvider;

    beforeEach(() => {
      provider = new SupabaseProvider(TEST_CONFIGS.supabase);
    });

    describe('Authentication Integration', () => {
      it('should initialize with auth client', async () => {
        await provider.connect();
        expect(provider.getAuthClient()).toBeDefined();
      });

      it('should handle RLS (Row Level Security)', async () => {
        await provider.connect();
        
        // Test with authenticated context
        const events = await provider.findMany('events', {
          context: { userId: 'test-user-1' }
        });

        expect(Array.isArray(events)).toBe(true);
      });
    });

    describe('Real-time Features', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should support real-time subscriptions', async () => {
        const subscription = provider.subscribe('events', {
          event: '*',
          schema: 'public'
        }, (data) => {
          console.log('Real-time update:', data);
        });

        expect(subscription).toBeDefined();
        
        // Cleanup
        provider.unsubscribe(subscription);
      });

      it('should handle subscription cleanup', async () => {
        const subscription = provider.subscribe('events', {
          event: 'INSERT'
        }, () => {});

        provider.unsubscribe(subscription);
        // Should not throw error
      });
    });

    describe('Storage Integration', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should upload files to storage', async () => {
        const file = new Blob(['test content'], { type: 'text/plain' });
        
        const result = await provider.uploadFile('test-bucket', 'test-file.txt', file);
        expect(result.data).toBeDefined();
      });

      it('should generate public URLs', async () => {
        const url = provider.getPublicUrl('test-bucket', 'test-file.txt');
        expect(url).toContain('test-file.txt');
      });
    });
  });

  describe('PocketBase Provider', () => {
    let provider: PocketBaseProvider;

    beforeEach(() => {
      provider = new PocketBaseProvider(TEST_CONFIGS.pocketbase);
    });

    describe('Authentication', () => {
      it('should authenticate admin users', async () => {
        await provider.connect();
        
        const auth = await provider.authenticateAdmin(
          TEST_CONFIGS.pocketbase.adminEmail,
          TEST_CONFIGS.pocketbase.adminPassword
        );

        expect(auth.token).toBeDefined();
      });

      it('should handle authentication failures', async () => {
        await provider.connect();

        await expect(
          provider.authenticateAdmin('invalid@email.com', 'wrong-password')
        ).rejects.toThrow();
      });
    });

    describe('Real-time Subscriptions', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should subscribe to collection changes', async () => {
        const unsubscribe = provider.subscribe('events', (data) => {
          console.log('PocketBase update:', data);
        });

        expect(unsubscribe).toBeTypeOf('function');
        
        // Cleanup
        unsubscribe();
      });

      it('should handle subscription errors gracefully', async () => {
        const unsubscribe = provider.subscribe('invalid-collection', () => {});
        expect(unsubscribe).toBeTypeOf('function');
      });
    });

    describe('File Management', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should handle file uploads', async () => {
        const formData = new FormData();
        formData.append('file', new Blob(['test']), 'test.txt');

        const record = await provider.create('files', {
          name: 'test-file',
          file: formData.get('file')
        });

        expect(record.id).toBeDefined();
      });

      it('should generate file URLs', async () => {
        const record = { id: 'test-record', file: 'test.jpg' };
        const url = provider.getFileUrl('files', record.id, record.file);
        
        expect(url).toContain('test.jpg');
      });
    });
  });

  describe('Provider Compatibility', () => {
    it('should implement consistent interfaces', () => {
      const providers = [
        new PostgreSQLProvider(TEST_CONFIGS.postgresql),
        new SQLiteProvider(TEST_CONFIGS.sqlite),
        new SupabaseProvider(TEST_CONFIGS.supabase),
        new PocketBaseProvider(TEST_CONFIGS.pocketbase)
      ];

      providers.forEach(provider => {
        expect(provider.connect).toBeTypeOf('function');
        expect(provider.disconnect).toBeTypeOf('function');
        expect(provider.create).toBeTypeOf('function');
        expect(provider.findMany).toBeTypeOf('function');
        expect(provider.findOne).toBeTypeOf('function');
        expect(provider.update).toBeTypeOf('function');
        expect(provider.delete).toBeTypeOf('function');
      });
    });

    it('should handle similar data structures', async () => {
      const testEvent = createTestData.event();
      
      const providers = [
        new PostgreSQLProvider(TEST_CONFIGS.postgresql),
        new SQLiteProvider(TEST_CONFIGS.sqlite)
      ];

      for (const provider of providers) {
        await provider.connect();
        
        const created = await provider.create('events', testEvent);
        expect(created.id).toBe(testEvent.id);
        expect(created.title).toBe(testEvent.title);
        
        await provider.disconnect();
      }
    });
  });
});