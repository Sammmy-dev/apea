import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as pickupEventController from './pickupEvent.controller';

const router = Router();

// Gate verification is a staff-only flow (guard or admin).
router.use(requireAuth, tenantScope, requireRole('guard', 'admin'));

router.post('/verify', asyncHandler(pickupEventController.verify));
router.post('/', asyncHandler(pickupEventController.create));
router.get('/', asyncHandler(pickupEventController.list));

export default router;