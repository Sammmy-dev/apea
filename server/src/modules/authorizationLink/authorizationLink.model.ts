import { Schema, model, type Types } from 'mongoose';

export type AuthorizationLinkType = 'standing' | 'daily';
export type AuthorizationLinkStatus = 'active' | 'expired' | 'revoked';

export interface AuthorizationLink {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  authorizedPersonId: Types.ObjectId;
  grantedByGuardianId: Types.ObjectId;
  type: AuthorizationLinkType;
  validFrom: Date;
  validUntil?: Date;
  status: AuthorizationLinkStatus;
  qrTokenHash: string;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const authorizationLinkSchema = new Schema<AuthorizationLink>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    authorizedPersonId: {
      type: Schema.Types.ObjectId,
      ref: 'AuthorizedPerson',
      required: true,
      index: true,
    },
    grantedByGuardianId: {
      type: Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
      index: true,
    },
    type: { type: String, enum: ['standing', 'daily'], required: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
      index: true,
    },
    qrTokenHash: { type: String, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'authorizationLinks' },
);

authorizationLinkSchema.index({ studentId: 1, status: 1 });

export const AuthorizationLinkModel = model<AuthorizationLink>(
  'AuthorizationLink',
  authorizationLinkSchema,
);