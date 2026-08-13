import { Schema, model, type Types } from 'mongoose';

export type StaffRole = 'admin' | 'guard';

export interface Staff {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
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
    passwordHash: { type: String, required: true },
  },
  { timestamps: true, collection: 'staff' },
);

staffSchema.index({ schoolId: 1, email: 1 }, { unique: true });

export const StaffModel = model<Staff>('Staff', staffSchema);