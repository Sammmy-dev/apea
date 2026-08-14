import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../middleware/errorHandler';
import { GuardianModel } from '../guardian/guardian.model';
import { SchoolModel } from '../school/school.model';
import { StaffModel } from '../staff/staff.model';
import type { AuthRole, AuthTokenPayload, UserType } from '../../types/auth';

const SALT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    userType: UserType;
    role: AuthRole;
    organizationId: string;
    schoolId?: string;
  };
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Guardian login. Emails are unique per organization, so the same person may
 * have accounts in several organizations — if so, login is refused with a
 * clear message (org-scoped login can be added later).
 */
export async function loginGuardian(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const guardians = await GuardianModel.find({ email: normalizedEmail }).select('+passwordHash');

  if (guardians.length === 0) {
    throw new UnauthorizedError('invalid email or password');
  }
  if (guardians.length > 1) {
    throw new UnauthorizedError('this email has accounts in multiple organizations — please contact support');
  }

  const guardian = guardians[0];
  if (!guardian.passwordHash || guardian.status !== 'active') {
    throw new UnauthorizedError('account not activated — use your claim invitation');
  }
  const passwordOk = await bcrypt.compare(password, guardian.passwordHash);
  if (!passwordOk) {
    throw new UnauthorizedError('invalid email or password');
  }

  const token = signToken({
    userId: guardian._id.toString(),
    userType: 'guardian',
    role: 'guardian',
    organizationId: guardian.organizationId.toString(),
  });

  return {
    token,
    user: {
      id: guardian._id.toString(),
      name: guardian.name,
      email: guardian.email,
      phone: guardian.phone,
      userType: 'guardian',
      role: 'guardian',
      organizationId: guardian.organizationId.toString(),
    },
  };
}

/** Staff login — covers both admin and guard roles via `Staff.role`. */
export async function loginStaff(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const staff = await StaffModel.find({ email: normalizedEmail });

  if (staff.length === 0) {
    throw new UnauthorizedError('invalid email or password');
  }
  if (staff.length > 1) {
    throw new UnauthorizedError('this email belongs to staff in multiple schools — please contact support');
  }

  const member = staff[0];
  const passwordOk = await bcrypt.compare(password, member.passwordHash);
  if (!passwordOk) {
    throw new UnauthorizedError('invalid email or password');
  }

  const school = await SchoolModel.findById(member.schoolId);
  if (!school) {
    throw new UnauthorizedError('staff account is not linked to a school');
  }

  const token = signToken({
    userId: member._id.toString(),
    userType: 'staff',
    role: member.role,
    organizationId: school.organizationId.toString(),
    schoolId: member.schoolId.toString(),
  });

  return {
    token,
    user: {
      id: member._id.toString(),
      name: member.name,
      email: member.email,
      phone: member.phone,
      userType: 'staff',
      role: member.role,
      organizationId: school.organizationId.toString(),
      schoolId: member.schoolId.toString(),
    },
  };
}