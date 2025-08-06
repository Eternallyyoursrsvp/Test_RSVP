import { Router } from 'express';
import { createGuest } from './create';
import { listGuests } from './list';
import { getGuestDetails } from './details';
import { updateGuest } from './update';
import { deleteGuest } from './delete';
import { updateContactPreference } from './contact-preference';
import { setGuestAttendance } from './attendance';
import { setGuestMealSelection } from './meal-selections';
import { importGuests } from './import';
import { exportGuests } from './export';
import { getGuestStats } from './stats';
import { requireAuthentication, eventContextMiddleware, requirePermission, Permission } from '../../middleware/enhanced-auth';
import { validateId, validateEventId, validatePagination } from '../../middleware/validation';
import { globalErrorHandler, asyncHandler } from '../../middleware/error-handler';
import { requestIdMiddleware } from '../../lib/response-builder';
import { createMasterGuestProfileAPI } from './master-profile';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Apply common middleware to all routes
router.use(requestIdMiddleware);

// PUBLIC endpoints (no authentication required for RSVP form)
router.post('/guests/:id/attendance',
  validateId,
  asyncHandler(setGuestAttendance)
);

router.post('/guests/:id/meal-selections',
  validateId,
  asyncHandler(setGuestMealSelection)
);

// Apply authentication to remaining routes
router.use(requireAuthentication);

// Guests CRUD operations - scoped to event
router.post('/:eventId/guests', 
  validateEventId, 
  eventContextMiddleware, 
  requirePermission(Permission.GUEST_CREATE),
  asyncHandler(createGuest)
);

router.get('/:eventId/guests', 
  validateEventId, 
  eventContextMiddleware, 
  validatePagination,
  requirePermission(Permission.GUEST_READ),
  asyncHandler(listGuests)
);

router.get('/:eventId/guests/stats',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.GUEST_READ),
  asyncHandler(getGuestStats)
);

router.get('/:eventId/guests/export',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.GUEST_EXPORT),
  asyncHandler(exportGuests)
);

router.post('/:eventId/guests/import',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.GUEST_IMPORT),
  upload.single('file'),
  asyncHandler(importGuests)
);

// Individual guest operations
router.get('/guests/:id', 
  validateId, 
  requirePermission(Permission.GUEST_READ),
  asyncHandler(getGuestDetails)
);

router.put('/guests/:id', 
  validateId, 
  requirePermission(Permission.GUEST_UPDATE),
  asyncHandler(updateGuest)
);

router.delete('/guests/:id', 
  validateId, 
  requirePermission(Permission.GUEST_DELETE),
  asyncHandler(deleteGuest)
);

router.patch('/guests/:id/contact-preference', 
  validateId, 
  requirePermission(Permission.GUEST_UPDATE),
  asyncHandler(updateContactPreference)
);

// Mount master profile sub-routes
router.use('/', async (req, res, next) => {
  const masterProfileRouter = await createMasterGuestProfileAPI();
  masterProfileRouter(req, res, next);
});

// Apply error handler
router.use(globalErrorHandler);

export { router as guestsRouter };

// Export for registration in main API
export function createGuestsAPI() {
  return router;
}