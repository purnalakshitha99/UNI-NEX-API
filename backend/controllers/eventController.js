import Event from "../models/Event.js";
import QRCode from "qrcode";
import EventRegistration from "../models/EventRegistration.js";

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const parseJsonIfNeeded = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseQrPayload = (qrContent) => {
  if (!qrContent || typeof qrContent !== "string") return null;

  const normalized = qrContent.trim();

  try {
    const parsed = JSON.parse(normalized);
    return typeof parsed === "object" ? parsed : null;
  } catch {
    // continue to URI-decoding fallback
  }

  try {
    const decoded = decodeURIComponent(normalized);
    const parsed = JSON.parse(decoded);
    return typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim().toLowerCase())
      .filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
};

const normalizeTickets = (tickets) => {
  if (!Array.isArray(tickets)) return [];

  return tickets
    .map((ticket) => ({
      name: String(ticket?.name || "").trim(),
      price:
        ticket?.price === "" || ticket?.price == null
          ? 0
          : Number(ticket.price),
      qty:
        ticket?.qty === "" || ticket?.qty == null
          ? null
          : Number(ticket.qty),
    }))
    .filter((ticket) => ticket.name);
};

const generateTransactionId = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const generateTicketCode = () => `EVT-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;

// CREATE EVENT - organizer/admin
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      startDate,
      endDate,
      startTime,
      endTime,
      isOnline,
      venue,
      address,
      meetLink,
      capacity,
      deadline,
      visibility,
      tickets,
      tags,
      coverImageUrl,
    } = req.body;

    const onlineEvent = parseBoolean(isOnline, false);
    const parsedTickets = normalizeTickets(parseJsonIfNeeded(tickets, []));
    const parsedTags = normalizeTags(parseJsonIfNeeded(tags, []));
    const uploadedImageUrl = req.file?.path || req.file?.secure_url || "";

    if (!title || !category || !description || !startDate || !startTime) {
      return res.status(400).json({
        success: false,
        message:
          "Title, category, description, start date, and start time are required",
      });
    }

    if (onlineEvent && !meetLink) {
      return res.status(400).json({
        success: false,
        message: "Meeting link is required for online events",
      });
    }

    if (!onlineEvent && !venue) {
      return res.status(400).json({
        success: false,
        message: "Venue is required for physical events",
      });
    }

    const event = await Event.create({
      title,
      category,
      description,
      startDate,
      endDate: endDate || null,
      startTime,
      endTime: endTime || "",
      isOnline: onlineEvent,
      venue: venue || "",
      address: address || "",
      meetLink: meetLink || "",
      capacity: capacity === "" || capacity == null ? null : Number(capacity),
      deadline: deadline || null,
      visibility: visibility || "public",
      tickets: parsedTickets,
      tags: parsedTags,
      coverImageUrl: uploadedImageUrl || coverImageUrl || "",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Create Event Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating event",
      error: error.message,
    });
  }
};

// UPDATE EVENT - organizer/admin
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const existingEvent = await Event.findById(id);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      existingEvent.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this event",
      });
    }

    const body = req.body;
    const isOnlineValue =
      body.isOnline === undefined
        ? existingEvent.isOnline
        : parseBoolean(body.isOnline, existingEvent.isOnline);

    const updateData = {
      title: body.title ?? existingEvent.title,
      category: body.category ?? existingEvent.category,
      description: body.description ?? existingEvent.description,
      startDate: body.startDate ?? existingEvent.startDate,
      endDate:
        body.endDate === ""
          ? null
          : body.endDate ?? existingEvent.endDate,
      startTime: body.startTime ?? existingEvent.startTime,
      endTime: body.endTime ?? existingEvent.endTime,
      isOnline: isOnlineValue,
      venue: body.venue ?? existingEvent.venue,
      address: body.address ?? existingEvent.address,
      meetLink: body.meetLink ?? existingEvent.meetLink,
      capacity:
        body.capacity === ""
          ? null
          : body.capacity === undefined
          ? existingEvent.capacity
          : Number(body.capacity),
      deadline:
        body.deadline === ""
          ? null
          : body.deadline ?? existingEvent.deadline,
      visibility: body.visibility ?? existingEvent.visibility,
      tickets:
        body.tickets === undefined
          ? existingEvent.tickets
          : normalizeTickets(parseJsonIfNeeded(body.tickets, [])),
      tags:
        body.tags === undefined
          ? existingEvent.tags
          : normalizeTags(parseJsonIfNeeded(body.tags, [])),
      coverImageUrl:
        req.file?.path ||
        req.file?.secure_url ||
        body.coverImageUrl ||
        existingEvent.coverImageUrl,
    };

    if (isOnlineValue && !updateData.meetLink) {
      return res.status(400).json({
        success: false,
        message: "Meeting link is required for online events",
      });
    }

    if (!isOnlineValue && !updateData.venue) {
      return res.status(400).json({
        success: false,
        message: "Venue is required for physical events",
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Update Event Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating event",
      error: error.message,
    });
  }
};

// DELETE EVENT - organizer/admin
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      event.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this event",
      });
    }

    await Event.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete Event Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting event",
      error: error.message,
    });
  }
};

// GET CURRENT USER CREATED EVENTS - organizer/admin
export const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Get My Events Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching events",
      error: error.message,
    });
  }
};

// GET PUBLIC EVENTS - all users
export const getPublicEvents = async (req, res) => {
  try {
    const events = await Event.find({})
      .populate("createdBy", "firstName lastName role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Get Public Events Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching public events",
      error: error.message,
    });
  }
};

// GET SINGLE EVENT - public
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id).populate(
      "createdBy",
      "firstName lastName role"
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Get Event By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching event details",
      error: error.message,
    });
  }
};

// REGISTER EVENT WITH PAYMENT - student
export const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { ticketName, paymentMethod = "card", paymentDetails = {} } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can register for events",
      });
    }

    const existing = await EventRegistration.findOne({
      event: event._id,
      student: req.user._id,
    });

    if (existing) {
      const existingRegistration = await EventRegistration.findById(existing._id)
        .populate("event", "title startDate startTime venue meetLink isOnline coverImageUrl")
        .populate("student", "firstName lastName email");

      return res.status(200).json({
        success: true,
        message: "You are already registered for this event",
        registration: existingRegistration,
      });
    }

    const bankName = String(paymentDetails?.bankName || "").trim();
    const cardHolderName = String(paymentDetails?.cardHolderName || "").trim();
    const cardDigits = String(paymentDetails?.cardNumber || "").replace(/\D/g, "");
    const expiryMonth = String(paymentDetails?.expiryMonth || "").trim();
    const expiryYear = String(paymentDetails?.expiryYear || "").trim();
    const cvv = String(paymentDetails?.cvv || "").trim();

    if (
      !bankName ||
      !cardHolderName ||
      cardDigits.length !== 16 ||
      !/^\d{2}$/.test(expiryMonth) ||
      !/^\d{2}$/.test(expiryYear) ||
      !/^\d{3,4}$/.test(cvv)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid bank and card details are required to continue payment",
      });
    }

    const availableTickets = Array.isArray(event.tickets) ? event.tickets : [];
    const selectedTicket =
      availableTickets.find((ticket) => ticket.name === ticketName) ||
      availableTickets[0] ||
      { name: "General Admission", price: 0, qty: null };

    const paidCountForTicket = await EventRegistration.countDocuments({
      event: event._id,
      ticketName: selectedTicket.name,
    });

    if (
      selectedTicket.qty !== null &&
      selectedTicket.qty !== undefined &&
      paidCountForTicket >= selectedTicket.qty
    ) {
      return res.status(400).json({
        success: false,
        message: `No remaining seats for ${selectedTicket.name}`,
      });
    }

    if (event.capacity) {
      const totalRegistered = await EventRegistration.countDocuments({ event: event._id });
      if (totalRegistered >= event.capacity) {
        return res.status(400).json({
          success: false,
          message: "Event capacity is full",
        });
      }
    }

    const transactionId = generateTransactionId();
    const ticketCode = generateTicketCode();
    const qrPayload = JSON.stringify({
      eventId: event._id,
      eventTitle: event.title,
      studentId: req.user._id,
      ticketCode,
      transactionId,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { width: 320, margin: 1 });

    const registration = await EventRegistration.create({
      event: event._id,
      student: req.user._id,
      ticketName: selectedTicket.name,
      amount: Number(selectedTicket.price || 0),
      paymentMethod,
      paymentBankName: bankName,
      paymentCardLast4: cardDigits.slice(-4),
      transactionId,
      ticketCode,
      qrCodeDataUrl,
      paymentStatus: "paid",
      paidAt: new Date(),
    });

    const populatedRegistration = await EventRegistration.findById(registration._id)
      .populate("event", "title startDate startTime venue meetLink isOnline coverImageUrl")
      .populate("student", "firstName lastName email");

    return res.status(201).json({
      success: true,
      message: "Payment successful. Ticket generated.",
      registration: populatedRegistration,
    });
  } catch (error) {
    console.error("Register For Event Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while processing event registration",
      error: error.message,
    });
  }
};

// GET MY REGISTRATIONS - student
export const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await EventRegistration.find({ student: req.user._id })
      .populate("event", "title startDate startTime venue meetLink isOnline coverImageUrl")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    console.error("Get My Registrations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching registrations",
      error: error.message,
    });
  }
};

// ADMIN: Get all events with card-registration booking counts
export const getAdminAllBookings = async (req, res) => {
  try {
    if (!["admin", "organizer"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Organizer or admin access required" });
    }

    const filter = req.user.role === "admin" ? {} : { createdBy: req.user._id };

    // Fetch visible events for requester role
    const events = await Event.find(filter)
      .populate("createdBy", "firstName lastName email role")
      .sort({ createdAt: -1 });

    // For each event, count registrations (card payments) and slip registrations
    const eventsWithCounts = await Promise.all(
      events.map(async (ev) => {
        const cardCount = await EventRegistration.countDocuments({ event: ev._id });
        return {
          ...ev.toObject(),
          cardBookingCount: cardCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: eventsWithCounts.length,
      events: eventsWithCounts,
    });
  } catch (error) {
    console.error("Admin All Bookings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ADMIN: Get all card registrations for a specific event
export const getAdminEventBookings = async (req, res) => {
  try {
    if (!["admin", "organizer"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Organizer or admin access required" });
    }

    const { eventId } = req.params;

    const event = await Event.findById(eventId).populate("createdBy", "firstName lastName email");
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (
      req.user.role === "organizer" &&
      event.createdBy?._id?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "You can view bookings only for your events" });
    }

    const registrations = await EventRegistration.find({ event: eventId })
      .populate("student", "firstName lastName email studentId faculty phone role")
      .sort({ createdAt: -1 });

    const stats = {
      total: registrations.length,
      totalRevenue: registrations.reduce((sum, r) => sum + (r.amount || 0), 0),
      ticketBreakdown: registrations.reduce((acc, r) => {
        acc[r.ticketName] = (acc[r.ticketName] || 0) + 1;
        return acc;
      }, {}),
    };

    return res.status(200).json({
      success: true,
      event: event.toObject(),
      count: registrations.length,
      stats,
      registrations,
    });
  } catch (error) {
    console.error("Admin Event Bookings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ADMIN: Event attendance summary + student list
export const getAdminEventAttendance = async (req, res) => {
  try {
    if (!["admin", "organizer"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Organizer or admin access required" });
    }

    const { eventId } = req.params;

    const event = await Event.findById(eventId).populate("createdBy", "firstName lastName email");
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (
      req.user.role === "organizer" &&
      event.createdBy?._id?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "You can view attendance only for your events" });
    }

    const registrations = await EventRegistration.find({ event: eventId })
      .populate("student", "firstName lastName email studentId faculty phone")
      .populate("attendanceMarkedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const attendedCount = registrations.filter((r) => r.attendanceMarked).length;

    return res.status(200).json({
      success: true,
      event,
      stats: {
        totalRegistrations: registrations.length,
        attendedCount,
        absentCount: registrations.length - attendedCount,
      },
      registrations,
    });
  } catch (error) {
    console.error("Admin Event Attendance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ADMIN: Scan QR and mark attendance
export const markAttendanceByQr = async (req, res) => {
  try {
    if (!["admin", "organizer"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Organizer or admin access required" });
    }

    const { qrContent, eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Selected event is required for attendance scanning",
      });
    }

    const parsed = parseQrPayload(qrContent);

    const normalizedTicketCode = String(
      parsed?.ticketCode || parsed?.ticket_code || parsed?.ticketId || ""
    ).trim();
    const normalizedTransactionId = String(
      parsed?.transactionId || parsed?.transaction_id || ""
    ).trim();

    if (!normalizedTicketCode && !normalizedTransactionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR payload",
      });
    }

    let registration = null;

    if (normalizedTicketCode) {
      registration = await EventRegistration.findOne({ ticketCode: normalizedTicketCode });

      if (!registration) {
        registration = await EventRegistration.findOne({
          ticketCode: {
            $regex: `^${normalizedTicketCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            $options: "i",
          },
        });
      }
    }

    if (!registration && normalizedTransactionId) {
      registration = await EventRegistration.findOne({ transactionId: normalizedTransactionId });

      if (!registration) {
        registration = await EventRegistration.findOne({
          transactionId: {
            $regex: `^${normalizedTransactionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            $options: "i",
          },
        });
      }
    }

    if (registration) {
      registration = await EventRegistration.findById(registration._id)
      .populate("event", "title startDate startTime venue isOnline")
      .populate("student", "firstName lastName email studentId faculty phone")
      .populate("attendanceMarkedBy", "firstName lastName");
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found for this QR code",
      });
    }

    if (registration.event?._id?.toString() !== String(eventId)) {
      return res.status(400).json({
        success: false,
        message: "This ticket does not belong to the selected event",
        belongsToEventId: registration.event?._id,
        belongsToEventTitle: registration.event?.title || "",
      });
    }

    if (
      req.user.role === "organizer" &&
      !(await Event.exists({ _id: eventId, createdBy: req.user._id }))
    ) {
      return res.status(403).json({
        success: false,
        message: "You can mark attendance only for your events",
      });
    }

    if (parsed?.eventId && String(parsed.eventId) !== registration.event?._id?.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR payload",
      });
    }

    if (parsed?.studentId && String(parsed.studentId) !== registration.student?._id?.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR payload",
      });
    }

    if (registration.attendanceMarked) {
      return res.status(409).json({
        success: false,
        alreadyMarked: true,
        message: "Already scanned for this event",
        registration,
      });
    }

    registration.attendanceMarked = true;
    registration.attendanceMarkedAt = new Date();
    registration.attendanceMarkedBy = req.user._id;
    await registration.save();

    const updated = await EventRegistration.findById(registration._id)
      .populate("event", "title startDate startTime venue isOnline")
      .populate("student", "firstName lastName email studentId faculty phone")
      .populate("attendanceMarkedBy", "firstName lastName");

    return res.status(200).json({
      success: true,
      alreadyMarked: false,
      message: "Attendance marked successfully",
      registration: updated,
    });
  } catch (error) {
    console.error("Mark Attendance By QR Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
