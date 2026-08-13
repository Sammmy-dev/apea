import { Schema, model, type Types } from 'mongoose';

export interface School {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schoolSchema = new Schema<School>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
  },
  { timestamps: true, collection: 'schools' },
);

schoolSchema.index({ organizationId: 1, name: 1 });

export const SchoolModel = model<School>('School', schoolSchema);