import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Launch browser for setup operations
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...');
    const baseURL = process.env.BASE_URL || 'http://localhost:5000';
    
    let retries = 30; // 30 retries = 60 seconds max wait
    while (retries > 0) {
      try {
        const response = await page.goto(`${baseURL}/api/health`, { 
          waitUntil: 'domcontentloaded',
          timeout: 5000 
        });
        
        if (response?.ok()) {
          console.log('✅ Development server is ready');
          break;
        }
      } catch (error) {
        console.log(`⏳ Server not ready, retrying... (${retries} attempts left)`);
        retries--;
        if (retries === 0) {
          throw new Error('Development server failed to start within 60 seconds');
        }
        await page.waitForTimeout(2000);
      }
    }
    
    // Setup test database and seed data
    console.log('🗄️ Setting up test database...');
    await setupTestDatabase(page, baseURL);
    
    // Create test users for different roles
    console.log('👥 Creating test users...');
    await createTestUsers(page, baseURL);
    
    // Setup test events
    console.log('🎉 Creating test events...');
    await createTestEvents(page, baseURL);
    
    // Setup test notifications and WebSocket infrastructure
    console.log('🔔 Setting up notification system...');
    await setupNotificationSystem(page, baseURL);
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestDatabase(page, baseURL: string) {
  try {
    // Reset test database
    const resetResponse = await page.request.post(`${baseURL}/api/test/reset-database`, {
      data: { confirm: true }
    });
    
    if (!resetResponse.ok()) {
      throw new Error(`Database reset failed: ${resetResponse.status()}`);
    }
    
    // Run migrations
    const migrateResponse = await page.request.post(`${baseURL}/api/test/migrate`, {
      data: { target: 'latest' }
    });
    
    if (!migrateResponse.ok()) {
      throw new Error(`Database migration failed: ${migrateResponse.status()}`);
    }
    
    console.log('  ✓ Database reset and migrated');
  } catch (error) {
    console.error('  ✗ Database setup failed:', error);
    throw error;
  }
}

async function createTestUsers(page, baseURL: string) {
  const testUsers = [
    {
      username: 'admin@test.com',
      password: 'admin-password',
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin'
    },
    {
      username: 'staff@test.com', 
      password: 'staff-password',
      name: 'Test Staff',
      email: 'staff@test.com',
      role: 'staff'
    },
    {
      username: 'couple@test.com',
      password: 'couple-password',
      name: 'Test Couple',
      email: 'couple@test.com',
      role: 'couple'
    },
    {
      username: 'user@test.com',
      password: 'user-password',
      name: 'Test User',
      email: 'user@test.com',
      role: 'staff'
    }
  ];
  
  for (const user of testUsers) {
    try {
      const response = await page.request.post(`${baseURL}/api/test/create-user`, {
        data: user
      });
      
      if (!response.ok()) {
        const error = await response.text();
        throw new Error(`User creation failed: ${error}`);
      }
      
      console.log(`  ✓ Created test user: ${user.username} (${user.role})`);
    } catch (error) {
      console.error(`  ✗ Failed to create user ${user.username}:`, error);
      throw error;
    }
  }
}

async function createTestEvents(page, baseURL: string) {
  const testEvents = [
    {
      title: 'Main Test Wedding',
      coupleNames: 'John & Jane Doe',
      brideName: 'Jane',
      groomName: 'John',
      startDate: '2024-06-15',
      endDate: '2024-06-17',
      location: 'Test Venue, Test City',
      description: 'Test wedding event for E2E testing',
      rsvpDeadline: '2024-06-01',
      allowPlusOnes: true,
      allowChildrenDetails: true,
      emailConfigured: true,
      whatsappConfigured: false
    },
    {
      title: 'Secondary Test Event',
      coupleNames: 'Alice & Bob Smith',
      brideName: 'Alice',
      groomName: 'Bob',
      startDate: '2024-07-20',
      endDate: '2024-07-22',
      location: 'Secondary Venue, Another City',
      description: 'Secondary test event for multi-event testing',
      rsvpDeadline: '2024-07-05',
      allowPlusOnes: false,
      allowChildrenDetails: false,
      emailConfigured: false,
      whatsappConfigured: true
    }
  ];
  
  for (const event of testEvents) {
    try {
      const response = await page.request.post(`${baseURL}/api/test/create-event`, {
        data: event
      });
      
      if (!response.ok()) {
        const error = await response.text();
        throw new Error(`Event creation failed: ${error}`);
      }
      
      const eventData = await response.json();
      console.log(`  ✓ Created test event: ${event.title} (ID: ${eventData.id})`);
    } catch (error) {
      console.error(`  ✗ Failed to create event ${event.title}:`, error);
      throw error;
    }
  }
}

async function setupNotificationSystem(page, baseURL: string) {
  try {
    // Initialize notification system
    const initResponse = await page.request.post(`${baseURL}/api/test/init-notifications`, {
      data: { 
        enableWebSocket: true,
        enableQueue: true,
        testMode: true
      }
    });
    
    if (!initResponse.ok()) {
      throw new Error(`Notification system initialization failed: ${initResponse.status()}`);
    }
    
    // Test WebSocket connection
    const wsTestResponse = await page.request.get(`${baseURL}/api/test/websocket-health`);
    
    if (!wsTestResponse.ok()) {
      console.warn('  ⚠ WebSocket health check failed, real-time features may not work in tests');
    } else {
      console.log('  ✓ WebSocket server is ready');
    }
    
    console.log('  ✓ Notification system initialized');
  } catch (error) {
    console.error('  ✗ Notification system setup failed:', error);
    throw error;
  }
}

export default globalSetup;