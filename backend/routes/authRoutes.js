import express from "express";
import {
  requiredSignIn,
  isAdmin,
} from "../middleware/authMiddleware.js";
import {
  registerUser,
  loginUser,
  getAllStudents,
  getAllOrganizers,
  logoutUser,
  updateUserProfile,
  viewUserProfile,
  verifyEmail,
  getAllUsers,
  deleteUser
} from "../controllers/authController.js";

const router = express.Router();

// Register route
router.post("/register", registerUser);

// Login route
router.post("/login", loginUser);

// Email verification route
router.get("/verify-email/:token", verifyEmail);

//get all students - admin
router.get("/students", requiredSignIn, isAdmin, getAllStudents);

//get all organizers - admin
router.get("/organizers", requiredSignIn, isAdmin, getAllOrganizers);

//get all users - admin
router.get("/all-users", requiredSignIn, isAdmin, getAllUsers);

//delete user - admin
router.delete("/delete-user/:id", requiredSignIn, isAdmin, deleteUser);

//logout function 
router.post("/logout", requiredSignIn, logoutUser);

//update user profile
router.put("/update-profile", requiredSignIn, updateUserProfile);

// view user profile
router.get("/profile", requiredSignIn, viewUserProfile);

export default router;
