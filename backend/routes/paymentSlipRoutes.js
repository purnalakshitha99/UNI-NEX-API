// routes/paymentSlipRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  submitPaymentSlip,
  getMyPaymentSlips,
  getPaymentSlipDetails,
  updatePaymentSlip,
  cancelPaymentSlip,
  getAllPaymentSlips,
  getEventPaymentSlips,
  getEventAttendees,
  approvePaymentSlip,
  rejectPaymentSlip,
  checkInAttendee,
  regenerateQRCode,
  downloadQRCode,
} from "../controllers/paymentSlipController.js";
import { requiredSignIn, isStudent, isOrganizerOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Ensure temp directory exists
const tempDir = "temp";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "slip-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only images and PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
});

// ==================== NAMED ROUTES FIRST (avoid /:id conflicts) ====================

// STUDENT: Submit a new payment slip
router.post("/submit", requiredSignIn, isStudent, upload.single("slipImage"), submitPaymentSlip);

// STUDENT: Get all my payment slip registrations
router.get("/my-registrations", requiredSignIn, isStudent, getMyPaymentSlips);

// ORGANIZER/ADMIN: Check-in via QR
router.post("/check-in", requiredSignIn, isOrganizerOrAdmin, checkInAttendee);

// ADMIN: Get ALL payment slips cross all events
router.get("/all", requiredSignIn, isOrganizerOrAdmin, getAllPaymentSlips);

// ORGANIZER/ADMIN: Get all slips for a specific event
router.get("/event/:eventId", requiredSignIn, isOrganizerOrAdmin, getEventPaymentSlips);

// ORGANIZER/ADMIN: Get attendees (approved) for a specific event
router.get("/event/:eventId/attendees", requiredSignIn, isOrganizerOrAdmin, getEventAttendees);

// ==================== WILDCARD ROUTES LAST ====================

// STUDENT: Get single payment slip detail
router.get("/:id", requiredSignIn, isStudent, getPaymentSlipDetails);

// STUDENT: Update a pending payment slip
router.put("/:id", requiredSignIn, isStudent, upload.single("slipImage"), updatePaymentSlip);

// STUDENT: Cancel (delete) a pending payment slip
router.delete("/:id", requiredSignIn, isStudent, cancelPaymentSlip);

// STUDENT: Download QR code for approved slip
router.get("/:id/download-qr", requiredSignIn, isStudent, downloadQRCode);

// ORGANIZER/ADMIN: Approve slip and generate QR
router.put("/:id/approve", requiredSignIn, isOrganizerOrAdmin, approvePaymentSlip);

// ORGANIZER/ADMIN: Reject slip
router.put("/:id/reject", requiredSignIn, isOrganizerOrAdmin, rejectPaymentSlip);

// ORGANIZER/ADMIN: Regenerate QR code
router.put("/:id/regenerate-qr", requiredSignIn, isOrganizerOrAdmin, regenerateQRCode);

export default router;