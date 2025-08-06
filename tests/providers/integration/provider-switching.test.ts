/**
 * Integration Tests for Provider Switching
 * 
 * Tests the complete provider switching workflow including validation,
 * migration, rollback, and data integrity verification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupProviderTestEnvironment, TEST_CONFIGS, createTestData, waitForAsync } from '../setup/test-environment';

// Import provider management components
import { ProviderManager } from '../../../server/providers/core/provider-manager';
import { ProviderSwitcher } from '../../../server/providers/core/provider-switcher';
import { ProviderValidator } from '../../../server/providers/core/provider-validator';
import { MigrationManager } from '../../../server/providers/core/migration-manager';

// Setup test environment
setupProviderTestEnvironment();

describe('Provider Switching Integration', () => {
  let providerManager: ProviderManager;
  let providerSwitcher: ProviderSwitcher;
  let validator: ProviderValidator;
  let migrationManager: MigrationManager;

  beforeEach(async () => {
    providerManager = new ProviderManager();
    providerSwitcher = new ProviderSwitcher(providerManager);
    validator = new ProviderValidator();
    migrationManager = new MigrationManager();

    // Initialize test providers
    await providerManager.initialize();
  });

  afterEach(async () => {
    await providerManager.cleanup();
  });

  describe('Database Provider Switching', () => {
    it('should switch from SQLite to PostgreSQL successfully', async () => {
      // Setup initial SQLite provider with test data
      await providerManager.setProvider('database', 'sqlite', TEST_CONFIGS.sqlite);
      const sqliteProvider = providerManager.getProvider('database');
      
      // Create test data in SQLite
      const testEvent = createTestData.event();
      const testGuest = createTestData.guest();
      
      await sqliteProvider.connect();
      const createdEvent = await sqliteProvider.create('events', testEvent);
      const createdGuest = await sqliteProvider.create('guests', testGuest);
      
      expect(createdEvent.id).toBe(testEvent.id);
      expect(createdGuest.id).toBe(testGuest.id);

      // Validate target PostgreSQL provider
      const validation = await validator.validateProvider('postgresql', TEST_CONFIGS.postgresql);
      expect(validation.isValid).toBe(true);

      // Generate migration plan
      const migrationPlan = await providerSwitcher.generateMigrationPlan({
        fromProvider: 'sqlite',
        toProvider: 'postgresql',
        providerType: 'database',
        options: {
          includeData: true,
          validateCompatibility: true,
          createBackup: true
        }
      });

      expect(migrationPlan.fromProvider).toBe('sqlite');
      expect(migrationPlan.toProvider).toBe('postgresql');
      expect(migrationPlan.steps.length).toBeGreaterThan(0);
      expect(migrationPlan.backupRequired).toBe(true);

      // Execute provider switch
      const switchResult = await providerSwitcher.switchProvider({
        fromProvider: 'sqlite',
        toProvider: 'postgresql',
        providerType: 'database',
        configuration: TEST_CONFIGS.postgresql,
        options: {
          createBackup: true,
          validateData: true,
          enableRollback: true
        }
      });

      expect(switchResult.success).toBe(true);
      expect(switchResult.migrationId).toBeDefined();

      // Wait for migration to complete
      let migrationStatus;
      do {
        await waitForAsync(1000);
        migrationStatus = await migrationManager.getMigrationStatus(switchResult.migrationId);
      } while (migrationStatus.status === 'running');

      expect(migrationStatus.status).toBe('completed');

      // Verify data integrity in PostgreSQL
      const postgresProvider = providerManager.getProvider('database');
      expect(postgresProvider.constructor.name).toBe('PostgreSQLProvider');

      const migratedEvent = await postgresProvider.findOne('events', testEvent.id);
      const migratedGuest = await postgresProvider.findOne('guests', testGuest.id);

      expect(migratedEvent).toEqual(expect.objectContaining({
        id: testEvent.id,
        title: testEvent.title,
        description: testEvent.description
      }));

      expect(migratedGuest).toEqual(expect.objectContaining({
        id: testGuest.id,
        email: testGuest.email,
        name: testGuest.name
      }));
    });

    it('should handle migration failures with rollback', async () => {
      // Setup initial provider
      await providerManager.setProvider('database', 'sqlite', TEST_CONFIGS.sqlite);
      const sqliteProvider = providerManager.getProvider('database');
      
      await sqliteProvider.connect();
      await sqliteProvider.create('events', createTestData.event());

      // Mock PostgreSQL connection failure during migration
      vi.spyOn(migrationManager, 'migrateData').mockRejectedValueOnce(
        new Error('Connection failed during migration')
      );

      // Attempt provider switch
      const switchResult = await providerSwitcher.switchProvider({
        fromProvider: 'sqlite',
        toProvider: 'postgresql',
        providerType: 'database',
        configuration: TEST_CONFIGS.postgresql,
        options: {
          createBackup: true,
          enableRollback: true
        }
      });

      expect(switchResult.success).toBe(false);
      expect(switchResult.error).toContain('Connection failed during migration');

      // Verify rollback occurred - should still be using SQLite
      const currentProvider = providerManager.getProvider('database');
      expect(currentProvider.constructor.name).toBe('SQLiteProvider');

      // Verify original data is intact
      const originalEvent = await currentProvider.findOne('events', createTestData.event().id);
      expect(originalEvent).toBeDefined();
    });

    it('should validate data consistency across providers', async () => {
      // Create comprehensive test dataset
      const testData = {
        events: [
          createTestData.event({ id: 'event-1', title: 'Wedding 1' }),
          createTestData.event({ id: 'event-2', title: 'Wedding 2' })
        ],
        guests: [
          createTestData.guest({ id: 'guest-1', eventId: 'event-1' }),
          createTestData.guest({ id: 'guest-2', eventId: 'event-1' }),
          createTestData.guest({ id: 'guest-3', eventId: 'event-2' })
        ],
        users: [
          createTestData.user({ id: 'user-1', role: 'organizer' }),
          createTestData.user({ id: 'user-2', role: 'admin' })
        ]
      };

      // Setup SQLite with test data
      await providerManager.setProvider('database', 'sqlite', TEST_CONFIGS.sqlite);
      const sqliteProvider = providerManager.getProvider('database');
      await sqliteProvider.connect();

      // Insert test data
      for (const event of testData.events) {
        await sqliteProvider.create('events', event);
      }
      for (const guest of testData.guests) {
        await sqliteProvider.create('guests', guest);
      }
      for (const user of testData.users) {
        await sqliteProvider.create('users', user);
      }

      // Switch to PostgreSQL
      const switchResult = await providerSwitcher.switchProvider({
        fromProvider: 'sqlite',
        toProvider: 'postgresql',
        providerType: 'database',
        configuration: TEST_CONFIGS.postgresql,
        options: {
          includeData: true,
          validateData: true
        }
      });

      expect(switchResult.success).toBe(true);

      // Verify data consistency
      const postgresProvider = providerManager.getProvider('database');
      
      // Check events
      const migratedEvents = await postgresProvider.findMany('events');
      expect(migratedEvents.length).toBe(testData.events.length);
      expect(migratedEvents.map(e => e.id).sort()).toEqual(['event-1', 'event-2']);

      // Check guests with relationships
      const migratedGuests = await postgresProvider.findMany('guests', {
        include: { event: true }
      });
      expect(migratedGuests.length).toBe(testData.guests.length);
      
      // Verify foreign key relationships
      const event1Guests = migratedGuests.filter(g => g.eventId === 'event-1');
      expect(event1Guests.length).toBe(2);

      // Check users
      const migratedUsers = await postgresProvider.findMany('users');
      expect(migratedUsers.length).toBe(testData.users.length);
    });
  });

  describe('Email Provider Switching', () => {
    it('should switch from SMTP to SendGrid', async () => {
      // Setup initial SMTP provider
      await providerManager.setProvider('email', 'smtp', TEST_CONFIGS.smtp);
      const smtpProvider = providerManager.getProvider('email');
      
      await smtpProvider.connect();
      expect(smtpProvider.isConnected()).toBe(true);

      // Test initial provider functionality
      const testEmail = {
        to: 'guest@example.com',
        subject: 'Test Email',
        text: 'This is a test email'
      };

      const smtpResult = await smtpProvider.sendEmail(testEmail);
      expect(smtpResult.success).toBe(true);

      // Validate SendGrid provider
      const validation = await validator.validateProvider('sendgrid', TEST_CONFIGS.sendgrid);
      expect(validation.isValid).toBe(true);

      // Switch to SendGrid
      const switchResult = await providerSwitcher.switchProvider({
        fromProvider: 'smtp',
        toProvider: 'sendgrid',
        providerType: 'email',
        configuration: TEST_CONFIGS.sendgrid,
        options: {
          validateConfiguration: true,
          testConnection: true
        }
      });

      expect(switchResult.success).toBe(true);

      // Verify new provider functionality
      const sendgridProvider = providerManager.getProvider('email');
      expect(sendgridProvider.constructor.name).toBe('SendGridProvider');

      const sendgridResult = await sendgridProvider.sendEmail(testEmail);
      expect(sendgridResult.success).toBe(true);
    });

    it('should preserve email templates during provider switch', async () => {
      // Setup SMTP with templates
      await providerManager.setProvider('email', 'smtp', TEST_CONFIGS.smtp);
      const smtpProvider = providerManager.getProvider('email');
      await smtpProvider.connect();

      // Create email templates (mock template storage)
      const templates = [
        { id: 'invitation', name: 'Wedding Invitation', content: 'You are invited!' },
        { id: 'reminder', name: 'RSVP Reminder', content: 'Please RSVP soon' }
      ];

      // Store templates in provider manager
      await providerManager.storeEmailTemplates(templates);

      // Switch to SendGrid
      const switchResult = await providerSwitcher.switchProvider({
        fromProvider: 'smtp',
        toProvider: 'sendgrid',
        providerType: 'email',
        configuration: TEST_CONFIGS.sendgrid,
        options: {
          preserveTemplates: true,
          migrateSentHistory: false
        }
      });

      expect(switchResult.success).toBe(true);

      // Verify templates are preserved
      const preservedTemplates = await providerManager.getEmailTemplates();
      expect(preservedTemplates.length).toBe(templates.length);
      expect(preservedTemplates.map(t => t.id)).toEqual(['invitation', 'reminder']);
    });
  });

  describe('Storage Provider Switching', () => {
    it('should switch from Local to AWS S3 with file migration', async () => {
      // Setup Local Storage with test files
      await providerManager.setProvider('storage', 'local', TEST_CONFIGS.local_storage);
      const localProvider = providerManager.getProvider('storage');
      await localProvider.connect();

      // Upload test files
      const testFiles = [
        { path: 'photos/wedding1.jpg', content: 'wedding photo 1' },
        { path: 'documents/invitation.pdf', content: 'invitation document' },
        { path: 'videos/ceremony.mp4', content: 'ceremony video' }
      ];

      for (const file of testFiles) {
        const testFile = new File([file.content], file.path.split('/').pop()!);
        await localProvider.uploadFile(file.path, testFile);
      }

      // Verify files exist in local storage
      const localFiles = await localProvider.listFiles('');
      expect(localFiles.length).toBeGreaterThanOrEqual(testFiles.length);

      // Switch to S3
      const switchResult = await providerSwitcher.switchProvider({
        fromProvider: 'local',
        toProvider: 's3',
        providerType: 'storage',
        configuration: TEST_CONFIGS.aws_s3,
        options: {
          migrateFiles: true,
          preserveStructure: true,
          validateTransfer: true
        }
      });

      expect(switchResult.success).toBe(true);

      // Verify files migrated to S3
      const s3Provider = providerManager.getProvider('storage');
      expect(s3Provider.constructor.name).toBe('S3StorageProvider');

      for (const file of testFiles) {
        const metadata = await s3Provider.getFileMetadata(file.path);
        expect(metadata.key).toBe(file.path);
        
        const downloadResult = await s3Provider.downloadFile(file.path);
        expect(downloadResult.success).toBe(true);
        expect(downloadResult.data.toString()).toBe(file.content);
      }
    });

    it('should handle large file migrations with progress tracking', async () => {
      // Setup with large files
      await providerManager.setProvider('storage', 'local', TEST_CONFIGS.local_storage);
      const localProvider = providerManager.getProvider('storage');
      await localProvider.connect();

      // Create large test files
      const largeFiles = [
        { path: 'videos/wedding-full.mp4', size: 100 * 1024 * 1024 }, // 100MB
        { path: 'photos/album.zip', size: 50 * 1024 * 1024 }          // 50MB
      ];

      for (const file of largeFiles) {
        const largeContent = 'large file content'.repeat(file.size / 18); // Approximate size
        const testFile = new File([largeContent], file.path.split('/').pop()!);
        await localProvider.uploadFile(file.path, testFile);
      }

      // Track migration progress
      const progressUpdates: any[] = [];
      
      const switchResult = await providerSwitcher.switchProvider({
        fromProvider: 'local',
        toProvider: 's3',
        providerType: 'storage',
        configuration: TEST_CONFIGS.aws_s3,
        options: {
          migrateFiles: true,
          chunkSize: 10 * 1024 * 1024, // 10MB chunks
          progressCallback: (progress) => {
            progressUpdates.push(progress);
          }
        }
      });

      expect(switchResult.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify final progress is 100%
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.percentage).toBe(100);
    });
  });

  describe('Multi-Provider Switching', () => {
    it('should switch multiple providers atomically', async () => {
      // Setup initial providers
      await providerManager.setProvider('database', 'sqlite', TEST_CONFIGS.sqlite);
      await providerManager.setProvider('email', 'smtp', TEST_CONFIGS.smtp);
      await providerManager.setProvider('storage', 'local', TEST_CONFIGS.local_storage);

      // Create test data across all providers
      const dbProvider = providerManager.getProvider('database');
      const emailProvider = providerManager.getProvider('email');
      const storageProvider = providerManager.getProvider('storage');

      await dbProvider.connect();
      await emailProvider.connect();
      await storageProvider.connect();

      // Add test data
      await dbProvider.create('events', createTestData.event());
      const testFile = new File(['test content'], 'test.txt');
      await storageProvider.uploadFile('test/file.txt', testFile);

      // Execute atomic multi-provider switch
      const switchResult = await providerSwitcher.switchMultipleProviders([
        {
          type: 'database',
          fromProvider: 'sqlite',
          toProvider: 'postgresql',
          configuration: TEST_CONFIGS.postgresql,
          options: { includeData: true }
        },
        {
          type: 'email', 
          fromProvider: 'smtp',
          toProvider: 'sendgrid',
          configuration: TEST_CONFIGS.sendgrid,
          options: { preserveTemplates: true }
        },
        {
          type: 'storage',
          fromProvider: 'local',
          toProvider: 's3',
          configuration: TEST_CONFIGS.aws_s3,
          options: { migrateFiles: true }
        }
      ], {
        atomic: true,
        rollbackOnFailure: true
      });

      expect(switchResult.success).toBe(true);
      expect(switchResult.switchedProviders).toBe(3);

      // Verify all providers switched correctly
      const newDbProvider = providerManager.getProvider('database');
      const newEmailProvider = providerManager.getProvider('email');
      const newStorageProvider = providerManager.getProvider('storage');

      expect(newDbProvider.constructor.name).toBe('PostgreSQLProvider');
      expect(newEmailProvider.constructor.name).toBe('SendGridProvider');
      expect(newStorageProvider.constructor.name).toBe('S3StorageProvider');

      // Verify data integrity across all providers
      const migratedEvent = await newDbProvider.findOne('events', createTestData.event().id);
      expect(migratedEvent).toBeDefined();

      const migratedFile = await newStorageProvider.downloadFile('test/file.txt');
      expect(migratedFile.success).toBe(true);
    });

    it('should rollback all providers on partial failure', async () => {
      // Setup initial providers
      await providerManager.setProvider('database', 'sqlite', TEST_CONFIGS.sqlite);
      await providerManager.setProvider('email', 'smtp', TEST_CONFIGS.smtp);

      // Mock failure in second provider switch
      vi.spyOn(providerSwitcher, 'switchProvider')
        .mockResolvedValueOnce({ success: true, migrationId: 'db-migration' })
        .mockRejectedValueOnce(new Error('Email provider switch failed'));

      // Attempt multi-provider switch
      const switchResult = await providerSwitcher.switchMultipleProviders([
        {
          type: 'database',
          fromProvider: 'sqlite',
          toProvider: 'postgresql',
          configuration: TEST_CONFIGS.postgresql
        },
        {
          type: 'email',
          fromProvider: 'smtp',
          toProvider: 'sendgrid',
          configuration: TEST_CONFIGS.sendgrid
        }
      ], {
        atomic: true,
        rollbackOnFailure: true
      });

      expect(switchResult.success).toBe(false);
      expect(switchResult.error).toContain('Email provider switch failed');

      // Verify rollback - should still be using original providers
      const dbProvider = providerManager.getProvider('database');
      const emailProvider = providerManager.getProvider('email');

      expect(dbProvider.constructor.name).toBe('SQLiteProvider');
      expect(emailProvider.constructor.name).toBe('SMTPProvider');
    });
  });

  describe('Provider Switch Validation', () => {
    it('should validate compatibility before switching', async () => {
      // Setup SQLite with test data
      await providerManager.setProvider('database', 'sqlite', TEST_CONFIGS.sqlite);
      const sqliteProvider = providerManager.getProvider('database');
      await sqliteProvider.connect();

      // Create data with SQLite-specific features
      await sqliteProvider.create('events', {
        ...createTestData.event(),
        metadata: JSON.stringify({ sqliteSpecific: true })
      });

      // Test compatibility validation
      const compatibility = await validator.validateCompatibility('sqlite', 'postgresql', {
        checkDataTypes: true,
        checkConstraints: true,
        checkFeatures: true
      });

      expect(compatibility.isCompatible).toBe(true);
      expect(compatibility.warnings).toBeDefined();
      expect(compatibility.requiredTransformations).toBeDefined();
    });

    it('should prevent switching with incompatible configurations', async () => {
      // Try to switch to invalid configuration
      await expect(
        providerSwitcher.switchProvider({
          fromProvider: 'sqlite',
          toProvider: 'postgresql',
          providerType: 'database',
          configuration: {
            host: 'invalid-host',
            port: -1,
            database: '',
            username: '',
            password: ''
          }
        })
      ).rejects.toThrow('Invalid provider configuration');
    });

    it('should validate data integrity before and after switch', async () => {
      // Setup with checksums enabled
      await providerManager.setProvider('database', 'sqlite', TEST_CONFIGS.sqlite);
      const sqliteProvider = providerManager.getProvider('database');
      await sqliteProvider.connect();

      const testEvent = createTestData.event();
      await sqliteProvider.create('events', testEvent);

      // Calculate data checksums before switch
      const checksumsBefore = await validator.calculateDataChecksums('sqlite', ['events']);

      // Switch providers
      const switchResult = await providerSwitcher.switchProvider({
        fromProvider: 'sqlite',
        toProvider: 'postgresql',
        providerType: 'database',
        configuration: TEST_CONFIGS.postgresql,
        options: {
          validateIntegrity: true,
          includeData: true
        }
      });

      expect(switchResult.success).toBe(true);

      // Calculate checksums after switch
      const checksumsAfter = await validator.calculateDataChecksums('postgresql', ['events']);

      // Verify checksums match
      expect(checksumsAfter.events).toBe(checksumsBefore.events);
    });
  });
});