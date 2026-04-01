import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

// REGISTER
export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      password,
      confirmPassword,
      role,
      studentId,
      faculty,
    } = req.body;

    // Basic required fields
    if (
      !firstName ||
      !lastName ||
      !phone ||
      !email ||
      !password ||
      !confirmPassword ||
      !role
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Require studentId for student & organizer
    if (
      (role === "student" || role === "organizer") &&
      !studentId
    ) {
      return res
        .status(400)
        .json({ message: "Student ID is required for this role" });
    }

    // Require faculty for student & organizer
    if (
      (role === "student" || role === "organizer") &&
      !faculty
    ) {
      return res
        .status(400)
        .json({ message: "Faculty is required for this role" });
    }

    // Check email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Check duplicate studentId
    if (role === "student" || role === "organizer") {
      if (studentId) {
        const studentIdExists = await User.findOne({ studentId });
        if (studentIdExists) {
          return res.status(400).json({ message: "Student ID already exists" });
        }
      }
    }

    const userData = {
      firstName,
      lastName,
      phone,
      email,
      password,
      role,
    };

    if (role === "student" || role === "organizer") {
      userData.studentId = studentId;
      userData.faculty = faculty;
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    userData.verificationToken = verificationToken;
    userData.isVerified = false; // Add this field to User model

    const user = await User.create(userData);

    // Prepare verification URL using environment variable
    const frontendHost = process.env.FRONTEND_URL || `http://localhost:3000`;
    const verificationUrl = `${frontendHost}/verify-email/${verificationToken}`;

    // Send verification email (don't wait for it - send async)
    sendEmail({
      to: user.email,
      subject: "Verify Your Email",
      text: `Hi ${user.firstName}, please verify your email by clicking this link: ${verificationUrl}`,
      html: `<p>Hi ${user.firstName},</p>
             <p>Please verify your email by clicking the link below:</p>
             <a href="${verificationUrl}">Verify Email</a>`,
    }).catch(err => console.error("Email sending failed:", err));

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please check your email to verify your account.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        faculty: user.faculty,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Register Error Details:", error);

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'ID'} already exists`
      });
    }

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error during registration",
      error: error.message
    });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email first" });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        faculty: user.faculty,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login Error Details:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error during login",
      error: error.message
    });
  }
};

//get all students
export const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select("-password");

    res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get all organizers
export const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: "organizer" }).select("-password");

    res.status(200).json({
      success: true,
      count: organizers.length,
      organizers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL USERS - ADMIN
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch users",
      error: error.message 
    });
  }
};

// DELETE USER - ADMIN
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: "You cannot terminate your own administrative session" 
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Target user not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "User account terminated successfully",
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Operation failed",
      error: error.message 
    });
  }
};

//logout function
export const logoutUser = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// UPDATE PHONE NUMBER
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // assuming user is authenticated
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Validate phone number format
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Update only the phone number
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { phone },
      { new: true, runValidators: true } // runValidators ensures phone regex is checked
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Phone number updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
      error: error.message,
    });
  }
};

// VIEW PROFILE
export const viewUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // get user from auth middleware

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("View Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile",
      error: error.message,
    });
  }
};

//verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      const frontendHost = process.env.FRONTEND_URL || `http://localhost:3000`;
      return res.redirect(`${frontendHost}/verify-error?message=Invalid or expired verification token`);
    }

    user.isVerified = true;
    user.verificationToken = undefined; // remove token
    await user.save();

    // Send welcome email (don't wait for it - send async)
    sendEmail({
      to: user.email,
      subject: "Welcome to UNI NEX - Account Verified",
      text: `Hi ${user.firstName},\n\nYour email has been verified successfully!\n\nYou can now log in to your account using your email and password.\n\nLogin URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login\n\nThank you for joining UNI NEX!`,
      html: `<p>Hi ${user.firstName},</p>
             <p>Your email has been verified successfully!</p>
             <p>You can now log in to your account using your email and password.</p>
             <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Click here to log in</a></p>
             <p>Thank you for joining UNI NEX!</p>`,
    }).catch(err => console.error("Welcome email sending failed:", err));

    // Redirect to frontend success page
    const frontendHost = process.env.FRONTEND_URL || `http://localhost:3000`;
    res.redirect(`${frontendHost}/verify-success`);
  } catch (error) {
    console.error("Email Verification Error:", error);
    const frontendHost = process.env.FRONTEND_URL || `http://localhost:3000`;
    res.redirect(`${frontendHost}/verify-error?message=Server error during verification`);
  }
};
