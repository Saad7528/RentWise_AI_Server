import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { SystemSetting } from '../models/SystemSetting';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentwise';

const seedDatabase = async () => {
  try {
    console.log('🔌 Connecting to database for seeding...');
    await mongoose.connect(MONGO_URI);
    console.log('🔌 Connected to MongoDB successfully.');

    // 1. Seed system setting if empty
    const settingCount = await SystemSetting.countDocuments();
    if (settingCount === 0) {
      await SystemSetting.create({ autoApproveListings: true });
      console.log('✔ Default system settings seeded (autoApproveListings: true)');
    } else {
      console.log('✔ System settings already exist. Skipping.');
    }

    // 2. Seed default users if empty (for demo logins)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      // Admin
      await User.create({
        name: 'Demo System Admin',
        email: 'demo.admin@rentwise.com',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        phone: '01812345678',
        role: 'ADMIN',
        isBlocked: false,
      });

      // Landlord
      await User.create({
        name: 'Demo Landlord (Karim Saheb)',
        email: 'demo.landlord@rentwise.com',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=karim',
        phone: '01712345678',
        role: 'USER',
        isBlocked: false,
      });

      // Tenant
      await User.create({
        name: 'Demo Tenant (Rashed)',
        email: 'demo.tenant@rentwise.com',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rashed',
        phone: '01912345678',
        role: 'USER',
        isBlocked: false,
      });

      console.log('✔ Demo users (Admin, Landlord, Tenant) seeded successfully');
    } else {
      console.log('✔ Users already exist. Skipping.');
    }

    console.log('✔ Database seeding process completed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
