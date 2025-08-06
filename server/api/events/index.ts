import { Router } from 'express';
import { createEvent } from './create';
import { listEvents } from './list';
import { getEventDetails } from './details';
import { updateEvent } from './update';
import { deleteEvent } from './delete';
import { getEventSettings, updateEventSettings } from './settings';
import { getDashboardData } from './dashboard';
import { getEventStats } from './stats';
import { requireAuthentication, eventContextMiddleware } from '../../middleware/enhanced-auth';
import { validateId, validateEventId, validatePagination } from '../../middleware/validation';
import { globalErrorHandler, asyncHandler } from '../../middleware/error-handler';
import { requestIdMiddleware } from '../../lib/response-builder';

const router = Router();

// Apply common middleware to all routes
router.use(requestIdMiddleware);
router.use(requireAuthentication);

// Events CRUD operations
router.post('/', asyncHandler(createEvent));
router.get('/', validatePagination, asyncHandler(listEvents));
router.get('/:id', validateId, eventContextMiddleware, asyncHandler(getEventDetails));
router.put('/:id', validateId, eventContextMiddleware, asyncHandler(updateEvent));
router.delete('/:id', validateId, eventContextMiddleware, asyncHandler(deleteEvent));

// Event-specific endpoints
router.get('/:id/settings', validateId, eventContextMiddleware, asyncHandler(getEventSettings));
router.put('/:id/settings', validateId, eventContextMiddleware, asyncHandler(updateEventSettings));
router.get('/:id/dashboard-batch', validateId, eventContextMiddleware, asyncHandler(getDashboardData));
router.get('/:id/statistics', validateId, eventContextMiddleware, asyncHandler(getEventStats));

// Apply error handler
router.use(globalErrorHandler);

export { router as eventsRouter };

// Export for registration in main API
export function createEventsAPI() {
  return router;
}