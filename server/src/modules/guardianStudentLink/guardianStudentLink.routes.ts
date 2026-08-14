import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as guardianStudentLinkController from './guardianStudentLink.controller';

const router = Router();

// Roles are applied per-route (NOT router-level) because this router serves
// both admins (create/list/revoke/delete) and guardians (their own pickup
// digital ID) — a router-level requireRole('admin') would block guardians
// before they ever reach the /:linkId/qr route.
router.use(requireAuth, tenantScope);

router.post('/', requireRole('admin'), asyncHandler(guardianStudentLinkController.create));
router.get('/', requireRole('admin'), asyncHandler(guardianStudentLinkController.list));
router.patch('/:linkId/revoke', requireRole('admin'), asyncHandler(guardianStudentLinkController.revoke));
router.delete('/:linkId', requireRole('admin'), asyncHandler(guardianStudentLinkController.remove));
router.get('/:linkId/qr', requireRole('guardian'), asyncHandler(guardianStudentLinkController.qr));
router.get('/me', requireRole('guardian'), asyncHandler(guardianStudentLinkController.me));

export default router;