import { Schema, model, Document } from 'mongoose';

export interface IProperty extends Document {
  title: string;
  description: string;
  rentAmount: number;
  deposit: number;
  category: 'Family' | 'Bachelor Allowed' | 'Sublet' | 'Hostel' | 'Commercial Office';
  bedrooms: number;
  bathrooms: number;
  isBachelorAllowed: boolean;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  images: string[];
  status: 'PENDING' | 'APPROVED' | 'RENTED' | 'REJECTED';
  landlordId: string; // Better Auth uses string IDs
  contactPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    rentAmount: { type: Number, required: true },
    deposit: { type: Number, required: true },
    category: {
      type: String,
      enum: ['Family', 'Bachelor Allowed', 'Sublet', 'Hostel', 'Commercial Office'],
      required: true,
    },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    isBachelorAllowed: { type: Boolean, default: false },
    address: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'RENTED', 'REJECTED'],
      default: 'PENDING',
    },
    landlordId: { type: String, required: true, index: true },
    contactPhone: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Geo-spatial index for radius search based on coordinates
propertySchema.index({ location: '2dsphere' });

export const Property = model<IProperty>('Property', propertySchema);
