import express, { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { tenantScope } from '../../middleware/tenantScope';
import { asyncHandler } from '../../utils/asyncHandler';
import * as studentController from './student.controller';

const router = Router();

// Students are school-scoped; all routes require an authenticated admin of
// the caller's school.
router.use(requireAuth, tenantScope, requireRole('admin'));

router.get('/', asyncHandler(studentController.list));
router.post('/bulk', express.text({ type: 'text/csv' }), asyncHandler(studentController.bulk));
router.post('/', asyncHandler(studentController.create));
router.get('/:studentId', asyncHandler(studentController.get));
router.patch('/:studentId', asyncHandler(studentController.update));
router.delete('/:studentId', asyncHandler(studentController.remove));

export default router;