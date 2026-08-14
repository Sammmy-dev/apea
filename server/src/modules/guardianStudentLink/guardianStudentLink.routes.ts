import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as guardianStudentLinkController from './guardianStudentLink.controller';

const router = Router();

router.use(requireAuth, tenantScope, requireRole('admin'));

router.post('/', asyncHandler(guardianStudentLinkController.create));
router.get('/', asyncHandler(guardianStudentLinkController.list));
router.delete('/:linkId', asyncHandler(guardianStudentLinkController.remove));

export default router;