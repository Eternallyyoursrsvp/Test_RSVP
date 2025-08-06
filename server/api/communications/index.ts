import { Router } from 'express';
import { getCoupleMessages } from './couple-messages-list';
import { createCoupleMessage } from './couple-messages-create';
import { getWhatsAppTemplates } from './whatsapp-templates-list';
import { getWhatsAppTemplateById } from './whatsapp-templates-details';
import { createWhatsAppTemplate } from './whatsapp-templates-create';
import { updateWhatsAppTemplate } from './whatsapp-templates-update';
import { deleteWhatsAppTemplate } from './whatsapp-templates-delete';
import { markWhatsAppTemplateAsUsed } from './whatsapp-templates-mark-used';
import { getProviderStatus } from './providers-status';
import { configureProvider } from './providers-configure';
import { disconnectProvider } from './providers-disconnect';
import { testEmail } from './test-email';
import { requireAuthentication, eventContextMiddleware, requirePermission, Permission } from '../../middleware/enhanced-auth';
import { validateId, validateEventId } from '../../middleware/validation';
import { globalErrorHandler, asyncHandler } from '../../middleware/error-handler';
import { requestIdMiddleware } from '../../lib/response-builder';

const router = Router();

// Apply common middleware to all routes
router.use(requestIdMiddleware);
router.use(requireAuthentication);

// EVENT-SCOPED COMMUNICATION OPERATIONS
// These endpoints operate on communications within a specific event

// Couple Messages routes
router.get('/:eventId/couple-messages',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_READ),
  asyncHandler(getCoupleMessages)
);

router.post('/:eventId/couple-messages',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(createCoupleMessage)
);

// WhatsApp Templates routes
router.get('/:eventId/whatsapp-templates',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_READ),
  asyncHandler(getWhatsAppTemplates)
);

router.post('/:eventId/whatsapp-templates',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(createWhatsAppTemplate)
);

// Provider Management routes
router.get('/:eventId/providers/status',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_READ),
  asyncHandler(getProviderStatus)
);

router.post('/:eventId/providers/:providerType/configure',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(configureProvider)
);

router.delete('/:eventId/providers/:providerType/disconnect',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(disconnectProvider)
);

// Email Testing route
router.post('/:eventId/test-email',
  validateEventId,
  eventContextMiddleware,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(testEmail)
);

// INDIVIDUAL WHATSAPP TEMPLATE OPERATIONS
// These endpoints operate on specific templates by ID

router.get('/whatsapp-templates/:id',
  validateId,
  requirePermission(Permission.EVENT_READ),
  asyncHandler(getWhatsAppTemplateById)
);

router.put('/whatsapp-templates/:id',
  validateId,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(updateWhatsAppTemplate)
);

router.delete('/whatsapp-templates/:id',
  validateId,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(deleteWhatsAppTemplate)
);

router.patch('/whatsapp-templates/:id/mark-used',
  validateId,
  requirePermission(Permission.EVENT_UPDATE),
  asyncHandler(markWhatsAppTemplateAsUsed)
);

// Apply error handler
router.use(globalErrorHandler);

export { router as communicationsRouter };

// Export for registration in main API
export function createCommunicationsAPI() {
  return router;
}