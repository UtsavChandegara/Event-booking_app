const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const auth = require("../middleware/authMiddleware");

// @route   POST /api/bookings
// @desc    Create a booking (no payment)
// @access  Private
router.post("/", auth, bookingController.createBooking);

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get("/", auth, bookingController.getUserBookings);

// @route   DELETE /api/bookings/:bookingId
// @desc    Cancel a booking
// @access  Private
router.delete("/:bookingId", auth, bookingController.cancelBooking);

module.exports = router;
