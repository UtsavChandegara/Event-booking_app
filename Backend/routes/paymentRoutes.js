const express = require("express");
const auth = require("../middleware/authMiddleware");
const paymentController = require("../controllers/paymentController");

const router = express.Router();

// @route   POST /api/payments/create
// @desc    Create a Razorpay order
// @access  Private
router.post("/create", auth, paymentController.createPayment);

// @route   POST /api/payments/verify
// @desc    Verify a Razorpay payment and create booking
// @access  Private
router.post("/verify", auth, paymentController.verifyPayment);

// @route   GET /api/payments/:paymentId
// @desc    Get payment status
// @access  Private
router.get("/:paymentId", auth, paymentController.getPaymentStatus);

module.exports = router;
