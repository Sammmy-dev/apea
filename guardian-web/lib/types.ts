/**
 * Guardian-facing API types, mirroring the server's entity models (see
 * server/src/modules) as serialized over the wire — Dates arrive as ISO
 * strings, and secret fields like passwordHash / qrTokenHash / claimToken
 * are stripped by the server's toJSON transforms and never appear here.
 */

export type ISOString = string;

// ── Student ──────────────────────────────────────────────────────────────

export type StudentStatus = 'active' | 'inactive';

export interface Student {
  _id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  dateOfBirth?: ISOString;
  classGrade?: string;
  status: StudentStatus;
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── Guardian ─────────────────────────────────────────────────────────────

export type GuardianStatus = 'invited' | 'active';

export interface Guardian {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  status: GuardianStatus;
  photoUrl?: string;
  createdAt: ISOString;
  updatedAt: ISOString;
}

/** Guardian ↔ student link (co-guardianship, admin-only revocation). */
export interface GuardianStudentLink {
  _id: string;
  guardianId: string;
  studentId: string;
  relationship: string;
  isPrimary: boolean;
  status: 'active' | 'revoked';
  revokedByStaffId?: string;
  revokedAt?: ISOString;
  revocationReason?: string;
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── AuthorizationLink ────────────────────────────────────────────────────

export type AuthorizationLinkType = 'standing' | 'daily';
export type AuthorizationLinkStatus = 'active' | 'expired' | 'revoked';

export interface AuthorizationLink {
  _id: string;
  studentId: string;
  authorizedPersonId: string;
  grantedByGuardianId: string;
  type: AuthorizationLinkType;
  validFrom: ISOString;
  /** Null for standing authorizations. */
  validUntil: ISOString | null;
  status: AuthorizationLinkStatus;
  revokedAt?: ISOString;
  createdAt: ISOString;
  updatedAt: ISOString;
}

/** Response of POST /authorization-links — the fallback code is returned once. */
export interface AuthorizationLinkGrantResponse {
  link: AuthorizationLink;
  qrToken: string;
  fallbackCode: string;
}

/** Response of GET /authorization-links/:id/qr and /guardian-student-links/:id/qr. */
export interface DigitalId {
  qrToken: string;
  fallbackCode: string;
  expiresAt: ISOString;
}

// ── PickupEvent ──────────────────────────────────────────────────────────

export type PickupMethod = 'qr' | 'code';
export type PickupStatus = 'approved' | 'denied';

export interface PickupEvent {
  _id: string;
  /** Nullable for identity-less denials (garbage code, unknown token). */
  studentId?: string;
  /** Guardian id for self-pickups (see VerifyResult.pickupPerson.role). */
  authorizedPersonId?: string;
  /** Null for guardian self-pickups. */
  authorizationLinkId?: string;
  scannedByStaffId: string;
  schoolId: string;
  method: PickupMethod;
  timestamp: ISOString;
  status: PickupStatus;
  denialReason?: string;
  createdAt: ISOString;
  updatedAt: ISOString;
}

// ── Gate verification (guard UI) ─────────────────────────────────────────

export type VerifyStatus = 'APPROVED' | 'DENIED';
export type PickupPersonRole = 'authorized_person' | 'guardian';
export type AuthorizationKind = 'standing' | 'daily' | 'guardian_self';

export interface VerifyResult {
  status: VerifyStatus;
  reason?: string;
  method: PickupMethod;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    classGrade?: string;
  };
  pickupPerson?: {
    id: string;
    name: string;
    photoUrl?: string;
    role: PickupPersonRole;
  };
  relationship?: string;
  authorization?: {
    id: string;
    type: AuthorizationKind;
    validUntil?: ISOString;
  };
}