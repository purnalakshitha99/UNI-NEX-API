import express from "express";
import {
  requiredSignIn,
  isStudent,
  isOrganizerOrAdmin,
} from "../middleware/authMiddleware.js";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getMyEvents,
  getMyRegistrations,
  getPublicEvents,
  registerForEvent,
  updateEvent,
  getAdminAllBookings,
  getAdminEventBookings,
  getAdminEventAttendance,
  markAttendanceByQr,
} from "../controllers/eventController.js";
import upload from "../config/multer.js";

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.get("/public", getPublicEvents);
router.get("/public/:id", getEventById);

// ── Admin booking routes (specific paths before wildcards) ────────────────────
router.get("/admin/bookings", requiredSignIn, isOrganizerOrAdmin, getAdminAllBookings);
router.get("/admin/bookings/:eventId", requiredSignIn, isOrganizerOrAdmin, getAdminEventBookings);
router.get("/admin/attendance/:eventId", requiredSignIn, isOrganizerOrAdmin, getAdminEventAttendance);
router.post("/admin/attendance/scan", requiredSignIn, isOrganizerOrAdmin, markAttendanceByQr);

// ── Organizer/Admin event management ─────────────────────────────────────────
router.post("/create", requiredSignIn, isOrganizerOrAdmin, upload.single("image"), createEvent);
router.get("/my-events", requiredSignIn, isOrganizerOrAdmin, getMyEvents);
router.put("/update/:id", requiredSignIn, isOrganizerOrAdmin, upload.single("image"), updateEvent);
router.delete("/delete/:id", requiredSignIn, isOrganizerOrAdmin, deleteEvent);

// ── Student registration ──────────────────────────────────────────────────────
router.post("/register/:id", requiredSignIn, isStudent, registerForEvent);
router.get("/my-registrations", requiredSignIn, isStudent, getMyRegistrations);

export default router;
