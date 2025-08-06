/**
 * Unit Tests for Storage Providers
 * 
 * Tests all storage provider implementations including AWS S3 and Local Storage
 * providers with comprehensive file management coverage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupProviderTestEnvironment, TEST_CONFIGS, createTestFile, mockNetworkError } from '../setup/test-environment';

// Import storage providers
import { S3StorageProvider } from '../../../server/providers/storage/aws-s3';
import { LocalStorageProvider } from '../../../server/providers/storage/local';

// Setup test environment
setupProviderTestEnvironment();

describe('Storage Providers', () => {
  describe('AWS S3 Storage Provider', () => {
    let provider: S3StorageProvider;

    beforeEach(() => {
      provider = new S3StorageProvider(TEST_CONFIGS.aws_s3);
    });

    describe('Connection and Configuration', () => {
      it('should initialize with correct configuration', () => {
        expect(provider.getBucket()).toBe(TEST_CONFIGS.aws_s3.bucket);
        expect(provider.getRegion()).toBe(TEST_CONFIGS.aws_s3.region);
      });

      it('should connect to S3 service', async () => {
        await provider.connect();
        expect(provider.isConnected()).toBe(true);
      });

      it('should validate bucket existence', async () => {
        await provider.connect();
        const exists = await provider.bucketExists();
        expect(exists).toBe(true);
      });

      it('should handle invalid bucket names', async () => {
        const invalidProvider = new S3StorageProvider({
          ...TEST_CONFIGS.aws_s3,
          bucket: 'Invalid_Bucket_Name'
        });

        await expect(invalidProvider.connect()).rejects.toThrow('Invalid bucket name');
      });
    });

    describe('File Upload Operations', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should upload file successfully', async () => {
        const file = createTestFile({
          name: 'wedding-photo.jpg',
          type: 'image/jpeg',
          content: 'fake image content'
        });

        const result = await provider.uploadFile('photos/wedding-photo.jpg', file);
        
        expect(result.success).toBe(true);
        expect(result.key).toBe('photos/wedding-photo.jpg');
        expect(result.url).toContain('wedding-photo.jpg');
        expect(result.etag).toBeDefined();
      });

      it('should upload file with metadata', async () => {
        const file = createTestFile();
        const metadata = {
          eventId: 'wedding-123',
          uploadedBy: 'user-456',
          category: 'invitation'
        };

        const result = await provider.uploadFile('documents/invitation.pdf', file, {
          metadata,
          contentType: 'application/pdf',
          cacheControl: 'max-age=3600'
        });

        expect(result.success).toBe(true);
        expect(result.metadata).toEqual(metadata);
      });

      it('should handle large file uploads', async () => {
        const largeFile = createTestFile({
          name: 'large-video.mp4',
          type: 'video/mp4',
          size: 100 * 1024 * 1024, // 100MB
          content: 'large video content'.repeat(1000000)
        });

        const result = await provider.uploadFile('videos/large-video.mp4', largeFile, {
          multipart: true,
          partSize: 10 * 1024 * 1024 // 10MB parts
        });

        expect(result.success).toBe(true);
      });

      it('should validate file types', async () => {
        const invalidFile = createTestFile({
          name: 'malware.exe',
          type: 'application/x-executable'
        });

        await expect(
          provider.uploadFile('uploads/malware.exe', invalidFile)
        ).rejects.toThrow('File type not allowed');
      });

      it('should enforce file size limits', async () => {
        const tooLargeFile = createTestFile({
          name: 'huge-file.zip',
          size: 1024 * 1024 * 1024, // 1GB
          content: 'huge content'
        });

        await expect(
          provider.uploadFile('uploads/huge-file.zip', tooLargeFile, {
            maxSize: 100 * 1024 * 1024 // 100MB limit
          })
        ).rejects.toThrow('File size exceeds limit');
      });
    });

    describe('File Download Operations', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should download file successfully', async () => {
        const key = 'photos/wedding-photo.jpg';
        
        const result = await provider.downloadFile(key);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeInstanceOf(Buffer);
        expect(result.contentType).toBe('image/jpeg');
      });

      it('should generate presigned download URLs', async () => {
        const key = 'documents/invitation.pdf';
        const expiresIn = 3600; // 1 hour
        
        const url = await provider.getSignedUrl(key, 'getObject', expiresIn);
        
        expect(url).toContain(key);
        expect(url).toContain('X-Amz-Expires=3600');
      });

      it('should handle non-existent files', async () => {
        const key = 'non-existent/file.jpg';
        
        await expect(provider.downloadFile(key)).rejects.toThrow('File not found');
      });

      it('should stream large files', async () => {
        const key = 'videos/large-video.mp4';
        
        const stream = await provider.createReadStream(key);
        
        expect(stream).toBeDefined();
        expect(typeof stream.pipe).toBe('function');
      });
    });

    describe('File Management Operations', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should list files with prefix', async () => {
        const files = await provider.listFiles('photos/', {
          maxKeys: 100
        });

        expect(Array.isArray(files)).toBe(true);
        expect(files.every(f => f.key.startsWith('photos/'))).toBe(true);
      });

      it('should get file metadata', async () => {
        const key = 'photos/wedding-photo.jpg';
        
        const metadata = await provider.getFileMetadata(key);
        
        expect(metadata.key).toBe(key);
        expect(metadata.size).toBeTypeOf('number');
        expect(metadata.lastModified).toBeInstanceOf(Date);
        expect(metadata.etag).toBeDefined();
      });

      it('should copy files', async () => {
        const sourceKey = 'photos/original.jpg';
        const destKey = 'photos/backup/original.jpg';
        
        const result = await provider.copyFile(sourceKey, destKey);
        
        expect(result.success).toBe(true);
        expect(result.sourceKey).toBe(sourceKey);
        expect(result.destKey).toBe(destKey);
      });

      it('should delete files', async () => {
        const key = 'temp/delete-me.txt';
        
        const result = await provider.deleteFile(key);
        
        expect(result.success).toBe(true);
        expect(result.key).toBe(key);
      });

      it('should delete multiple files', async () => {
        const keys = [
          'temp/file1.txt',
          'temp/file2.txt',
          'temp/file3.txt'
        ];
        
        const results = await provider.deleteFiles(keys);
        
        expect(results.length).toBe(keys.length);
        expect(results.every(r => r.success)).toBe(true);
      });
    });

    describe('Access Control', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should set file permissions', async () => {
        const key = 'photos/public-photo.jpg';
        
        await provider.setFilePermissions(key, 'public-read');
        
        const url = await provider.getPublicUrl(key);
        expect(url).toContain(key);
        expect(url).not.toContain('X-Amz-Credential'); // No signature for public files
      });

      it('should generate presigned upload URLs', async () => {
        const key = 'uploads/new-file.jpg';
        const conditions = {
          contentType: 'image/jpeg',
          maxSize: 10 * 1024 * 1024 // 10MB
        };
        
        const presignedPost = await provider.getPresignedPost(key, conditions);
        
        expect(presignedPost.url).toBeDefined();
        expect(presignedPost.fields).toBeDefined();
        expect(presignedPost.fields.key).toBe(key);
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        vi.mocked(provider['s3'].upload).mockImplementationOnce(() => ({
          promise: vi.fn().mockRejectedValue(mockNetworkError())
        }));

        const file = createTestFile();
        
        await expect(
          provider.uploadFile('test/file.txt', file)
        ).rejects.toThrow('Network Error');
      });

      it('should handle access denied errors', async () => {
        vi.mocked(provider['s3'].getObject).mockImplementationOnce(() => ({
          promise: vi.fn().mockRejectedValue({
            code: 'AccessDenied',
            message: 'Access Denied'
          })
        }));

        await expect(
          provider.downloadFile('restricted/file.txt')
        ).rejects.toThrow('Access denied');
      });

      it('should handle quota exceeded errors', async () => {
        vi.mocked(provider['s3'].upload).mockImplementationOnce(() => ({
          promise: vi.fn().mockRejectedValue({
            code: 'QuotaExceeded',
            message: 'Storage quota exceeded'
          })
        }));

        const file = createTestFile();
        
        await expect(
          provider.uploadFile('test/file.txt', file)
        ).rejects.toThrow('Storage quota exceeded');
      });
    });
  });

  describe('Local Storage Provider', () => {
    let provider: LocalStorageProvider;

    beforeEach(() => {
      provider = new LocalStorageProvider(TEST_CONFIGS.local_storage);
    });

    describe('Initialization', () => {
      it('should create storage directory', async () => {
        await provider.connect();
        expect(provider.isConnected()).toBe(true);
      });

      it('should validate storage permissions', async () => {
        await provider.connect();
        const hasPermissions = await provider.checkPermissions();
        expect(hasPermissions).toBe(true);
      });

      it('should handle permission errors', async () => {
        const restrictedProvider = new LocalStorageProvider({
          basePath: '/root/restricted',
          publicPath: '/restricted'
        });

        await expect(restrictedProvider.connect()).rejects.toThrow();
      });
    });

    describe('File Upload Operations', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should upload file to local storage', async () => {
        const file = createTestFile({
          name: 'wedding-invitation.pdf',
          type: 'application/pdf'
        });

        const result = await provider.uploadFile('documents/wedding-invitation.pdf', file);
        
        expect(result.success).toBe(true);
        expect(result.path).toContain('wedding-invitation.pdf');
        expect(result.url).toContain('/test-uploads/documents/wedding-invitation.pdf');
      });

      it('should create nested directories', async () => {
        const file = createTestFile();
        
        const result = await provider.uploadFile('events/2024/wedding-1/photos/photo.jpg', file);
        
        expect(result.success).toBe(true);
        expect(result.path).toContain('events/2024/wedding-1/photos/photo.jpg');
      });

      it('should preserve file metadata', async () => {
        const file = createTestFile({
          name: 'document.pdf',
          type: 'application/pdf'
        });

        const result = await provider.uploadFile('documents/document.pdf', file, {
          metadata: {
            eventId: 'wedding-123',
            category: 'invitation'
          }
        });

        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
      });

      it('should handle duplicate filenames', async () => {
        const file1 = createTestFile({ name: 'photo.jpg' });
        const file2 = createTestFile({ name: 'photo.jpg' });

        await provider.uploadFile('photos/photo.jpg', file1);
        
        const result2 = await provider.uploadFile('photos/photo.jpg', file2, {
          overwrite: false
        });

        expect(result2.path).toContain('photo-1.jpg'); // Auto-renamed
      });
    });

    describe('File Download Operations', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should download file', async () => {
        const file = createTestFile();
        await provider.uploadFile('test/download-test.txt', file);
        
        const result = await provider.downloadFile('test/download-test.txt');
        
        expect(result.success).toBe(true);
        expect(result.data).toBeInstanceOf(Buffer);
      });

      it('should create read streams', async () => {
        const file = createTestFile({ content: 'stream test content' });
        await provider.uploadFile('test/stream-test.txt', file);
        
        const stream = await provider.createReadStream('test/stream-test.txt');
        
        expect(stream).toBeDefined();
        expect(typeof stream.pipe).toBe('function');
      });

      it('should handle non-existent files', async () => {
        await expect(
          provider.downloadFile('non-existent/file.txt')
        ).rejects.toThrow('File not found');
      });
    });

    describe('File Management', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should list files in directory', async () => {
        // Upload test files
        await provider.uploadFile('photos/photo1.jpg', createTestFile());
        await provider.uploadFile('photos/photo2.jpg', createTestFile());
        await provider.uploadFile('photos/subfolder/photo3.jpg', createTestFile());

        const files = await provider.listFiles('photos/');
        
        expect(files.length).toBeGreaterThanOrEqual(2);
        expect(files.some(f => f.name === 'photo1.jpg')).toBe(true);
      });

      it('should get file stats', async () => {
        const file = createTestFile({ size: 1024 });
        await provider.uploadFile('test/stats-test.txt', file);
        
        const stats = await provider.getFileStats('test/stats-test.txt');
        
        expect(stats.size).toBe(1024);
        expect(stats.isFile).toBe(true);
        expect(stats.mtime).toBeInstanceOf(Date);
      });

      it('should move files', async () => {
        const file = createTestFile();
        await provider.uploadFile('temp/move-source.txt', file);
        
        const result = await provider.moveFile('temp/move-source.txt', 'permanent/move-dest.txt');
        
        expect(result.success).toBe(true);
        
        // Verify source is gone and dest exists
        await expect(provider.getFileStats('temp/move-source.txt')).rejects.toThrow();
        const destStats = await provider.getFileStats('permanent/move-dest.txt');
        expect(destStats.isFile).toBe(true);
      });

      it('should copy files', async () => {
        const file = createTestFile();
        await provider.uploadFile('original/copy-source.txt', file);
        
        const result = await provider.copyFile('original/copy-source.txt', 'backup/copy-dest.txt');
        
        expect(result.success).toBe(true);
        
        // Verify both files exist
        const sourceStats = await provider.getFileStats('original/copy-source.txt');
        const destStats = await provider.getFileStats('backup/copy-dest.txt');
        expect(sourceStats.isFile).toBe(true);
        expect(destStats.isFile).toBe(true);
      });

      it('should delete files', async () => {
        const file = createTestFile();
        await provider.uploadFile('temp/delete-test.txt', file);
        
        const result = await provider.deleteFile('temp/delete-test.txt');
        
        expect(result.success).toBe(true);
        
        // Verify file is gone
        await expect(provider.getFileStats('temp/delete-test.txt')).rejects.toThrow();
      });

      it('should delete directories recursively', async () => {
        await provider.uploadFile('delete-dir/file1.txt', createTestFile());
        await provider.uploadFile('delete-dir/subfolder/file2.txt', createTestFile());
        
        const result = await provider.deleteDirectory('delete-dir/', { recursive: true });
        
        expect(result.success).toBe(true);
      });
    });

    describe('Security Features', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should sanitize file paths', async () => {
        const maliciousPath = '../../../etc/passwd';
        const file = createTestFile();
        
        const result = await provider.uploadFile(maliciousPath, file);
        
        // Should sanitize path and not escape storage directory
        expect(result.path).not.toContain('../');
        expect(result.path).toContain(TEST_CONFIGS.local_storage.basePath);
      });

      it('should validate file extensions', async () => {
        const executableFile = createTestFile({
          name: 'malware.exe',
          type: 'application/x-executable'
        });

        await expect(
          provider.uploadFile('uploads/malware.exe', executableFile, {
            allowedExtensions: ['.jpg', '.png', '.pdf']
          })
        ).rejects.toThrow('File extension not allowed');
      });

      it('should enforce storage quotas', async () => {
        const largeFile = createTestFile({
          size: 1024 * 1024 * 100, // 100MB
          content: 'large content'
        });

        await expect(
          provider.uploadFile('uploads/large-file.bin', largeFile, {
            quota: 50 * 1024 * 1024 // 50MB quota
          })
        ).rejects.toThrow('Storage quota exceeded');
      });
    });
  });

  describe('Storage Provider Compatibility', () => {
    it('should implement consistent interfaces', () => {
      const providers = [
        new S3StorageProvider(TEST_CONFIGS.aws_s3),
        new LocalStorageProvider(TEST_CONFIGS.local_storage)
      ];

      providers.forEach(provider => {
        expect(provider.connect).toBeTypeOf('function');
        expect(provider.disconnect).toBeTypeOf('function');
        expect(provider.uploadFile).toBeTypeOf('function');
        expect(provider.downloadFile).toBeTypeOf('function');
        expect(provider.deleteFile).toBeTypeOf('function');
        expect(provider.listFiles).toBeTypeOf('function');
      });
    });

    it('should handle similar file operations', async () => {
      const testFile = createTestFile({
        name: 'compatibility-test.txt',
        content: 'Test file content for compatibility'
      });

      const providers = [
        new S3StorageProvider(TEST_CONFIGS.aws_s3),
        new LocalStorageProvider(TEST_CONFIGS.local_storage)
      ];

      for (const provider of providers) {
        await provider.connect();
        
        // Upload
        const uploadResult = await provider.uploadFile('test/compatibility-test.txt', testFile);
        expect(uploadResult.success).toBe(true);
        
        // Download
        const downloadResult = await provider.downloadFile('test/compatibility-test.txt');
        expect(downloadResult.success).toBe(true);
        expect(downloadResult.data).toBeInstanceOf(Buffer);
        
        // Delete
        const deleteResult = await provider.deleteFile('test/compatibility-test.txt');
        expect(deleteResult.success).toBe(true);
        
        await provider.disconnect();
      }
    });
  });
});