# RentWise AI 🏡✨
> **An Agentic AI-Powered Real Estate Rental Search Platform**

RentWise AI is a complete, production-ready Full Stack Web Application that transforms the traditional apartment rental search experience. Integrating **Large Language Models (Gemini)**, **Audio Speech Recognition**, and **Advanced Geospatial Search**, users can find, manage, and analyze rental listings effortlessly using natural language and speech commands.

---

## 🔗 Live Deployments & Repository Links
* **Client App (Vercel):** [https://rent-wise-ai-client.vercel.app](https://rent-wise-ai-client.vercel.app)
* **Backend API Server (Render):** [https://rent-wise-ai-server.vercel.app](https://rent-wise-ai-server.vercel.app)
* **GitHub Repository (Frontend):** [RentWise AI Client](https://github.com/Saad7528/RentWise_AI_Client)
* **GitHub Repository (Backend):** [RentWise AI Server](https://github.com/Saad7528/RentWise_AI_Server)

---

## 🌟 Premium Features

### 🧠 1. Agentic AI & Natural Language Search
* **Ask AI (Conversational Agent):** An intelligent, context-aware chatbot that understands complex natural language prompts. It dynamically parses prompts into structured MongoDB query parameters (e.g., "Find bachelor apartments in Masterpara, Thakurgaon under 8000 BDT") and filters results instantly.
* **Smart Suggestion Engine:** Analyzes current listing availability and user queries to suggest the most optimal matching rentals.
* **Audio Voice Search:** Users can click the microphone button on the search bars. A glowing red pulsing recording animation captures user speech, translates it to text, and parses it for matching properties.

### 📍 2. Advanced Geospatial Google Map Integration
* **Radius-Based Searching:** Click anywhere on the map to drop a **red marker pin** and search for matching flats within a **2km to 20km dynamic radius**.
* **One-Click Route Direction:** View listing coordinates on the map and click "Get Directions" to open a pre-calculated route directly on the official Google Maps application.
* **Map Picker for Listing Posting:** Landlords can easily pinpoint the exact location of their property on the map while creating a listing, generating latitude/longitude coordinates automatically.

### ⚙️ 3. Dynamic Filter & Search Suite
* **Geographical Cascade Selectors:** Select Division ➡️ District ➡️ Thana ➡️ Neighborhood dynamically, matching pre-configured Bangladesh local regions.
* **Specific Parameters:** Filter by price range, number of bedrooms, bathrooms, and landlord restrictions (e.g., Bachelor allowed, Family only).
* **Advanced Sorting:** Sort properties dynamically by price (low to high, high to low), date posted (newest, oldest), and relevance.

### 🛡️ 4. Full Authentication & Moderation System
* **Real Google OAuth Sign-In:** Authenticates users via the official **Google Identity Services (GIS)**, securely verifying token credentials on the backend.
* **1-Click Reviewer Demo Login:** Reviewers, teachers, and recruiters can sign in with a single click in the Navbar or on the login page as a **Tenant**, **Landlord**, or **System Admin** without typing any credentials.
* **Landlord Dashboard (/items/manage):** Landlords can view, add, or delete their listings in real-time.
* **Admin Settings Panel (/admin):** Admins can monitor live user sign-ups, toggle system-wide Auto-Approve options, block users, and inspect rental analytics with charts generated dynamically via **Recharts**.

### 👤 5. Interactive Profile Management
* **Address/Contact Editing:** Users can update their names, phone numbers, and permanent addresses.
* **Base64 Photo Uploader:** Seamlessly select profile photos, preview them, and upload them as Base64 strings directly to MongoDB.

---

## 🛠️ Technology Stack

### **Frontend:**
* **Core:** Next.js (App Router, Turbopack compilation)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (Curated Dark/Light mode theme engine)
* **State Management & Fetching:** TanStack Query (React Query)
* **Interactive Maps:** Leaflet / React Leaflet (OpenStreetMap)
* **Analytics/Charts:** Recharts
* **Authentication Client:** Better Auth Client

### **Backend:**
* **Core:** Node.js, Express.js
* **Language:** TypeScript
* **Database:** MongoDB (via Mongoose schemas)
* **AI Provider:** Google Gemini API (`@google/generative-ai`)
* **Security:** CORS Policy Middleware (Dynamic Vercel/localhost whitelisting), cookie-parser, JSON Web Token (JWT)

---

## ⚙️ Environment Configurations

### **Frontend Client (`client/.env`)**
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=686079964181-sd96omj0gqdj9b70ccm6udgtd92hjvk2.apps.googleusercontent.com
```

### **Backend Server (`server/.env`)**
```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_string
BETTER_AUTH_SECRET=your_auth_secret_string
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=686079964181-sd96omj0gqdj9b70ccm6udgtd92hjvk2.apps.googleusercontent.com
GEMINI_API_KEY=your_google_gemini_api_key
```

---

## 🚀 Local Installation & Running Guide

### **Step 1: Clone and Set Up Databases**
Ensure you have **Node.js (v18+)** and a running **MongoDB** cluster ready.

### **Step 2: Start the Backend Server**
```bash
cd server
npm install
# Seed basic system settings and demo accounts:
npm run seed
# Run dev server:
npm run dev
```
*The API will run at `http://localhost:5001`.*

### **Step 3: Start the Next.js Client**
```bash
cd client
npm install
# Run Next.js developer mode:
npm run dev
```
*The client website will run at `http://localhost:3000`.*

---

## 👥 Developer & Author

<p align="left">
  <a href="https://github.com/Saad7528" target="_blank">
    <img src="https://img.shields.io/badge/Developer-S.%20M.%20Amirul%20Islam%20Saad-teal?style=for-the-badge&logo=github&logoColor=white" alt="Developer Profile" />
  </a>
  <a href="https://www.linkedin.com/in/s-m-amirul-islam-saad" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Profile" />
  </a>
  <a href="https://saad-portfolio-eta-three.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/Portfolio-Visit%20Website-rose?style=for-the-badge&logo=vercel&logoColor=white" alt="Portfolio Website" />
  </a>
</p>

* **Project Role:** Lead Full Stack Developer
