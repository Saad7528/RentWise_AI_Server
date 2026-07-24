import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  phone?: string;
  address?: string;
  role: 'USER' | 'ADMIN';
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    isBlocked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'user', // Maps to Better Auth's default user collection name
  }
);

export const User = model<IUser>('User', userSchema);
