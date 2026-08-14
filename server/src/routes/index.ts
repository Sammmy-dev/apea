import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import guardianRoutes from '../modules/guardian/guardian.routes';
import guardianStudentLinkRoutes from '../modules/guardianStudentLink/guardianStudentLink.routes';
import organizationRoutes from '../modules/organization/organization.routes';
import schoolRoutes from '../modules/school/school.routes';
import studentRoutes from '../modules/student/student.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/schools', schoolRoutes);
router.use('/students', studentRoutes);
router.use('/guardians', guardianRoutes);
router.use('/guardian-student-links', guardianStudentLinkRoutes);

export default router;