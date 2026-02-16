const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seats: [
      {
        row: Number,
        seat: Number,
      },
    ],
    // Current no-payment flow uses tickets/totalPrice.
    tickets: {
      type: Number,
      required: true,
      min: 1,
    },
    // Keep quantity for backward compatibility with older records/logic.
    quantity: {
      type: Number,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Legacy payment field; not required in direct-booking mode.
    totalAmount: {
      type: Number,
    },
    stripeCheckoutSessionId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Prevent duplicate bookings for the same payment session when present
bookingSchema.index(
  { stripeCheckoutSessionId: 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
