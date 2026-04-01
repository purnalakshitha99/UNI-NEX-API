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

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
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
