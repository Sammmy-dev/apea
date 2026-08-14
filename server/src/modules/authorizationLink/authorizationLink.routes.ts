import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authorizationLinkController from './authorizationLink.controller';

const router = Router();

// Authorizations are granted by guardians (PRD §7.3) — admins do not grant
// or revoke them; they manage links only via the guardianStudentLink module.
router.use(requireAuth, tenantScope, requireRole('guardian'));

router.post('/', asyncHandler(authorizationLinkController.grant));
router.get('/', asyncHandler(authorizationLinkController.listMine));
router.get('/:linkId/qr', asyncHandler(authorizationLinkController.qr));
router.delete('/:linkId', asyncHandler(authorizationLinkController.revokeMine));

export default router;