import { Schema, model, type Types } from 'mongoose';

export type PickupMethod = 'qr' | 'code';
export type PickupStatus = 'approved' | 'denied';

export interface PickupEvent {
  _id: Types.ObjectId;
  /**
   * Nullable only for DENIED attempts where no identity could be resolved
   * (e.g. garbage QR token / unknown code) — such attempts are still logged
   * for the audit trail (PRD §7.5: every attempt is logged).
   */
  studentId?: Types.ObjectId;
  authorizedPersonId?: Types.ObjectId;
  authorizationLinkId?: Types.ObjectId;
  scannedByStaffId: Types.ObjectId;
  schoolId: Types.ObjectId;
  method: PickupMethod;
  timestamp: Date;
  status: PickupStatus;
  denialReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pickupEventSchema = new Schema<PickupEvent>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      index: true,
    },
    authorizedPersonId: {
      type: Schema.Types.ObjectId,
      ref: 'AuthorizedPerson',
      index: true,
    },
    authorizationLinkId: {
      type: Schema.Types.ObjectId,
      ref: 'AuthorizationLink',
      default: null,
    },
    scannedByStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    method: { type: String, enum: ['qr', 'code'], required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['approved', 'denied'],
      required: true,
      index: true,
    },
    denialReason: { type: String, default: null },
  },
  { timestamps: true, collection: 'pickupEvents' },
);

pickupEventSchema.index({ schoolId: 1, timestamp: -1 });
pickupEventSchema.index({ studentId: 1, status: 1, timestamp: -1 });

export const PickupEventModel = model<PickupEvent>('PickupEvent', pickupEventSchema);