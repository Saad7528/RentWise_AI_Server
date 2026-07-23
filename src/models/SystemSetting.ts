import { Schema, model, Document } from 'mongoose';

export interface ISystemSetting extends Document {
  autoApproveListings: boolean;
}

const systemSettingSchema = new Schema<ISystemSetting>(
  {
    autoApproveListings: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const SystemSetting = model<ISystemSetting>('SystemSetting', systemSettingSchema);
