import { Schema, model, type Types } from 'mongoose';

export type StudentStatus = 'active' | 'inactive';

export interface Student {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  dateOfBirth?: Date;
  classGrade?: string;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<Student>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    photoUrl: { type: String },
    dateOfBirth: { type: Date },
    classGrade: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true, collection: 'students' },
);

studentSchema.index({ schoolId: 1, status: 1 });

export const StudentModel = model<Student>('Student', studentSchema);