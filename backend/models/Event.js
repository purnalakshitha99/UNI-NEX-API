import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Ticket name is required"],
      trim: true,
    },
    price: {
      type: Number,
      min: [0, "Ticket price cannot be negative"],
      default: 0,
    },
    qty: {
      type: Number,
      min: [0, "Ticket quantity cannot be negative"],
      default: null,
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Event category is required"],
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      default: null,
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      trim: true,
    },
    endTime: {
      type: String,
      default: "",
      trim: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    venue: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    meetLink: {
      type: String,
      trim: true,
      default: "",
    },
    capacity: {
      type: Number,
      min: [1, "Capacity must be at least 1"],
      default: null,
    },
    deadline: {
      type: Date,
      default: null,
    },
    visibility: {
      type: String,
      enum: ["public", "private", "invite-only"],
      default: "public",
    },
    tickets: {
      type: [ticketSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    coverImageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
