import { Schema, model, Document } from 'mongoose';

export interface ISession extends Document {
  id: string; // Better Auth uses its own id string
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
    collection: 'session', // Maps to Better Auth's default session collection name
  }
);

export const Session = model<ISession>('Session', sessionSchema);
