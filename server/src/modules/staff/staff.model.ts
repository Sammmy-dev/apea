import { Schema, model, type Types } from 'mongoose';

export type StaffRole = 'admin' | 'guard';
export type StaffStatus = 'active' | 'inactive';

export interface Staff {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  /**
   * Deactivation (never hard-delete) keeps PickupEvent.scannedByStaffId
   * references valid for the audit trail; inactive staff cannot log in.
   */
  status: StaffStatus;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<Staff>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'guard'], default: 'guard' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'staff',
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
      },
    },
  },
);

staffSchema.index({ schoolId: 1, email: 1 }, { unique: true });

export const StaffModel = model<Staff>('Staff', staffSchema);