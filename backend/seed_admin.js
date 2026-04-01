import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from the same directory as the script
dotenv.config({ path: path.join(__dirname, '.env') });

const seedAdmin = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    console.log("Connecting to Database...");
    await mongoose.connect(mongoURI);
    
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log("Admin account with admin@gmail.com already exists. Updating for consistency...");
      existingAdmin.password = 'admin123';
      existingAdmin.role = 'admin';
      existingAdmin.isVerified = true;
      existingAdmin.firstName = 'System';
      existingAdmin.lastName = 'Admin';
      await existingAdmin.save();
    } else {
      const admin = new User({
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@gmail.com',
        password: 'admin123',
        phone: '0712345678',
        role: 'admin',
        isVerified: true
      });
      await admin.save();
    }

    console.log("-----------------------------------------");
    console.log("SUCCESS: Admin account ready!");
    console.log("Email: admin@gmail.com");
    console.log("Password: admin123");
    console.log("-----------------------------------------");

    await mongoose.connection.close();
  } catch (err) {
    console.error("Critical Seeding Error:", err.message);
    process.exit(1);
  }
};

seedAdmin();
