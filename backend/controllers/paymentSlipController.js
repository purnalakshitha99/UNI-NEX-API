// controllers/paymentSlipController.js
import PaymentSlip from "../models/PaymentSlip.js";
import Event from "../models/Event.js";
import QRCode from "qrcode";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// Helper functions
const generateTicketCode = () => {
  return `SLIP-${Math.random().toString(36).slice(2, 10).toUpperCase()}-${Date.now().toString().slice(-6)}`;
};

const generateTransactionId = () => {
  return `SLIP-TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

// ==================== PAYMENT SLIP REGISTRATION ====================

// STUDENT: Submit payment slip for approval
export const submitPaymentSlip = async (req, res) => {
  try {
    const { eventId, bankName, amount, depositDate, ticketType, qty, notes } = req.body;
    const studentId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check if event has passed
    if (new Date(event.startDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot register for past events"
      });
    }

    // Check if deadline has passed
    if (event.deadline && new Date(event.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Registration deadline has passed"
      });
    }

    // Check if student already registered (pending or approved)
    const existingRegistration = await PaymentSlip.findOne({
      eventId,
      studentId,
      status: { $in: ["pending", "approved"] }
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: `You have already registered for this event. Registration status: ${existingRegistration.status}`
      });
    }

    // Upload slip image to Cloudinary
    let slipImageUrl = "";
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.path, "payment-slips");
        slipImageUrl = uploadResult.url;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: "Failed to upload payment slip image",
          error: uploadError.message,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment slip image is required"
      });
    }

    // Generate temporary codes
    const tempTicketCode = generateTicketCode();
    const tempTransactionId = generateTransactionId();

    // Create payment slip registration
    const paymentSlip = await PaymentSlip.create({
      eventId,
      studentId,
      bankName,
      amount: Number(amount),
      depositDate: new Date(depositDate),
      slipImageUrl,
      ticketType: ticketType || "regular",
      qty: Number(qty) || 1,
      notes: notes || "",
      status: "pending",
      ticketCode: tempTicketCode,
      transactionId: tempTransactionId,
      paymentStatus: "pending"
    });

    // Populate references for response
    const populatedPaymentSlip = await PaymentSlip.findById(paymentSlip._id)
      .populate("eventId", "title startDate endDate startTime coverImageUrl")
      .populate("studentId", "firstName lastName email studentId");

    res.status(201).json({
      success: true,
      message: "Payment slip submitted successfully. Awaiting approval.",
      data: populatedPaymentSlip
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already registered for this event"
      });
    }
    console.error("Error submitting payment slip:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// STUDENT: Get my payment slip registrations
export const getMyPaymentSlips = async (req, res) => {
  try {
    const studentId = req.user._id;

    const paymentSlips = await PaymentSlip.find({ studentId })
      .populate("eventId", "title startDate endDate startTime coverImageUrl venue meetLink isOnline")
      .sort({ createdAt: -1 });

    // Format response - only show QR code for approved registrations
    const formattedSlips = paymentSlips.map(slip => ({
      ...slip.toObject(),
      qrCodeDataUrl: slip.status === "approved" ? slip.qrCodeDataUrl : null,
      ticketCode: slip.status === "approved" ? slip.ticketCode : null
    }));

    res.status(200).json({
      success: true,
      count: paymentSlips.length,
      data: formattedSlips
    });
  } catch (error) {
    console.error("Error fetching payment slips:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// STUDENT: Get single payment slip details
export const getPaymentSlipDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const paymentSlip = await PaymentSlip.findById(id)
      .populate("eventId", "title startDate endDate startTime endTime venue address isOnline meetLink capacity coverImageUrl")
      .populate("studentId", "firstName lastName email phone studentId faculty")
      .populate("reviewedBy", "firstName lastName email")
      .populate("checkedInBy", "firstName lastName email");

    if (!paymentSlip) {
      return res.status(404).json({
        success: false,
        message: "Payment slip not found"
      });
    }

    // Check authorization: student can view their own
    if (paymentSlip.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.status(200).json({
      success: true,
      data: paymentSlip
    });
  } catch (error) {
    console.error("Error fetching payment slip details:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// STUDENT: Update pending payment slip
export const updatePaymentSlip = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankName, amount, depositDate, ticketType, qty, notes } = req.body;

    const paymentSlip = await PaymentSlip.findById(id);
    if (!paymentSlip) {
      return res.status(404).json({
        success: false,
        message: "Payment slip not found"
      });
    }

    // Check if student owns this slip
    if (paymentSlip.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Only allow update if pending
    if (paymentSlip.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot update registration that is ${paymentSlip.status}`
      });
    }

    // Update fields
    if (bankName) paymentSlip.bankName = bankName;
    if (amount) paymentSlip.amount = Number(amount);
    if (depositDate) paymentSlip.depositDate = new Date(depositDate);
    if (ticketType) paymentSlip.ticketType = ticketType;
    if (qty) paymentSlip.qty = Number(qty);
    if (notes !== undefined) paymentSlip.notes = notes;

    // Update slip image if new file uploaded
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.path, "payment-slips");
        paymentSlip.slipImageUrl = uploadResult.url;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: "Failed to upload new payment slip image",
        });
      }
    }

    await paymentSlip.save();

    res.status(200).json({
      success: true,
      message: "Payment slip updated successfully",
      data: paymentSlip
    });
  } catch (error) {
    console.error("Error updating payment slip:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// STUDENT: Cancel pending payment slip registration
export const cancelPaymentSlip = async (req, res) => {
  try {
    const { id } = req.params;

    const paymentSlip = await PaymentSlip.findById(id);
    if (!paymentSlip) {
      return res.status(404).json({
        success: false,
        message: "Payment slip not found"
      });
    }

    // Check if student owns this slip
    if (paymentSlip.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Only allow cancellation of pending registrations
    if (paymentSlip.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel registration that is ${paymentSlip.status}`
      });
    }

    await paymentSlip.deleteOne();

    res.status(200).json({
      success: true,
      message: "Registration cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling payment slip:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ==================== ORGANIZER/ADMIN FUNCTIONS ====================

// ADMIN: Get ALL payment slips across all events (admin dashboard)
export const getAllPaymentSlips = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const { status, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const paymentSlips = await PaymentSlip.find(filter)
      .populate("eventId", "title startDate endDate coverImageUrl")
      .populate("studentId", "firstName lastName email studentId faculty phone")
      .populate("reviewedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await PaymentSlip.countDocuments(filter);
    const stats = {
      total: await PaymentSlip.countDocuments({}),
      pending: await PaymentSlip.countDocuments({ status: "pending" }),
      approved: await PaymentSlip.countDocuments({ status: "approved" }),
      rejected: await PaymentSlip.countDocuments({ status: "rejected" }),
    };

    res.status(200).json({
      success: true,
      count: paymentSlips.length,
      total,
      stats,
      data: paymentSlips
    });
  } catch (error) {
    console.error("Error fetching all payment slips:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ADMIN/ORGANIZER: Get all payment slips for an event
export const getEventPaymentSlips = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check authorization
    if (req.user.role !== "admin" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view registrations for this event"
      });
    }

    // Get all payment slips for this event
    const paymentSlips = await PaymentSlip.find({ eventId })
      .populate("studentId", "firstName lastName email studentId faculty phone")
      .populate("reviewedBy", "firstName lastName email")
      .populate("checkedInBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      total: paymentSlips.length,
      pending: paymentSlips.filter(slip => slip.status === "pending").length,
      approved: paymentSlips.filter(slip => slip.status === "approved").length,
      rejected: paymentSlips.filter(slip => slip.status === "rejected").length,
      checkedIn: paymentSlips.filter(slip => slip.checkedIn).length,
      totalAmount: paymentSlips
        .filter(slip => slip.status === "approved")
        .reduce((sum, slip) => sum + (slip.amount * slip.qty), 0)
    };

    res.status(200).json({
      success: true,
      count: paymentSlips.length,
      stats,
      data: paymentSlips
    });
  } catch (error) {
    console.error("Error fetching event payment slips:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ADMIN/ORGANIZER: Get all attendees (approved registrations) for an event
export const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if user is authorized
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (req.user.role !== "admin" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view attendees for this event"
      });
    }

    const attendees = await PaymentSlip.find({
      eventId,
      status: "approved"
    })
      .populate("studentId", "firstName lastName email studentId faculty phone")
      .populate("checkedInBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: attendees.length,
      data: attendees,
      eventInfo: {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        capacity: event.capacity,
        checkedInCount: attendees.filter(a => a.checkedIn).length
      }
    });
  } catch (error) {
    console.error("Error fetching event attendees:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ADMIN/ORGANIZER: Approve payment slip and generate QR code
export const approvePaymentSlip = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, verificationMessage } = req.body || {}; // ✅ Fix: Handle empty body

    const paymentSlip = await PaymentSlip.findById(id);
    if (!paymentSlip) {
      return res.status(404).json({
        success: false,
        message: "Payment slip not found"
      });
    }

    // Check if already processed
    if (paymentSlip.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This registration has already been ${paymentSlip.status}`
      });
    }

    // Check authorization
    const event = await Event.findById(paymentSlip.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (req.user.role !== "admin" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to approve this registration"
      });
    }

    // Check capacity before approving
    if (event.capacity) {
      const approvedCount = await PaymentSlip.countDocuments({
        eventId: paymentSlip.eventId,
        status: "approved"
      });

      if (approvedCount + paymentSlip.qty > event.capacity) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve: Would exceed event capacity of ${event.capacity}`
        });
      }
    }

    // Generate final ticket code and QR code
    const finalTicketCode = generateTicketCode();
    const finalTransactionId = generateTransactionId();

    // Create QR code payload with registration details
    const qrPayload = JSON.stringify({
      registrationId: paymentSlip._id,
      eventId: paymentSlip.eventId,
      eventTitle: event.title,
      studentId: paymentSlip.studentId,
      ticketCode: finalTicketCode,
      transactionId: finalTransactionId,
      ticketType: paymentSlip.ticketType,
      qty: paymentSlip.qty,
      registrationType: "slip",
      approvedAt: new Date().toISOString(),
      approvedBy: req.user._id
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H'
    });

    // Update payment slip with QR code and final details
    paymentSlip.status = "approved";
    paymentSlip.reviewedBy = req.user._id;
    paymentSlip.reviewedAt = new Date();

    // Handle notes - works whether provided or not
    if (notes) {
      paymentSlip.notes = notes;
    }

    // Add verification message if provided
    if (verificationMessage) {
      paymentSlip.notes = paymentSlip.notes
        ? `${paymentSlip.notes}\nVerification: ${verificationMessage}`
        : `Verification: ${verificationMessage}`;
    } else if (!notes) {
      // Default message if no notes or verification message provided
      paymentSlip.notes = `Payment verified successfully. Amount: LKR ${paymentSlip.amount}`;
    }

    paymentSlip.ticketCode = finalTicketCode;
    paymentSlip.transactionId = finalTransactionId;
    paymentSlip.qrCodeDataUrl = qrCodeDataUrl;
    paymentSlip.paymentStatus = "paid";
    paymentSlip.paidAt = new Date();

    await paymentSlip.save();

    // Populate for response
    const populatedPaymentSlip = await PaymentSlip.findById(paymentSlip._id)
      .populate("eventId", "title startDate endDate startTime venue meetLink isOnline")
      .populate("studentId", "firstName lastName email studentId faculty")
      .populate("reviewedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message: `✅ Payment verified successfully! Ticket generated for ${populatedPaymentSlip.studentId.firstName} ${populatedPaymentSlip.studentId.lastName}`,
      data: {
        registration: populatedPaymentSlip,
        verification: {
          status: "approved",
          amount: paymentSlip.amount,
          ticketCode: finalTicketCode,
          transactionId: finalTransactionId,
          verifiedBy: `${req.user.firstName} ${req.user.lastName}`,
          verifiedAt: new Date()
        }
      }
    });
  } catch (error) {
    console.error("Error approving payment slip:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ADMIN/ORGANIZER: Reject payment slip
export const rejectPaymentSlip = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, notes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }

    const paymentSlip = await PaymentSlip.findById(id);
    if (!paymentSlip) {
      return res.status(404).json({
        success: false,
        message: "Payment slip not found"
      });
    }

    // Check if already processed
    if (paymentSlip.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This registration has already been ${paymentSlip.status}`
      });
    }

    // Check authorization
    const event = await Event.findById(paymentSlip.eventId);
    if (req.user.role !== "admin" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to reject this registration"
      });
    }

    // Update payment slip status
    paymentSlip.status = "rejected";
    paymentSlip.rejectionReason = rejectionReason;
    paymentSlip.reviewedBy = req.user._id;
    paymentSlip.reviewedAt = new Date();
    if (notes) paymentSlip.notes = notes;

    await paymentSlip.save();

    res.status(200).json({
      success: true,
      message: "Payment slip rejected successfully",
      data: paymentSlip
    });
  } catch (error) {
    console.error("Error rejecting payment slip:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ADMIN/ORGANIZER: Check-in attendee via QR code
export const checkInAttendee = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: "QR code data is required"
      });
    }

    let parsedData;
    try {
      parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR code format"
      });
    }

    const { registrationId, ticketCode, eventId } = parsedData;

    // Find registration
    const registration = await PaymentSlip.findById(registrationId)
      .populate("eventId", "title startDate createdBy")
      .populate("studentId", "firstName lastName email studentId");

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found"
      });
    }

    // Verify ticket code matches
    if (registration.ticketCode !== ticketCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket code"
      });
    }

    // Check if registration is approved
    if (registration.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: `Registration is ${registration.status}. Cannot check in.`
      });
    }

    // Check if already checked in
    if (registration.checkedIn) {
      return res.status(400).json({
        success: false,
        message: `Already checked in at ${new Date(registration.checkedInAt).toLocaleString()}`
      });
    }

    // Check authorization
    const event = registration.eventId;
    if (req.user.role !== "admin" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to check in attendees for this event"
      });
    }

    // Update check-in status
    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.checkedInBy = req.user._id;
    await registration.save();

    res.status(200).json({
      success: true,
      message: "Successfully checked in",
      data: {
        studentName: `${registration.studentId.firstName} ${registration.studentId.lastName}`,
        studentEmail: registration.studentId.email,
        studentId: registration.studentId.studentId,
        eventTitle: event.title,
        ticketType: registration.ticketType,
        qty: registration.qty,
        checkedInAt: registration.checkedInAt
      }
    });
  } catch (error) {
    console.error("Error checking in attendee:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ADMIN/ORGANIZER: Regenerate QR code for approved registration
export const regenerateQRCode = async (req, res) => {
  try {
    const { id } = req.params;

    const paymentSlip = await PaymentSlip.findById(id);
    if (!paymentSlip) {
      return res.status(404).json({
        success: false,
        message: "Payment slip not found"
      });
    }

    if (paymentSlip.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "QR code can only be regenerated for approved registrations"
      });
    }

    // Check authorization
    const event = await Event.findById(paymentSlip.eventId);
    if (req.user.role !== "admin" && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to regenerate QR code"
      });
    }

    // Generate new QR code
    const qrPayload = JSON.stringify({
      registrationId: paymentSlip._id,
      eventId: paymentSlip.eventId,
      eventTitle: event.title,
      studentId: paymentSlip.studentId,
      ticketCode: paymentSlip.ticketCode,
      transactionId: paymentSlip.transactionId,
      ticketType: paymentSlip.ticketType,
      qty: paymentSlip.qty,
      registrationType: "slip",
      regeneratedAt: new Date().toISOString(),
      regeneratedBy: req.user._id
    });

    const newQRCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H'
    });

    paymentSlip.qrCodeDataUrl = newQRCodeDataUrl;
    await paymentSlip.save();

    res.status(200).json({
      success: true,
      message: "QR code regenerated successfully",
      qrCodeDataUrl: newQRCodeDataUrl
    });
  } catch (error) {
    console.error("Error regenerating QR code:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// Add to paymentSlipController.js
export const downloadQRCode = async (req, res) => {
  try {
    const { id } = req.params;

    const paymentSlip = await PaymentSlip.findById(id);
    if (!paymentSlip) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Check if student owns this registration
    if (paymentSlip.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (paymentSlip.status !== "approved") {
      return res.status(400).json({ message: "QR code not available yet" });
    }

    // Remove the data:image/png;base64, prefix to get pure base64
    const base64Data = paymentSlip.qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${paymentSlip.ticketCode}.png`);
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};