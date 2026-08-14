import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as schoolController from './school.controller';

const router = Router();

// All school routes are tenant-scoped (the org is derived from the token)
// and restricted to admins of that org.
router.use(requireAuth, tenantScope, requireRole('admin'));

router.get('/', asyncHandler(schoolController.list));
router.post('/', asyncHandler(schoolController.create));
router.get('/:schoolId', asyncHandler(schoolController.get));
router.patch('/:schoolId', asyncHandler(schoolController.update));
router.delete('/:schoolId', asyncHandler(schoolController.remove));

export default router;