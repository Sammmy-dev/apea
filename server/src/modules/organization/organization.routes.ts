import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as organizationController from './organization.controller';

const router = Router();

// Public: sign-up a new organization + first school (+ first admin) in one request.
router.post('/', asyncHandler(organizationController.onboard));

// Everything below requires an authenticated ADMIN of the caller's own org.
// The org being operated on is always derived from the token (req.tenant),
// never from the URL or body.
router.use(requireAuth, tenantScope, requireRole('admin'));

router.get('/me', asyncHandler(organizationController.getMe));
router.patch('/me', asyncHandler(organizationController.updateMe));
router.delete('/me', asyncHandler(organizationController.deleteMe));

export default router;