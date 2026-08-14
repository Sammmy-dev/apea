import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import organizationRoutes from '../modules/organization/organization.routes';
import schoolRoutes from '../modules/school/school.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/schools', schoolRoutes);

export default router;