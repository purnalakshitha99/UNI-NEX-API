// models/PaymentSlip.js
import mongoose from "mongoose";

const paymentSlipSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
      index: true,
    },
    bankName: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    depositDate: {
      type: Date,
      required: [true, "Deposit date is required"],
    },
    slipImageUrl: {
      type: String,
      required: [true, "Payment slip image is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    ticketType: {
      type: String,
      default: "regular",
      trim: true,
    },
    qty: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    // QR Code related fields
    ticketCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    qrCodeDataUrl: {
      type: String,
      default: "",
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paidAt: {
      type: Date,
      default: null,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Static methods
paymentSlipSchema.statics.generateTicketCode = function() {
  return `SLIP-${Math.random().toString(36).slice(2, 10).toUpperCase()}-${Date.now().toString().slice(-6)}`;
};

paymentSlipSchema.statics.generateTransactionId = function() {
  return `SLIP-TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

// Instance methods
paymentSlipSchema.methods.getTotalAmount = function() {
  return this.amount * this.qty;
};

paymentSlipSchema.methods.canCheckIn = function() {
  return this.status === "approved" && !this.checkedIn;
};

paymentSlipSchema.methods.markAsCheckedIn = async function(checkedInBy) {
  this.checkedIn = true;
  this.checkedInAt = new Date();
  this.checkedInBy = checkedInBy;
  return await this.save();
};

// Virtual fields
paymentSlipSchema.virtual('totalAmount').get(function() {
  return this.amount * this.qty;
});

paymentSlipSchema.virtual('checkInStatus').get(function() {
  if (this.checkedIn) return 'Checked In';
  if (this.status === 'approved') return 'Not Checked In';
  return 'N/A';
});

paymentSlipSchema.virtual('isExpired').get(function() {
  // Add expiration logic if needed (e.g., 7 days after event)
  return false;
});

// Compound index to prevent duplicate registrations
paymentSlipSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

// Index for efficient queries
paymentSlipSchema.index({ status: 1, createdAt: -1 });
paymentSlipSchema.index({ eventId: 1, status: 1 });
paymentSlipSchema.index({ studentId: 1, status: 1 });

// Pre-save middleware
paymentSlipSchema.pre('save', function(next) {
  // Auto-generate ticket code if not present
  if (!this.ticketCode && this.status === 'approved') {
    this.ticketCode = this.constructor.generateTicketCode();
  }
  
  // Auto-generate transaction ID if not present
  if (!this.transactionId && this.status === 'approved') {
    this.transactionId = this.constructor.generateTransactionId();
  }
  
  // Set paidAt when payment status becomes paid
  if (this.paymentStatus === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
});

// Post-save middleware for logging or notifications
paymentSlipSchema.post('save', function(doc) {
  if (doc.status === 'approved' && doc.wasApproved) {
    // Could trigger email notification here
    console.log(`Registration ${doc._id} was approved`);
  }
});

const PaymentSlip = mongoose.model("PaymentSlip", paymentSlipSchema);
export default PaymentSlip;