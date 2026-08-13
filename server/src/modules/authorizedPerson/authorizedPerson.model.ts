import { Schema, model, type Types } from 'mongoose';

export interface AuthorizedPerson {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  phone: string;
  photoUrl?: string;
  idDocumentNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const authorizedPersonSchema = new Schema<AuthorizedPerson>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    photoUrl: { type: String },
    idDocumentNumber: { type: String, default: null },
  },
  { timestamps: true, collection: 'authorizedPeople' },
);

export const AuthorizedPersonModel = model<AuthorizedPerson>(
  'AuthorizedPerson',
  authorizedPersonSchema,
);