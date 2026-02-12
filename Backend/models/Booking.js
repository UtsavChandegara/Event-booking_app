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
    quantity: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    stripeCheckoutSessionId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Prevent duplicate bookings for the same payment session
bookingSchema.index({ stripeCheckoutSessionId: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
