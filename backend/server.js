import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/db.js";
import { setServers } from "node:dns/promises";

setServers(["1.1.1.1", "8.8.8.8"]);

//routes import
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import paymentSlipRoutes from "./routes/paymentSlipRoutes.js";

connectDB();

const app = express();

// CORS Configuration - Allow multiple origins for testing and production
const allowedOrigins = [
  "http://localhost:3000",           // Local development
  "http://localhost:5000",           // Local backend
  "https://uni-nex-front-end.onrender.com",  // Production frontend
  process.env.FRONTEND_URL,          // From environment variable
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/payment-slips", paymentSlipRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
