const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware"); // Assuming this file exists

// All routes in this file are protected and require a logged-in user.
// The authMiddleware should attach the user's ID to req.user.userId.
router.use(authMiddleware);

// GET /api/users/profile - Get current user's profile
router.get("/profile", userController.getProfile);

// PUT /api/users/profile - Update current user's profile
router.put("/profile", userController.updateProfile);

// PUT /api/users/change-password - Change current user's password
router.put("/change-password", userController.changePassword);

// GET /api/users/bookings - Get all bookings for the current user
router.get("/bookings", userController.getUserBookings);

module.exports = router;
