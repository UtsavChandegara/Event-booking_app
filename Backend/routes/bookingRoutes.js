const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const auth = require("../middleware/authMiddleware");
// This route is for a non-payment based booking, can be deprecated or kept for other purposes
// router.post("/", auth, bookingController.createBooking);
router.get("/", auth, bookingController.getUserBookings);
router.delete("/:bookingId", auth, bookingController.cancelBooking);

// @route   POST /api/bookings/checkout-session
// @desc    Create a stripe checkout session
// @access  Private
router.post("/checkout-session", auth, bookingController.createCheckoutSession);

// @route   POST /api/bookings/success
// @desc    Verify payment and create booking after successful Stripe checkout
// @access  Private
router.post("/success", auth, bookingController.verifyPaymentAndCreateBooking);

module.exports = router;
