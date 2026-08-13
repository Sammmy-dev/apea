import { Schema, model, type Types } from 'mongoose';

export interface Guardian {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
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
    passwordHash: { type: String, required: true },
    photoUrl: { type: String },
  },
  { timestamps: true, collection: 'guardians' },
);

guardianSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const GuardianModel = model<Guardian>('Guardian', guardianSchema);