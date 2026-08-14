import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as staffController from './staff.controller';

const router = Router();

// Staff management is admin-only (PRD §7.7: "I manage staff accounts and roles").
router.use(requireAuth, tenantScope, requireRole('admin'));

router.post('/', asyncHandler(staffController.create));
router.get('/', asyncHandler(staffController.list));
router.patch('/:staffId', asyncHandler(staffController.update));
router.patch('/:staffId/deactivate', asyncHandler(staffController.deactivate));

export default router;