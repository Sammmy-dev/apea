import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authorizedPersonController from './authorizedPerson.controller';

const router = Router();

// Authorized people are org-scoped. Both admins (roster management) and
// guardians (adding their own pickup people, PRD §6) may manage them;
// guards cannot.
router.use(requireAuth, tenantScope, requireRole('admin', 'guardian'));

router.get('/', asyncHandler(authorizedPersonController.list));
router.post('/', asyncHandler(authorizedPersonController.create));
router.get('/:personId', asyncHandler(authorizedPersonController.get));
router.patch('/:personId', asyncHandler(authorizedPersonController.update));
router.delete('/:personId', asyncHandler(authorizedPersonController.remove));

export default router;