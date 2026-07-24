import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';


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

// Root Welcome Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RentWise AI Server</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background-color: #0b0f19;
          color: #f8fafc;
          text-align: center;
          padding: 20px;
        }
        .container {
          max-width: 500px;
          border: 1px solid #1f2937;
          background-color: #111827;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        h1 {
          color: #14b8a6;
          margin-top: 0;
          font-size: 28px;
          font-weight: 800;
        }
        p {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .btn {
          display: inline-block;
          background-color: #0f766e;
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: background-color 0.2s ease;
        }
        .btn:hover {
          background-color: #115e59;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>RentWise AI Server 🔌</h1>
        <p>The Express API backend is running successfully and is connected to the MongoDB Atlas cluster.</p>
        <a href="http://localhost:3000" class="btn">Go to RentWise AI Client (Port 3000)</a>
      </div>
    </body>
    </html>
  `);
});

// Register Api Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);



// Database connection & Server Boot
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentwise';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('🔌 Connected to MongoDB successfully.');
    app.listen(PORT, () => {
      console.log(`🚀 RentWise AI Server running on: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failure:', err);
    process.exit(1);
  });
