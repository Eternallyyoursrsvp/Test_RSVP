import { Router } from 'express';
import { createCeremony } from './create';
import { listCeremonies } from './list';
import { getCeremonyDetails } from './details';
import { updateCeremony } from './update';
import { deleteCeremony } from './delete';
import { getCeremonyStats } from './stats';
import { getCeremonyAttendance } from './attendance';
import { setGuestAttendance } from './set-attendance';
import { requireAuthentication, eventContextMiddleware, requirePermission, Permission } from '../../middleware/enhanced-auth';
import { validateId, validateEventId } from '../../middleware/validation';
import { globalErrorHandler, asyncHandler } from '../../middleware/error-handler';
import { requestIdMiddleware } from '../../lib/response-builder';

const router = Router();

// Apply common middleware to all routes
router.use(requestIdMiddleware);
router.use(requireAuthentication);

// EVENT-SCOPED CEREMONY OPERATIONS
// These endpoints operate on ceremonies within a specific event

// List ceremonies for an event
router.get('/:eventId/ceremonies',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_READ),
  asyncHandler(listCeremonies)
);

// Create ceremony for an event
router.post('/:eventId/ceremonies',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_UPDATE), // Creating ceremonies requires event update permission
  asyncHandler(createCeremony)
);

// INDIVIDUAL CEREMONY OPERATIONS
// These endpoints operate on specific ceremonies by ID

// Get ceremony details
router.get('/ceremonies/:id',
  validateId,
  requirePermission(Permission.EVENT_READ),
  asyncHandler(getCeremonyDetails)
);

// Update ceremony
router.put('/ceremonies/:id',
  validateId,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(updateCeremony)
);

// Delete ceremony
router.delete('/ceremonies/:id',
  validateId,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(deleteCeremony)
);

// Get ceremony statistics
router.get('/ceremonies/:id/stats',
  validateId,
  requirePermission(Permission.EVENT_READ),
  asyncHandler(getCeremonyStats)
);

// Get ceremony attendance
router.get('/ceremonies/:id/attendance',
  validateId,
  requirePermission(Permission.GUEST_READ), // Attendance involves guest data
  asyncHandler(getCeremonyAttendance)
);

// GUEST CEREMONY ATTENDANCE MANAGEMENT
// These endpoints manage guest attendance for ceremonies

// Set guest attendance for a ceremony
router.post('/guests/:guestId/attendance',
  validateId,
  requirePermission(Permission.GUEST_UPDATE),
  asyncHandler(setGuestAttendance)
);

// Alternative endpoint for updating guest ceremony attendance
router.put('/guests/:guestId/ceremonies/:ceremonyId/attendance',
  validateId,
  requirePermission(Permission.GUEST_UPDATE),
  asyncHandler(setGuestAttendance)
);

// Apply error handler
router.use(globalErrorHandler);

export { router as ceremoniesRouter };

// Export for registration in main API
export function createCeremoniesAPI() {
  return router;
}