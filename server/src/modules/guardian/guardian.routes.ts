import express, { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as guardianController from './guardian.controller';

const router = Router();

// Public: account activation via claim token (no auth — the token IS the credential).
router.post('/activate', asyncHandler(guardianController.activate));

// Guardians are organization-scoped; all management routes require an
// authenticated admin of the caller's org.
router.use(requireAuth, tenantScope, requireRole('admin'));

router.get('/', asyncHandler(guardianController.list));
router.post('/bulk', express.text({ type: 'text/csv' }), asyncHandler(guardianController.bulk));
router.post('/', asyncHandler(guardianController.create));
router.get('/:guardianId', asyncHandler(guardianController.get));
router.patch('/:guardianId', asyncHandler(guardianController.update));
router.delete('/:guardianId', asyncHandler(guardianController.remove));

export default router;