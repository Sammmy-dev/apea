import { Schema, model, type Types } from 'mongoose';

export interface Organization {
  _id: Types.ObjectId;
  name: string;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<Organization>(
  {
    name: { type: String, required: true, trim: true },
    plan: { type: String, default: 'free' },
  },
  { timestamps: true, collection: 'organizations' },
);

export const OrganizationModel = model<Organization>('Organization', organizationSchema);