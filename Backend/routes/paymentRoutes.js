const express = require("express");
const auth = require("../middleware/authMiddleware");
const paymentController = require("../controllers/paymentController");

const router = express.Router();

// @route   POST /api/payments/create
// @desc    Create a dummy payment request
// @access  Private
router.post("/create", auth, paymentController.createPayment);

// @route   POST /api/payments/:paymentId/simulate
// @desc    Simulate dummy payment success/failure
// @access  Private
router.post("/:paymentId/simulate", auth, paymentController.simulatePaymentOutcome);

// @route   GET /api/payments/:paymentId
// @desc    Get payment status
// @access  Private
router.get("/:paymentId", auth, paymentController.getPaymentStatus);

module.exports = router;
