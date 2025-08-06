/**
 * Performance Tests for Provider Benchmarks
 * 
 * Comprehensive performance testing for all provider types including
 * throughput, latency, resource usage, and scalability benchmarks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupProviderTestEnvironment, TEST_CONFIGS, createTestData, createTestFile } from '../setup/test-environment';
import { performance } from 'perf_hooks';

// Import providers for benchmarking
import { PostgreSQLProvider } from '../../../server/providers/database/postgresql';
import { SQLiteProvider } from '../../../server/providers/database/sqlite';
import { SendGridProvider } from '../../../server/providers/email/sendgrid';
import { SMTPProvider } from '../../../server/providers/email/smtp';
import { S3StorageProvider } from '../../../server/providers/storage/aws-s3';
import { LocalStorageProvider } from '../../../server/providers/storage/local';

// Setup test environment
setupProviderTestEnvironment();

// Performance testing utilities
interface BenchmarkResult {
  operation: string;
  provider: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  throughput: number;
  minTime: number;
  maxTime: number;
  memoryUsage?: {
    before: number;
    after: number;
    peak: number;
  };
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  async benchmark(
    operation: string,
    provider: string,
    fn: () => Promise<any>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    const memoryBefore = process.memoryUsage().heapUsed;
    let memoryPeak = memoryBefore;

    // Warm up
    for (let i = 0; i < Math.min(5, iterations); i++) {
      await fn();
    }

    // Benchmark runs
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await fn();
      const iterationEnd = performance.now();
      
      times.push(iterationEnd - iterationStart);
      memoryPeak = Math.max(memoryPeak, process.memoryUsage().heapUsed);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;
    const throughput = iterations / (totalTime / 1000); // operations per second
    const memoryAfter = process.memoryUsage().heapUsed;

    const result: BenchmarkResult = {
      operation,
      provider,
      iterations,
      totalTime,
      averageTime,
      throughput,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryPeak
      }
    };

    this.results.push(result);
    return result;
  }

  getResults(): BenchmarkResult[] {
    return this.results;
  }

  compareProviders(operation: string): BenchmarkResult[] {
    return this.results.filter(r => r.operation === operation);
  }

  printResults(): void {
    console.table(this.results.map(r => ({
      Operation: r.operation,
      Provider: r.provider,
      'Avg Time (ms)': r.averageTime.toFixed(2),
      'Throughput (ops/s)': r.throughput.toFixed(2),
      'Min Time (ms)': r.minTime.toFixed(2),
      'Max Time (ms)': r.maxTime.toFixed(2)
    })));
  }
}

describe('Provider Performance Benchmarks', () => {
  let benchmark: PerformanceBenchmark;

  beforeEach(() => {
    benchmark = new PerformanceBenchmark();
  });

  afterEach(() => {
    if (process.env.VITEST_VERBOSE) {
      benchmark.printResults();
    }
  });

  describe('Database Provider Performance', () => {
    let postgresProvider: PostgreSQLProvider;
    let sqliteProvider: SQLiteProvider;

    beforeEach(async () => {
      postgresProvider = new PostgreSQLProvider(TEST_CONFIGS.postgresql);
      sqliteProvider = new SQLiteProvider(TEST_CONFIGS.sqlite);
      
      await postgresProvider.connect();
      await sqliteProvider.connect();
    });

    afterEach(async () => {
      await postgresProvider.disconnect();
      await sqliteProvider.disconnect();
    });

    it('should benchmark CREATE operations', async () => {
      const testEvent = createTestData.event();

      // Benchmark PostgreSQL
      const postgresResult = await benchmark.benchmark(
        'CREATE',
        'PostgreSQL',
        async () => {
          const event = { ...testEvent, id: `event-${Date.now()}-${Math.random()}` };
          return await postgresProvider.create('events', event);
        },
        50
      );

      // Benchmark SQLite
      const sqliteResult = await benchmark.benchmark(
        'CREATE',
        'SQLite',
        async () => {
          const event = { ...testEvent, id: `event-${Date.now()}-${Math.random()}` };
          return await sqliteProvider.create('events', event);
        },
        50
      );

      // Performance expectations
      expect(postgresResult.averageTime).toBeLessThan(100); // < 100ms average
      expect(sqliteResult.averageTime).toBeLessThan(50);    // < 50ms average (in-memory)
      expect(sqliteResult.throughput).toBeGreaterThan(postgresResult.throughput); // SQLite should be faster for single operations
    });

    it('should benchmark READ operations', async () => {
      // Seed data
      const testEvents = Array.from({ length: 100 }, (_, i) => 
        createTestData.event({ id: `benchmark-event-${i}` })
      );

      for (const event of testEvents) {
        await postgresProvider.create('events', event);
        await sqliteProvider.create('events', event);
      }

      // Benchmark PostgreSQL reads
      const postgresResult = await benchmark.benchmark(
        'READ',
        'PostgreSQL',
        async () => {
          const randomId = `benchmark-event-${Math.floor(Math.random() * 100)}`;
          return await postgresProvider.findOne('events', randomId);
        },
        100
      );

      // Benchmark SQLite reads
      const sqliteResult = await benchmark.benchmark(
        'READ',
        'SQLite',
        async () => {
          const randomId = `benchmark-event-${Math.floor(Math.random() * 100)}`;
          return await sqliteProvider.findOne('events', randomId);
        },
        100
      );

      expect(postgresResult.averageTime).toBeLessThan(50);
      expect(sqliteResult.averageTime).toBeLessThan(25);
    });

    it('should benchmark complex queries with joins', async () => {
      // Seed related data
      const events = Array.from({ length: 10 }, (_, i) => 
        createTestData.event({ id: `event-${i}` })
      );
      const guests = Array.from({ length: 50 }, (_, i) => 
        createTestData.guest({ 
          id: `guest-${i}`, 
          eventId: `event-${i % 10}` 
        })
      );

      for (const event of events) {
        await postgresProvider.create('events', event);
        await sqliteProvider.create('events', event);
      }

      for (const guest of guests) {
        await postgresProvider.create('guests', guest);
        await sqliteProvider.create('guests', guest);
      }

      // Benchmark complex queries
      const complexQuery = {
        include: {
          guests: {
            where: { rsvpStatus: 'confirmed' }
          }
        },
        where: {
          date: { gte: new Date('2024-01-01') }
        },
        orderBy: { date: 'asc' }
      };

      const postgresResult = await benchmark.benchmark(
        'COMPLEX_QUERY',
        'PostgreSQL',
        async () => await postgresProvider.findMany('events', complexQuery),
        20
      );

      const sqliteResult = await benchmark.benchmark(
        'COMPLEX_QUERY',
        'SQLite',
        async () => await sqliteProvider.findMany('events', complexQuery),
        20
      );

      expect(postgresResult.averageTime).toBeLessThan(200);
      expect(sqliteResult.averageTime).toBeLessThan(100);
    });

    it('should benchmark bulk operations', async () => {
      const bulkEvents = Array.from({ length: 1000 }, (_, i) => 
        createTestData.event({ id: `bulk-event-${i}` })
      );

      // Benchmark bulk inserts
      const postgresBulkResult = await benchmark.benchmark(
        'BULK_INSERT',
        'PostgreSQL',
        async () => {
          const batch = bulkEvents.slice(0, 100);
          return await postgresProvider.createMany('events', batch);
        },
        5
      );

      const sqliteBulkResult = await benchmark.benchmark(
        'BULK_INSERT',
        'SQLite',
        async () => {
          const batch = bulkEvents.slice(0, 100);
          return await sqliteProvider.createMany('events', batch);
        },
        5
      );

      expect(postgresBulkResult.averageTime).toBeLessThan(1000);
      expect(sqliteBulkResult.averageTime).toBeLessThan(500);
    });

    it('should benchmark transaction performance', async () => {
      const postgresResult = await benchmark.benchmark(
        'TRANSACTION',
        'PostgreSQL',
        async () => {
          const transaction = await postgresProvider.beginTransaction();
          try {
            await postgresProvider.create('events', 
              createTestData.event({ id: `tx-event-${Date.now()}` }), 
              { transaction }
            );
            await postgresProvider.create('guests', 
              createTestData.guest({ id: `tx-guest-${Date.now()}` }), 
              { transaction }
            );
            await postgresProvider.commitTransaction(transaction);
          } catch (error) {
            await postgresProvider.rollbackTransaction(transaction);
            throw error;
          }
        },
        25
      );

      const sqliteResult = await benchmark.benchmark(
        'TRANSACTION',
        'SQLite',
        async () => {
          const transaction = await sqliteProvider.beginTransaction();
          try {
            await sqliteProvider.create('events', 
              createTestData.event({ id: `tx-event-${Date.now()}` }), 
              { transaction }
            );
            await sqliteProvider.create('guests', 
              createTestData.guest({ id: `tx-guest-${Date.now()}` }), 
              { transaction }
            );
            await sqliteProvider.commitTransaction(transaction);
          } catch (error) {
            await sqliteProvider.rollbackTransaction(transaction);
            throw error;
          }
        },
        25
      );

      expect(postgresResult.averageTime).toBeLessThan(150);
      expect(sqliteResult.averageTime).toBeLessThan(75);
    });
  });

  describe('Email Provider Performance', () => {
    let sendgridProvider: SendGridProvider;
    let smtpProvider: SMTPProvider;

    beforeEach(async () => {
      sendgridProvider = new SendGridProvider(TEST_CONFIGS.sendgrid);
      smtpProvider = new SMTPProvider(TEST_CONFIGS.smtp);
      
      await sendgridProvider.connect();
      await smtpProvider.connect();
    });

    afterEach(async () => {
      await sendgridProvider.disconnect();
      await smtpProvider.disconnect();
    });

    it('should benchmark single email sending', async () => {
      const testEmail = {
        to: 'guest@example.com',
        subject: 'Performance Test Email',
        text: 'This is a performance test email.',
        html: '<p>This is a performance test email.</p>'
      };

      const sendgridResult = await benchmark.benchmark(
        'SEND_EMAIL',
        'SendGrid',
        async () => await sendgridProvider.sendEmail(testEmail),
        20
      );

      const smtpResult = await benchmark.benchmark(
        'SEND_EMAIL',
        'SMTP',
        async () => await smtpProvider.sendEmail(testEmail),
        20
      );

      expect(sendgridResult.averageTime).toBeLessThan(2000); // < 2s
      expect(smtpResult.averageTime).toBeLessThan(3000);     // < 3s
    });

    it('should benchmark bulk email sending', async () => {
      const bulkEmails = Array.from({ length: 50 }, (_, i) => ({
        to: `guest${i}@example.com`,
        subject: `Bulk Email ${i}`,
        text: `This is bulk email number ${i}`
      }));

      const sendgridBulkResult = await benchmark.benchmark(
        'BULK_EMAIL',
        'SendGrid',
        async () => await sendgridProvider.sendBulkEmails(bulkEmails.slice(0, 10)),
        3
      );

      const smtpBulkResult = await benchmark.benchmark(
        'BULK_EMAIL',
        'SMTP',
        async () => await smtpProvider.sendBulkEmails(bulkEmails.slice(0, 10)),
        3
      );

      // Bulk operations should be more efficient
      expect(sendgridBulkResult.averageTime / 10).toBeLessThan(sendgridResult?.averageTime || Infinity);
      expect(smtpBulkResult.averageTime / 10).toBeLessThan(1000); // < 1s per email in bulk
    });

    it('should benchmark email with attachments', async () => {
      const emailWithAttachment = {
        to: 'guest@example.com',
        subject: 'Email with Attachment',
        text: 'Email with attachment performance test',
        attachments: [
          {
            filename: 'test-attachment.pdf',
            content: Buffer.from('Test PDF content'.repeat(1000)),
            type: 'application/pdf'
          }
        ]
      };

      const sendgridAttachmentResult = await benchmark.benchmark(
        'EMAIL_WITH_ATTACHMENT',
        'SendGrid',
        async () => await sendgridProvider.sendEmail(emailWithAttachment),
        10
      );

      const smtpAttachmentResult = await benchmark.benchmark(
        'EMAIL_WITH_ATTACHMENT',
        'SMTP',
        async () => await smtpProvider.sendEmail(emailWithAttachment),
        10
      );

      expect(sendgridAttachmentResult.averageTime).toBeLessThan(5000);
      expect(smtpAttachmentResult.averageTime).toBeLessThan(6000);
    });
  });

  describe('Storage Provider Performance', () => {
    let s3Provider: S3StorageProvider;
    let localProvider: LocalStorageProvider;

    beforeEach(async () => {
      s3Provider = new S3StorageProvider(TEST_CONFIGS.aws_s3);
      localProvider = new LocalStorageProvider(TEST_CONFIGS.local_storage);
      
      await s3Provider.connect();
      await localProvider.connect();
    });

    afterEach(async () => {
      await s3Provider.disconnect();
      await localProvider.disconnect();
    });

    it('should benchmark small file uploads', async () => {
      const smallFile = createTestFile({
        name: 'small-file.txt',
        size: 1024, // 1KB
        content: 'Small file content for performance testing'
      });

      const s3Result = await benchmark.benchmark(
        'SMALL_FILE_UPLOAD',
        'AWS_S3',
        async () => {
          const key = `performance/small-${Date.now()}-${Math.random()}.txt`;
          return await s3Provider.uploadFile(key, smallFile);
        },
        20
      );

      const localResult = await benchmark.benchmark(
        'SMALL_FILE_UPLOAD',
        'Local',
        async () => {
          const path = `performance/small-${Date.now()}-${Math.random()}.txt`;
          return await localProvider.uploadFile(path, smallFile);
        },
        20
      );

      expect(s3Result.averageTime).toBeLessThan(2000);
      expect(localResult.averageTime).toBeLessThan(100);
      expect(localResult.throughput).toBeGreaterThan(s3Result.throughput);
    });

    it('should benchmark large file uploads', async () => {
      const largeFile = createTestFile({
        name: 'large-file.zip',
        size: 10 * 1024 * 1024, // 10MB
        content: 'Large file content for performance testing'.repeat(100000)
      });

      const s3LargeResult = await benchmark.benchmark(
        'LARGE_FILE_UPLOAD',
        'AWS_S3',
        async () => {
          const key = `performance/large-${Date.now()}.zip`;
          return await s3Provider.uploadFile(key, largeFile, { multipart: true });
        },
        3
      );

      const localLargeResult = await benchmark.benchmark(
        'LARGE_FILE_UPLOAD',
        'Local',
        async () => {
          const path = `performance/large-${Date.now()}.zip`;
          return await localProvider.uploadFile(path, largeFile);
        },
        3
      );

      expect(s3LargeResult.averageTime).toBeLessThan(30000); // < 30s
      expect(localLargeResult.averageTime).toBeLessThan(5000); // < 5s
    });

    it('should benchmark file downloads', async () => {
      // Upload test files first
      const testFile = createTestFile({
        name: 'download-test.txt',
        content: 'Download performance test content'
      });

      await s3Provider.uploadFile('performance/download-test.txt', testFile);
      await localProvider.uploadFile('performance/download-test.txt', testFile);

      const s3DownloadResult = await benchmark.benchmark(
        'FILE_DOWNLOAD',
        'AWS_S3',
        async () => await s3Provider.downloadFile('performance/download-test.txt'),
        20
      );

      const localDownloadResult = await benchmark.benchmark(
        'FILE_DOWNLOAD',
        'Local',
        async () => await localProvider.downloadFile('performance/download-test.txt'),
        20
      );

      expect(s3DownloadResult.averageTime).toBeLessThan(1000);
      expect(localDownloadResult.averageTime).toBeLessThan(50);
    });

    it('should benchmark file listing operations', async () => {
      // Upload multiple test files
      const testFiles = Array.from({ length: 100 }, (_, i) => 
        createTestFile({ name: `list-test-${i}.txt` })
      );

      for (let i = 0; i < 10; i++) {
        await s3Provider.uploadFile(`performance/list/file-${i}.txt`, testFiles[i]);
        await localProvider.uploadFile(`performance/list/file-${i}.txt`, testFiles[i]);
      }

      const s3ListResult = await benchmark.benchmark(
        'LIST_FILES',
        'AWS_S3',
        async () => await s3Provider.listFiles('performance/list/'),
        25
      );

      const localListResult = await benchmark.benchmark(
        'LIST_FILES',
        'Local',
        async () => await localProvider.listFiles('performance/list/'),
        25
      );

      expect(s3ListResult.averageTime).toBeLessThan(500);
      expect(localListResult.averageTime).toBeLessThan(100);
    });

    it('should benchmark concurrent file operations', async () => {
      const concurrentFiles = Array.from({ length: 10 }, (_, i) => 
        createTestFile({ 
          name: `concurrent-${i}.txt`,
          content: `Concurrent file ${i} content`
        })
      );

      const s3ConcurrentResult = await benchmark.benchmark(
        'CONCURRENT_UPLOAD',
        'AWS_S3',
        async () => {
          const promises = concurrentFiles.map((file, i) => 
            s3Provider.uploadFile(`performance/concurrent/s3-file-${i}-${Date.now()}.txt`, file)
          );
          return await Promise.all(promises);
        },
        3
      );

      const localConcurrentResult = await benchmark.benchmark(
        'CONCURRENT_UPLOAD',
        'Local',
        async () => {
          const promises = concurrentFiles.map((file, i) => 
            localProvider.uploadFile(`performance/concurrent/local-file-${i}-${Date.now()}.txt`, file)
          );
          return await Promise.all(promises);
        },
        3
      );

      expect(s3ConcurrentResult.averageTime).toBeLessThan(10000);
      expect(localConcurrentResult.averageTime).toBeLessThan(2000);
    });
  });

  describe('Cross-Provider Performance Comparison', () => {
    it('should compare database provider performance', () => {
      const databaseResults = benchmark.compareProviders('CREATE');
      
      if (databaseResults.length >= 2) {
        const postgres = databaseResults.find(r => r.provider === 'PostgreSQL');
        const sqlite = databaseResults.find(r => r.provider === 'SQLite');

        if (postgres && sqlite) {
          // SQLite should generally be faster for simple operations
          expect(sqlite.averageTime).toBeLessThanOrEqual(postgres.averageTime * 2);
          
          // Both should meet performance thresholds
          expect(postgres.averageTime).toBeLessThan(100);
          expect(sqlite.averageTime).toBeLessThan(50);
        }
      }
    });

    it('should analyze memory usage patterns', () => {
      const allResults = benchmark.getResults();
      
      for (const result of allResults) {
        if (result.memoryUsage) {
          const memoryGrowth = result.memoryUsage.after - result.memoryUsage.before;
          const memoryPeak = result.memoryUsage.peak - result.memoryUsage.before;

          // Memory usage should be reasonable
          expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // < 100MB growth
          expect(memoryPeak).toBeLessThan(200 * 1024 * 1024);   // < 200MB peak
        }
      }
    });

    it('should validate performance SLAs', () => {
      const performanceSLA = {
        'CREATE': { maxTime: 100, minThroughput: 10 },
        'READ': { maxTime: 50, minThroughput: 20 },
        'SEND_EMAIL': { maxTime: 3000, minThroughput: 1 },
        'SMALL_FILE_UPLOAD': { maxTime: 2000, minThroughput: 1 },
        'FILE_DOWNLOAD': { maxTime: 1000, minThroughput: 5 }
      };

      const allResults = benchmark.getResults();
      
      for (const result of allResults) {
        const sla = performanceSLA[result.operation as keyof typeof performanceSLA];
        
        if (sla) {
          expect(result.averageTime).toBeLessThanOrEqual(sla.maxTime);
          expect(result.throughput).toBeGreaterThanOrEqual(sla.minThroughput);
        }
      }
    });
  });
});