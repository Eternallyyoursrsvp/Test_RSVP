import { Router } from 'express';
import { verifyRSVPToken } from './verify';
import { submitPublicRSVP } from './submit';
import { submitStage1RSVP } from './stage1';
import { submitStage2RSVP } from './stage2';
import { getRSVPStats } from './stats';
import { sendRSVPReminders } from './reminders';
import { requireAuthentication, eventContextMiddleware, requirePermission, Permission } from '../../middleware/enhanced-auth';
import { validateEventId } from '../../middleware/validation';
import { globalErrorHandler, asyncHandler } from '../../middleware/error-handler';
import { requestIdMiddleware } from '../../lib/response-builder';

const router = Router();

// Apply common middleware
router.use(requestIdMiddleware);

// PUBLIC RSVP ENDPOINTS (No authentication required)
// These endpoints use token-based authentication for guests

// Verify RSVP token and get guest context
router.get('/verify', asyncHandler(verifyRSVPToken));

// Submit public RSVP response
router.post('/submit', asyncHandler(submitPublicRSVP));

// Two-stage RSVP submission endpoints
router.post('/stage1', asyncHandler(submitStage1RSVP));
router.post('/stage2', asyncHandler(submitStage2RSVP));

// AUTHENTICATED RSVP MANAGEMENT ENDPOINTS
// These endpoints require user authentication and proper permissions

// Apply authentication to all subsequent routes
router.use(requireAuthentication);

// Get RSVP statistics for an event
router.get('/:eventId/stats',
  validateEventId,
  eventContextMiddleware,  
  requirePermission(Permission.EVENT_READ),
  asyncHandler(getRSVPStats)
);

// Send RSVP reminders to pending guests
router.post('/:eventId/reminders',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.GUEST_UPDATE), // Requires guest update permission to send reminders
  asyncHandler(sendRSVPReminders)
);

// Apply error handler
router.use(globalErrorHandler);

export { router as rsvpRouter };

// Export for registration in main API
export function createRSVPAPI() {
  return router;
}