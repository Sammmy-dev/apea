import { Schema, model, type Types } from 'mongoose';

export type NotificationChannel = 'sms';
export type NotificationStatus = 'sent' | 'failed';

export interface Notification {
  _id: Types.ObjectId;
  guardianId: Types.ObjectId;
  pickupEventId: Types.ObjectId;
  type: string;
  channel: NotificationChannel;
  sentAt?: Date;
  status: NotificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<Notification>(
  {
    guardianId: {
      type: Schema.Types.ObjectId,
      ref: 'Guardian',
      required: true,
      index: true,
    },
    pickupEventId: {
      type: Schema.Types.ObjectId,
      ref: 'PickupEvent',
      required: true,
      index: true,
    },
    type: { type: String, default: 'pickup_confirmation' },
    channel: { type: String, enum: ['sms'], default: 'sms' },
    sentAt: { type: Date, default: null },
    status: { type: String, enum: ['sent', 'failed'], required: true, index: true },
  },
  { timestamps: true, collection: 'notifications' },
);

notificationSchema.index({ guardianId: 1, status: 1 });

export const NotificationModel = model<Notification>('Notification', notificationSchema);