import { Schema, model, type Types } from 'mongoose';

export type GuardianStudentLinkStatus = 'active' | 'revoked';

export interface GuardianStudentLink {
  _id: Types.ObjectId;
  guardianId: Types.ObjectId;
  studentId: Types.ObjectId;
  relationship: string;
  isPrimary: boolean;
  status: GuardianStudentLinkStatus;
  revokedByStaffId?: Types.ObjectId;
  revokedAt?: Date;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guardianStudentLinkSchema = new Schema<GuardianStudentLink>(
  {
    guardianId: {
      type: Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    relationship: { type: String, required: true, trim: true },
    isPrimary: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
    revokedByStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', default: null },
    revokedAt: { type: Date, default: null },
    revocationReason: { type: String, default: null },
  },
  { timestamps: true, collection: 'guardianStudentLinks' },
);

guardianStudentLinkSchema.index({ guardianId: 1, status: 1 });
guardianStudentLinkSchema.index({ studentId: 1, status: 1 });

export const GuardianStudentLinkModel = model<GuardianStudentLink>(
  'GuardianStudentLink',
  guardianStudentLinkSchema,
);