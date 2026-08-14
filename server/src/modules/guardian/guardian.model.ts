import { Schema, model, type Types } from 'mongoose';

export type GuardianStatus = 'invited' | 'active';

export interface Guardian {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  /** Set on activation; absent while the account is still invited. */
  passwordHash?: string;
  status: GuardianStatus;
  /** SHA-256 of the plaintext claim token (the plaintext is never stored). */
  claimTokenHash?: string;
  claimTokenExpiresAt?: Date;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guardianSchema = new Schema<Guardian>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, select: false },
    status: { type: String, enum: ['invited', 'active'], default: 'invited' },
    claimTokenHash: { type: String, select: false },
    claimTokenExpiresAt: { type: Date, default: null },
    photoUrl: { type: String },
  },
  {
    timestamps: true,
    collection: 'guardians',
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.claimTokenHash;
      },
    },
  },
);

guardianSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const GuardianModel = model<Guardian>('Guardian', guardianSchema);