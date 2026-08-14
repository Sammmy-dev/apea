import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import authorizedPersonRoutes from '../modules/authorizedPerson/authorizedPerson.routes';
import authorizationLinkRoutes from '../modules/authorizationLink/authorizationLink.routes';
import guardianRoutes from '../modules/guardian/guardian.routes';
import guardianStudentLinkRoutes from '../modules/guardianStudentLink/guardianStudentLink.routes';
import organizationRoutes from '../modules/organization/organization.routes';
import pickupEventRoutes from '../modules/pickupEvent/pickupEvent.routes';
import schoolRoutes from '../modules/school/school.routes';
import staffRoutes from '../modules/staff/staff.routes';
import studentRoutes from '../modules/student/student.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/schools', schoolRoutes);
router.use('/staff', staffRoutes);
router.use('/students', studentRoutes);
router.use('/guardians', guardianRoutes);
router.use('/guardian-student-links', guardianStudentLinkRoutes);
router.use('/authorized-people', authorizedPersonRoutes);
router.use('/authorization-links', authorizationLinkRoutes);
router.use('/pickup-events', pickupEventRoutes);

export default router;