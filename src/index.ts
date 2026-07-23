import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import { User } from './models/User';
import { SystemSetting } from './models/SystemSetting';
import { Property } from './models/Property';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS setup
// Crucial to support credentials (cookies) in Next.js + Express
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// Body parser middleware (supports large payloads for base64 images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'RentWise AI Server is running smoothly' });
});

// Register Api Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Seed Initial Data (Admin user, Default settings, etc.)
const seedDatabase = async () => {
  try {
    // 1. Seed system setting
    const settingCount = await SystemSetting.countDocuments();
    if (settingCount === 0) {
      await SystemSetting.create({ autoApproveListings: true }); // Default to auto-approve for smoother testing
      console.log('✔ Default system settings seeded (autoApproveListings: true)');
    }

    // 2. Seed default users if empty
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
    }

    // 3. Seed 15 property listings in Thakurgaon if empty
    const propertyCount = await Property.countDocuments();
    if (propertyCount === 0) {
      const landlord = await User.findOne({ email: 'demo.landlord@rentwise.com' });
      const landlordId = landlord ? (landlord.id || landlord._id.toString()) : 'mock-landlord-id';

      const thakurgaonProperties = [
        {
          title: 'গোবিন্দনগর মনোরম ফ্যামিলি ফ্ল্যাট',
          description: '### গোবিন্দনগর সুন্দর ফ্যামিলি বাসা\n\nগোবিন্দনগর প্রাইমারি স্কুলের কাছে ৩টি বেডরুম ও ২টি বাথরুম সহ চমৎকার ফ্যামিলি বাসা ভাড়া দেওয়া হবে। বাসাটিতে সার্বক্ষণিক পানি ও নিরাপত্তার ব্যবস্থা রয়েছে। গ্যাস সিলিন্ডার ব্যবহার করতে হবে।\n\n- **রুম সংখ্যা:** ৩টি বেডরুম\n- **বাথরুম:** ২টি বাথরুম\n- **সুবিধা:** পার্কিং স্পেস ও খোলামেলা বারান্দা।',
          rentAmount: 12000,
          deposit: 4000,
          category: 'Family',
          bedrooms: 3,
          bathrooms: 2,
          isBachelorAllowed: false,
          address: 'Gobindanagar, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4655, 26.0268] },
          images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'মুন্সিপাড়া ব্যাচেলর সাবলেট/রুম',
          description: '### মুন্সিপাড়া ব্যাচেলর সাবলেট\n\nমুন্সিপাড়া রোড সংলগ্ন একটি রুমে ১/২ জন ব্যাচেলর ছাত্রদের জন্য সাবলেট দেওয়া হবে। ওয়াইফাই, ফিল্টারের পানি এবং বুয়ার সুবিধা রয়েছে।\n\n- **সুবিধা:** হাই-স্পীড ওয়াইফাই\n- **রেন্ট:** ৪০০০ টাকা\n- **ব্যাচেলর অনুমতি:** হ্যাঁ',
          rentAmount: 4500,
          deposit: 1000,
          category: 'Bachelor Allowed',
          bedrooms: 1,
          bathrooms: 1,
          isBachelorAllowed: true,
          address: 'Munshipara Road, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4611, 26.0355] },
          images: ['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'হাজিপাড়া লাক্সারি ডুপ্লেক্স হোম',
          description: '### হাজিপাড়া ৪ BHK লাক্সারি হোম\n\nহাজিপাড়া মিশন মোড়ের পাশে আধুনিক সুযোগ-সুবিধা সহ ৪ বেডের একটি লাক্সারি ফ্যামিলি ফ্ল্যাট ভাড়া দেওয়া হবে। এখানে কার পার্কিং এবং লিফটের সুবিধা রয়েছে।\n\n- **রুম:** ৪টি বেডরুম, ৩টি বাথরুম\n- **ভাড়া:** ২০০০০ টাকা\n- **বৈশিষ্ট্য:** ফাইবার অপটিক ইন্টারনেট কানেকশন রেডি।',
          rentAmount: 20000,
          deposit: 8000,
          category: 'Family',
          bedrooms: 4,
          bathrooms: 3,
          isBachelorAllowed: false,
          address: 'Hajipara Mission Road, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4690, 26.0402] },
          images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'স্টেশন রোড স্টুডেন্ট মেস সিট',
          description: '### স্টেশন রোড মেস সিট ভাড়া\n\nঠাকুরগাঁও রেলওয়ে স্টেশন সংলগ্ন মেসে ছাত্রদের জন্য সিট খালি আছে। ডাইনিং এবং ওয়াইফাই অন্তর্ভুক্ত। পড়াশোনার নিরিবিলি পরিবেশ।\n\n- **ভাড়া:** ১৫০০ টাকা/সিট\n- **ক্যাটাগরি:** হোস্টেল/মেস\n- **সুবিধা:** সার্বক্ষণিক পানি ও বিদ্যুৎ ব্যাকআপ।',
          rentAmount: 1500,
          deposit: 500,
          category: 'Hostel',
          bedrooms: 1,
          bathrooms: 1,
          isBachelorAllowed: true,
          address: 'Station Road, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4722, 26.0210] },
          images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'কালীবাড়ী কমার্শিয়াল শোরুম ও অফিস',
          description: '### কালীবাড়ী মেইন রোড কমার্শিয়াল স্পেস\n\nকালীবাড়ী চৌরাস্তার কাছে ব্যবসার জন্য ফার্স্ট ফ্লোরে ৮০০ স্কয়ার ফিটের একটি কমার্শিয়াল অফিস স্পেস ভাড়া দেওয়া হবে। ব্যাংক বা শো-রুমের জন্য উপযোগী।\n\n- **স্পেস সাইজ:** ৮০০ sqft\n- **ভাড়া:** ২৫০০০ টাকা\n- **অবস্থান:** কালীবাড়ী কমার্শিয়াল এরিয়া।',
          rentAmount: 25000,
          deposit: 10000,
          category: 'Commercial Office',
          bedrooms: 2,
          bathrooms: 1,
          isBachelorAllowed: false,
          address: 'Kalibari Main Road, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4633, 26.0331] },
          images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'কলেজ পাড়া ৩ বেডের ফ্যামিলি বাসা',
          description: '### কলেজ পাড়া নিরিবিলি ফ্ল্যাট\n\nঠাকুরগাঁও সরকারি কলেজের পিছনে নতুন ৩টি বেডরুম ও ২টি বাথরুম সহ বাসা ভাড়া দেওয়া হবে। সুন্দর আলো-বাতাসপূর্ণ পরিবেশ।\n\n- **ভাড়া:** ১০০০০ টাকা\n- **পানির লাইন:** সরকারি সাপ্লাই ও ডিপ টিউবওয়েল\n- **রুম সাইজ:** স্ট্যান্ডার্ড সাইজ।',
          rentAmount: 10000,
          deposit: 3000,
          category: 'Family',
          bedrooms: 3,
          bathrooms: 2,
          isBachelorAllowed: false,
          address: 'College Para, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4522, 26.0399] },
          images: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'চৌরাস্তা ২ BHK ফ্যামিলি ফ্ল্যাট',
          description: '### চৌরাস্তা মোড় ২ বেড ফ্ল্যাট\n\nশহরের প্রাণকেন্দ্র চৌরাস্তা মোড়ের কাছে ২ বেড ও ২ বাথ সহ ফ্ল্যাট ভাড়া হবে। সব ধরণের যোগাযোগ ও বাজারের সুবিধা হাতের নাগালেই।\n\n- **ভাড়া:** ৮৫০০ টাকা\n- **ডিপোজিট:** ২৫০০ টাকা\n- **সুবিধা:** মেইন রোড এক্সেস।',
          rentAmount: 8500,
          deposit: 2500,
          category: 'Family',
          bedrooms: 2,
          bathrooms: 2,
          isBachelorAllowed: false,
          address: 'Chowrasta Road, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4678, 26.0289] },
          images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'তাঁতীপাড়া ব্যাচেলর সিঙ্গেল রুম',
          description: '### তাঁতীপাড়া সিঙ্গেল রুম সাবলেট\n\nচাকরিজীবী অথবা ছাত্রদের জন্য ১ বেড এবং অ্যাটাচড বাথরুম সহ নিরিবিলি একটি রুম ভাড়া দেওয়া হবে।\n\n- **ভাড়া:** ৩০০০ টাকা\n- **বাথরুম:** ১টি (অ্যাটাচড)\n- **ব্যাচেলর:** হ্যাঁ',
          rentAmount: 3000,
          deposit: 1000,
          category: 'Bachelor Allowed',
          bedrooms: 1,
          bathrooms: 1,
          isBachelorAllowed: true,
          address: 'Tatipara, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4590, 26.0345] },
          images: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'সালান্দর ছায়াতরূ ফ্যামিলি বাসা',
          description: '### সালান্দর সুন্দর খোলামেলা ফ্ল্যাট\n\nসালান্দর মোড় সংলগ্ন ছায়াতরূ ডুপ্লেক্সের ফ্লোরে ৩ বেডের একটি ফ্যামিলি ফ্ল্যাট ভাড়া দেওয়া হবে। পর্যাপ্ত গাছপালা পরিবেষ্টিত সুন্দর বাতাস।\n\n- **ভাড়া:** ১১০০০ টাকা\n- **বেড:** ৩টি, বাথ: ২টি\n- **পার্কিং:** মোটরবাইক পার্কিং ফ্রি।',
          rentAmount: 11000,
          deposit: 4000,
          category: 'Family',
          bedrooms: 3,
          bathrooms: 2,
          isBachelorAllowed: false,
          address: 'Salandar Main Road, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4789, 26.0512] },
          images: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'রাণীশংকৈল রোড ফ্যামিলি সাবলেট',
          description: '### রাণীশংকৈল রোড সুন্দর ২ BHK সাবলেট\n\nফ্যামিলি ফ্ল্যাটে একটি বড় রুম ও বারান্দা সহ সাবলেট ভাড়া হবে। ছোট ফ্যামিলি অথবা চাকরিজীবী নারীদের অগ্রাধিকার দেওয়া হবে।\n\n- **ভাড়া:** ৫০০০ টাকা\n- **ক্যাটাগরি:** সাবলেট\n- **সুবিধা:** ফ্যামিলি এনভায়রনমেন্ট।',
          rentAmount: 5000,
          deposit: 1500,
          category: 'Sublet',
          bedrooms: 2,
          bathrooms: 1,
          isBachelorAllowed: false,
          address: 'Ranishankail Road, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4410, 26.0295] },
          images: ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'সরকারপাড়া স্টুডেন্ট মেস (সিঙ্গেল রুম)',
          description: '### সরকারপাড়া ছাত্র মেস সিঙ্গেল রুম\n\nসরকারি কলেজের কাছে সরকারপাড়ায় ছাত্রদের মেসে ১টি সিঙ্গেল রুম খালি আছে। নিরিবিলি পরিবেশে পড়াশোনা করার জন্য বেস্ট।\n\n- **ভাড়া:** ২৫০০ টাকা\n- **ডিপোজিট:** ৫০০ টাকা\n- **ব্যাচেলর:** শুধুমাত্র ছাত্র।',
          rentAmount: 2500,
          deposit: 500,
          category: 'Hostel',
          bedrooms: 1,
          bathrooms: 1,
          isBachelorAllowed: true,
          address: 'Sarkarpara, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4601, 26.0371] },
          images: ['https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'মাস্টারপাড়া লাক্সারি ফ্ল্যাট',
          description: '### মাস্টারপাড়া ৩ বেডরুম ফ্ল্যাট\n\nমাস্টারপাড়া বয়েজ হাই স্কুলের কাছে কার পার্কিং সহ ৩ বেড ও ২ বাথের একটি রেডি ফ্ল্যাট ভাড়া হবে। আধুনিক কিচেন ফিটিংস।\n\n- **ভাড়া:** ১৪০০০ টাকা\n- **নিরাপত্তা:** সিসিটিভি ও গার্ড\n- **ডিপোজিট:** ৫০০০ টাকা।',
          rentAmount: 14000,
          deposit: 5000,
          category: 'Family',
          bedrooms: 3,
          bathrooms: 2,
          isBachelorAllowed: false,
          address: 'Masterpara, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4682, 26.0320] },
          images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'গোবিন্দনগর মোড় ব্যাচেলর ফ্ল্যাট',
          description: '### গোবিন্দনগর ২ বেড ব্যাচেলর ফ্ল্যাট\n\nগোবিন্দনগর মোড়ের কাছে ২টি বেডরুম ও ১টি বাথরুম সহ পুরো ফ্ল্যাট ব্যাচেলর চাকরিজীবী অথবা ছাত্রদের জন্য ভাড়া দেওয়া হবে।\n\n- **ভাড়া:** ৭০০০ টাকা\n- **রুম:** ২টি বেডরুম\n- **ব্যাচেলর:** হ্যাঁ',
          rentAmount: 7000,
          deposit: 2000,
          category: 'Bachelor Allowed',
          bedrooms: 2,
          bathrooms: 1,
          isBachelorAllowed: true,
          address: 'Gobindanagar Mor, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4640, 26.0250] },
          images: ['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'বশিরপাড়া সুপরিসর ফ্যামিলি ফ্ল্যাট',
          description: '### বশিরপাড়া ৩ BHK খোলামেলা ফ্ল্যাট\n\nবশিরপাড়ায় ৩ বেড ও ২ বাথ সহ সুন্দর দক্ষিণমুখী ফ্ল্যাট ভাড়া দেওয়া হবে। বড় বারান্দা ও সুন্দর ভেন্টিলেশন সুবিধা।\n\n- **ভাড়া:** ৯৫০০ টাকা\n- **বাথরুম:** ২টি\n- **ডিপোজিট:** ৩০০০ টাকা।',
          rentAmount: 9500,
          deposit: 3000,
          category: 'Family',
          bedrooms: 3,
          bathrooms: 2,
          isBachelorAllowed: false,
          address: 'Basirpara, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4585, 26.0425] },
          images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        },
        {
          title: 'মুন্সিপাড়া রোড রেডি কমার্শিয়াল ডেস্কেট স্পেস',
          description: '### মুন্সিপাড়া কমার্শিয়াল অফিস স্পেস\n\nআইটি ফার্ম, এনজিও অথবা ছোট অফিসের জন্য মুন্সিপাড়া মেইন রোডে ফার্স্ট ফ্লোরে ৫০০ স্কয়ার ফিটের অফিস স্পেস ভাড়া হবে।\n\n- **সাইজ:** ৫০০ sqft\n- **ভাড়া:** ১৫০০০ টাকা\n- **সুবিধা:** মেইন রোড ফ্রন্ট।',
          rentAmount: 15000,
          deposit: 5000,
          category: 'Commercial Office',
          bedrooms: 1,
          bathrooms: 1,
          isBachelorAllowed: false,
          address: 'Munshipara Main Road, Thakurgaon Sadar, Thakurgaon',
          location: { type: 'Point', coordinates: [88.4608, 26.0358] },
          images: ['https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=600'],
          status: 'APPROVED',
          landlordId,
          contactPhone: '01712345678',
        }
      ];

      await Property.create(thakurgaonProperties);
      console.log('✔ 15 Thakurgaon property listings seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// Database connection & Server Boot
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentwise';

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('🔌 Connected to MongoDB successfully.');
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 RentWise AI Server running on: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failure:', err);
    process.exit(1);
  });
