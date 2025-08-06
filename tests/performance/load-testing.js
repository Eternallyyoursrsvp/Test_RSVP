import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const wsConnections = new Counter('websocket_connections');
const notificationsSent = new Counter('notifications_sent');

// Performance test configuration
export const options = {
  stages: [
    // Ramp up to normal load
    { duration: '2m', target: 50 },   // 50 concurrent users
    // Maintain normal load
    { duration: '5m', target: 50 },
    // Ramp up to peak load
    { duration: '2m', target: 200 },  // 200 concurrent users (peak)
    // Maintain peak load
    { duration: '5m', target: 200 },
    // Ramp up to stress load
    { duration: '2m', target: 500 },  // 500 concurrent users (stress)
    // Maintain stress load
    { duration: '3m', target: 500 },
    // Ramp down
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // Response time thresholds
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'http_req_duration{endpoint:api}': ['p(95)<500'], // API calls under 500ms
    'http_req_duration{endpoint:dashboard}': ['p(95)<2000'], // Dashboard loads under 2s
    
    // Error rate thresholds
    'http_req_failed': ['rate<0.01'], // Error rate under 1%
    'errors': ['rate<0.01'],
    
    // WebSocket thresholds
    'ws_session_duration': ['p(95)<30000'], // WebSocket sessions under 30s
    
    // Custom metric thresholds
    'response_time': ['p(95)<1000'], // Custom response time metric
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:5000';

// Test data
const testUsers = {
  admin: { username: 'admin@test.com', password: 'admin-pass' },
  staff: { username: 'staff@test.com', password: 'staff-pass' },
  couple: { username: 'couple@test.com', password: 'couple-pass' },
};

const guestData = {
  name: `Test Guest ${Math.random().toString(36).substr(2, 9)}`,
  email: `guest${Math.random().toString(36).substr(2, 9)}@test.com`,
  phone: '+1-555-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
  rsvpStatus: 'attending',
  dietary: ['none', 'vegetarian', 'vegan', 'gluten-free'][Math.floor(Math.random() * 4)],
};

export function setup() {
  // Warm up the system
  console.log('Warming up the system...');
  
  // Login as admin to ensure services are ready
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, {
    username: testUsers.admin.username,
    password: testUsers.admin.password,
  });
  
  check(loginRes, {
    'setup: login successful': (r) => r.status === 200,
  });
  
  return { authToken: loginRes.json('token') };
}

export default function (data) {
  const userType = ['admin', 'staff', 'couple'][Math.floor(Math.random() * 3)];
  const user = testUsers[userType];
  
  // Authentication
  const authHeaders = performAuth(user);
  if (!authHeaders) return;
  
  // Simulate different user workflows based on role
  switch (userType) {
    case 'admin':
      adminWorkflow(authHeaders);
      break;
    case 'staff':
      staffWorkflow(authHeaders);
      break;
    case 'couple':
      coupleWorkflow(authHeaders);
      break;
  }
  
  // Random think time between 1-5 seconds
  sleep(Math.random() * 4 + 1);
}

function performAuth(user) {
  const loginStart = Date.now();
  
  const response = http.post(`${BASE_URL}/api/v1/auth/login`, {
    username: user.username,
    password: user.password,
  }, {
    tags: { endpoint: 'auth' },
  });
  
  const loginDuration = Date.now() - loginStart;
  responseTime.add(loginDuration);
  
  const success = check(response, {
    'login successful': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    errorRate.add(1);
    return null;
  }
  
  const token = response.json('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function adminWorkflow(headers) {
  // Admin dashboard load
  loadDashboard(headers, 'admin');
  
  // User management operations
  performUserManagement(headers);
  
  // System monitoring
  performSystemMonitoring(headers);
  
  // Notification operations
  performNotificationOperations(headers);
  
  // Analytics operations
  performAnalyticsOperations(headers);
  
  // Real-time features
  testWebSocketConnection(headers);
}

function staffWorkflow(headers) {
  // Staff dashboard load
  loadDashboard(headers, 'staff');
  
  // Guest management operations
  performGuestManagement(headers);
  
  // RSVP operations
  performRSVPOperations(headers);
  
  // Transport coordination
  performTransportOperations(headers);
  
  // Accommodation management
  performAccommodationOperations(headers);
}

function coupleWorkflow(headers) {
  // Couple dashboard load
  loadDashboard(headers, 'couple');
  
  // Event overview
  viewEventOverview(headers);
  
  // Guest list review
  reviewGuestList(headers);
  
  // Reports and analytics
  viewReports(headers);
}

function loadDashboard(headers, userType) {
  const dashboardStart = Date.now();
  
  const response = http.get(`${BASE_URL}/api/v1/dashboard/${userType}`, {
    headers,
    tags: { endpoint: 'dashboard', userType },
  });
  
  const dashboardDuration = Date.now() - dashboardStart;
  responseTime.add(dashboardDuration);
  
  check(response, {
    'dashboard loads successfully': (r) => r.status === 200,
    'dashboard response time < 2s': (r) => r.timings.duration < 2000,
    'dashboard has required data': (r) => {
      const data = r.json();
      return data && data.stats && data.events;
    },
  }) || errorRate.add(1);
  
  sleep(0.5);
}

function performUserManagement(headers) {
  // List pending users
  const pendingUsersRes = http.get(`${BASE_URL}/api/v1/admin/users?status=pending`, {
    headers,
    tags: { endpoint: 'api', operation: 'list_pending_users' },
  });
  
  check(pendingUsersRes, {
    'pending users loaded': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.3);
  
  // Approve a user (simulate)
  if (Math.random() < 0.3) { // 30% chance
    const userId = Math.floor(Math.random() * 1000) + 1;
    const approveRes = http.post(`${BASE_URL}/api/v1/admin/users/${userId}/approve`, null, {
      headers,
      tags: { endpoint: 'api', operation: 'approve_user' },
    });
    
    check(approveRes, {
      'user approval processed': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);
  }
  
  sleep(0.2);
}

function performSystemMonitoring(headers) {
  // System health check
  const healthRes = http.get(`${BASE_URL}/api/v1/admin/platform/health`, {
    headers,
    tags: { endpoint: 'api', operation: 'system_health' },
  });
  
  check(healthRes, {
    'system health retrieved': (r) => r.status === 200,
    'system health response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  // Platform statistics
  const statsRes = http.get(`${BASE_URL}/api/v1/admin/platform/stats`, {
    headers,
    tags: { endpoint: 'api', operation: 'platform_stats' },
  });
  
  check(statsRes, {
    'platform stats retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.5);
}

function performNotificationOperations(headers) {
  // Send test notification
  if (Math.random() < 0.2) { // 20% chance
    const notificationData = {
      type: 'SYSTEM_ALERT',
      title: 'Performance Test Notification',
      message: 'This is a test notification from performance testing',
      recipients: ['test-user'],
      channels: ['in-app'],
    };
    
    const sendRes = http.post(`${BASE_URL}/api/v1/notifications/send`, JSON.stringify(notificationData), {
      headers,
      tags: { endpoint: 'api', operation: 'send_notification' },
    });
    
    check(sendRes, {
      'notification sent': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    notificationsSent.add(1);
  }
  
  // Get notification history
  const historyRes = http.get(`${BASE_URL}/api/v1/notifications/history?page=1&limit=10`, {
    headers,
    tags: { endpoint: 'api', operation: 'notification_history' },
  });
  
  check(historyRes, {
    'notification history retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.3);
}

function performAnalyticsOperations(headers) {
  // Dashboard analytics
  const analyticsRes = http.get(`${BASE_URL}/api/v1/analytics/dashboard`, {
    headers,
    tags: { endpoint: 'api', operation: 'analytics_dashboard' },
  });
  
  check(analyticsRes, {
    'analytics dashboard loaded': (r) => r.status === 200,
    'analytics response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  // Generate custom report (occasionally)
  if (Math.random() < 0.1) { // 10% chance
    const reportConfig = {
      type: 'table',
      filters: [{ field: 'rsvpStatus', value: 'attending' }],
      groupBy: ['dietary'],
      metrics: ['count'],
    };
    
    const reportRes = http.post(`${BASE_URL}/api/v1/analytics/reports/generate`, JSON.stringify(reportConfig), {
      headers,
      tags: { endpoint: 'api', operation: 'generate_report' },
    });
    
    check(reportRes, {
      'report generated': (r) => r.status === 200,
      'report generation time < 5s': (r) => r.timings.duration < 5000,
    }) || errorRate.add(1);
  }
  
  sleep(0.4);
}

function performGuestManagement(headers) {
  // List guests
  const guestsRes = http.get(`${BASE_URL}/api/v1/guests?page=1&limit=20`, {
    headers,
    tags: { endpoint: 'api', operation: 'list_guests' },
  });
  
  check(guestsRes, {
    'guests listed': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Add a guest (occasionally)
  if (Math.random() < 0.1) { // 10% chance
    const addGuestRes = http.post(`${BASE_URL}/api/v1/guests`, JSON.stringify(guestData), {
      headers,
      tags: { endpoint: 'api', operation: 'add_guest' },
    });
    
    check(addGuestRes, {
      'guest added': (r) => r.status === 201,
    }) || errorRate.add(1);
  }
  
  sleep(0.3);
}

function performRSVPOperations(headers) {
  // Get RSVP statistics
  const rsvpStatsRes = http.get(`${BASE_URL}/api/v1/rsvp/stats`, {
    headers,
    tags: { endpoint: 'api', operation: 'rsvp_stats' },
  });
  
  check(rsvpStatsRes, {
    'RSVP stats retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Generate RSVP links (occasionally)
  if (Math.random() < 0.05) { // 5% chance
    const guestIds = [1, 2, 3, 4, 5]; // Sample guest IDs
    const linksRes = http.post(`${BASE_URL}/api/v1/rsvp/generate-links`, JSON.stringify({ guestIds }), {
      headers,
      tags: { endpoint: 'api', operation: 'generate_rsvp_links' },
    });
    
    check(linksRes, {
      'RSVP links generated': (r) => r.status === 200,
    }) || errorRate.add(1);
  }
  
  sleep(0.3);
}

function performTransportOperations(headers) {
  // Get transport overview
  const transportRes = http.get(`${BASE_URL}/api/v1/transport-ops/overview`, {
    headers,
    tags: { endpoint: 'api', operation: 'transport_overview' },
  });
  
  check(transportRes, {
    'transport overview loaded': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Get transport groups
  const groupsRes = http.get(`${BASE_URL}/api/v1/transport-ops/groups`, {
    headers,
    tags: { endpoint: 'api', operation: 'transport_groups' },
  });
  
  check(groupsRes, {
    'transport groups loaded': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.3);
}

function performAccommodationOperations(headers) {
  // Get accommodation status
  const accomRes = http.get(`${BASE_URL}/api/v1/accommodations/status`, {
    headers,
    tags: { endpoint: 'api', operation: 'accommodation_status' },
  });
  
  check(accomRes, {
    'accommodation status loaded': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.3);
}

function viewEventOverview(headers) {
  const overviewRes = http.get(`${BASE_URL}/api/v1/events/overview`, {
    headers,
    tags: { endpoint: 'api', operation: 'event_overview' },
  });
  
  check(overviewRes, {
    'event overview loaded': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.4);
}

function reviewGuestList(headers) {
  const guestListRes = http.get(`${BASE_URL}/api/v1/guests/summary`, {
    headers,
    tags: { endpoint: 'api', operation: 'guest_summary' },
  });
  
  check(guestListRes, {
    'guest summary loaded': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.4);
}

function viewReports(headers) {
  const reportsRes = http.get(`${BASE_URL}/api/v1/reports/summary`, {
    headers,
    tags: { endpoint: 'api', operation: 'reports_summary' },
  });
  
  check(reportsRes, {
    'reports summary loaded': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.4);
}

function testWebSocketConnection(headers) {
  // Only test WebSocket connections for a subset of users to avoid overwhelming the server
  if (Math.random() < 0.3) { // 30% chance
    const wsResponse = ws.connect(`${WS_URL}/notifications`, {
      headers: {
        'Authorization': headers['Authorization'],
      },
    }, function (socket) {
      wsConnections.add(1);
      
      socket.on('open', () => {
        // Send a test message
        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
        }));
      });
      
      socket.on('message', (data) => {
        const message = JSON.parse(data);
        check(message, {
          'websocket message received': (m) => m.type !== undefined,
        });
      });
      
      socket.on('error', (e) => {
        errorRate.add(1);
        console.log('WebSocket error:', e);
      });
      
      // Keep connection open for 5-10 seconds
      sleep(Math.random() * 5 + 5);
      socket.close();
    });
    
    check(wsResponse, {
      'websocket connection established': (r) => r && r.status === 101,
    }) || errorRate.add(1);
  }
}

export function teardown(data) {
  console.log('Performance test completed');
  console.log('Total WebSocket connections:', wsConnections.count);
  console.log('Total notifications sent:', notificationsSent.count);
}