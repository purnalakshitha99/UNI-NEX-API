import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify JWT token
export const requiredSignIn = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Admin role check
export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Organizer role check
export const isOrganizer = (req, res, next) => {
  if (req.user.role !== "organizer") {
    return res.status(403).json({ message: "Organizer access required" });
  }
  next();
};

// Organizer or admin role check
export const isOrganizerOrAdmin = (req, res, next) => {
  if (!["organizer", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Organizer or admin access required" });
  }
  next();
};

// Student role check
export const isStudent = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Student access required" });
  }
  next();
};
