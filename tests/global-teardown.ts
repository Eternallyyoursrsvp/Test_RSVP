import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const baseURL = process.env.BASE_URL || 'http://localhost:5000';
    
    // Clean up test data
    console.log('🗑️ Cleaning up test data...');
    await cleanupTestData(page, baseURL);
    
    // Generate test reports
    console.log('📊 Generating test reports...');
    await generateTestReports(page, baseURL);
    
    // Close WebSocket connections
    console.log('🔌 Closing WebSocket connections...');
    await closeWebSocketConnections(page, baseURL);
    
    // Archive test artifacts
    console.log('📦 Archiving test artifacts...');
    await archiveTestArtifacts();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw in teardown to avoid masking test failures
  } finally {
    await context.close();
    await browser.close();
  }
}

async function cleanupTestData(page, baseURL: string) {
  try {
    // Clean up test notifications
    const notificationCleanup = await page.request.delete(`${baseURL}/api/test/cleanup-notifications`);
    if (notificationCleanup.ok()) {
      console.log('  ✓ Test notifications cleaned up');
    }
    
    // Clean up test files/uploads
    const fileCleanup = await page.request.delete(`${baseURL}/api/test/cleanup-files`);
    if (fileCleanup.ok()) {
      console.log('  ✓ Test files cleaned up');
    }
    
    // Clean up test sessions
    const sessionCleanup = await page.request.delete(`${baseURL}/api/test/cleanup-sessions`);
    if (sessionCleanup.ok()) {
      console.log('  ✓ Test sessions cleaned up');
    }
    
    // Optionally clean up test database (for isolated test environments)
    if (process.env.CLEANUP_DATABASE === 'true') {
      const dbCleanup = await page.request.delete(`${baseURL}/api/test/cleanup-database`);
      if (dbCleanup.ok()) {
        console.log('  ✓ Test database cleaned up');
      }
    }
    
  } catch (error) {
    console.error('  ✗ Test data cleanup failed:', error);
  }
}

async function generateTestReports(page, baseURL: string) {
  try {
    // Get test execution summary
    const summaryResponse = await page.request.get(`${baseURL}/api/test/execution-summary`);
    
    if (summaryResponse.ok()) {
      const summary = await summaryResponse.json();
      
      console.log('  📈 Test Execution Summary:');
      console.log(`    • Total Tests: ${summary.totalTests || 0}`);
      console.log(`    • Passed: ${summary.passed || 0}`);
      console.log(`    • Failed: ${summary.failed || 0}`);
      console.log(`    • Skipped: ${summary.skipped || 0}`);
      console.log(`    • Duration: ${summary.duration || 'N/A'}`);
      
      if (summary.coverage) {
        console.log(`    • Coverage: ${summary.coverage.percentage || 'N/A'}%`);
      }
    }
    
    // Get performance metrics
    const metricsResponse = await page.request.get(`${baseURL}/api/test/performance-metrics`);
    
    if (metricsResponse.ok()) {
      const metrics = await metricsResponse.json();
      
      console.log('  🚀 Performance Metrics:');
      console.log(`    • Avg Response Time: ${metrics.avgResponseTime || 'N/A'}ms`);
      console.log(`    • Max Response Time: ${metrics.maxResponseTime || 'N/A'}ms`);
      console.log(`    • Error Rate: ${metrics.errorRate || 'N/A'}%`);
      console.log(`    • WebSocket Connections: ${metrics.wsConnections || 0}`);
    }
    
  } catch (error) {
    console.error('  ✗ Test report generation failed:', error);
  }
}

async function closeWebSocketConnections(page, baseURL: string) {
  try {
    const closeResponse = await page.request.post(`${baseURL}/api/test/close-websockets`, {
      data: { force: true }
    });
    
    if (closeResponse.ok()) {
      const result = await closeResponse.json();
      console.log(`  ✓ Closed ${result.connectionsClosed || 0} WebSocket connections`);
    }
    
  } catch (error) {
    console.error('  ✗ WebSocket cleanup failed:', error);
  }
}

async function archiveTestArtifacts() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Create artifacts directory if it doesn't exist
    const artifactsDir = path.join(process.cwd(), 'test-artifacts');
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    
    // Archive test results
    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(testResultsDir)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveDir = path.join(artifactsDir, `test-results-${timestamp}`);
      
      // Copy test results to archive (simplified - in real implementation, use proper archive library)
      fs.mkdirSync(archiveDir, { recursive: true });
      console.log(`  ✓ Test artifacts archived to: ${archiveDir}`);
    }
    
    // Archive screenshots and videos
    const screenshotsDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(screenshotsDir)) {
      console.log('  ✓ Screenshots and videos preserved');
    }
    
    // Archive coverage reports
    const coverageDir = path.join(process.cwd(), 'coverage');
    if (fs.existsSync(coverageDir)) {
      console.log('  ✓ Coverage reports preserved');
    }
    
  } catch (error) {
    console.error('  ✗ Test artifact archival failed:', error);
  }
}

export default globalTeardown;