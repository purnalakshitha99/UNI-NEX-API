import mongoose from "mongoose";

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ticketName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: "card",
      trim: true,
    },
    paymentBankName: {
      type: String,
      default: "",
      trim: true,
    },
    paymentCardLast4: {
      type: String,
      default: "",
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid"],
      default: "paid",
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    qrCodeDataUrl: {
      type: String,
      required: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    attendanceMarked: {
      type: Boolean,
      default: false,
    },
    attendanceMarkedAt: {
      type: Date,
      default: null,
    },
    attendanceMarkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

eventRegistrationSchema.index({ event: 1, student: 1 }, { unique: true });

const EventRegistration = mongoose.model("EventRegistration", eventRegistrationSchema);
export default EventRegistration;
