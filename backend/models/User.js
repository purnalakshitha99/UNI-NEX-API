import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Regex for validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: (v) => phoneRegex.test(v),
        message: (props) => `${props.value} is not a valid phone number`,
      },
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: {
        validator: (v) => emailRegex.test(v),
        message: (props) => `${props.value} is not a valid email`,
      },
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    studentId: {
      type: String,
      unique: true,
      sparse: true, // allows null for admin
      required: function () {
        return this.role === "student" || this.role === "organizer";
      },
      trim: true,
    },

    faculty: {
      type: String,
      required: function () {
        return this.role === "student" || this.role === "organizer";
      },
      trim: true,
      enum: [
        "Computing",
        "Engineering",
        "Business",
        "Humanities",
        "Science",
        "Other",
      ], // optional but recommended
    },

    role: {
      type: String,
      enum: ["student", "organizer", "admin"],
      default: "student",
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    verificationToken: {
      type: String,
    }
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return ;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
