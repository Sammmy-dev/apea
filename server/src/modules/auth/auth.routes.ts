import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authController from './auth.controller';

const router = Router();

router.post('/guardian/login', asyncHandler(authController.guardianLogin));
router.post('/staff/login', asyncHandler(authController.staffLogin));

export default router;