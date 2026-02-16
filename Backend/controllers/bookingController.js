const Booking = require("../models/Booking");
const Event = require("../models/Event");
const User = require("../models/User");

const bookingController = {
  // Simplified booking creation without payment integration
  createBooking: async (req, res) => {
    try {
      const { eventId } = req.body;
      const tickets = Number(req.body.tickets);
      const userId = req.user.userId;

      if (!eventId || !Number.isInteger(tickets) || tickets <= 0) {
        return res
          .status(400)
          .json({ message: "Valid eventId and ticket quantity are required." });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }

      if ((event.bookedTickets || 0) + tickets > event.totalTickets) {
        return res
          .status(400)
          .json({ message: "Not enough tickets available." });
      }

      const totalPrice = event.price * tickets;

      const newBooking = new Booking({
        event: eventId,
        user: userId,
        tickets,
        quantity: tickets, // Backward compatibility with older logic
        totalPrice,
      });

      await newBooking.save();

      // Update event's booked tickets count
      await Event.updateOne(
        { _id: eventId },
        { $inc: { bookedTickets: tickets } },
      );

      res
        .status(201)
        .json({ message: "Booking successful!", booking: newBooking });
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Server error while creating booking." });
    }
  },

  // Get User Bookings (for Dashboard)
  getUserBookings: async (req, res) => {
    try {
      const bookings = await Booking.find({ user: req.user.userId }).populate(
        "event",
      );
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  },

  // Cancel a booking (for the user who made it)
  cancelBooking: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Authorization: Ensure the user owns the booking
      if (booking.user.toString() !== req.user.userId) {
        return res.status(401).json({ message: "User not authorized" });
      }

      // Find the event to update its bookedTickets count and release seats
      const event = await Event.findById(booking.event);
      if (event) {
        const reservedTickets = booking.tickets || booking.quantity || 0;
        await Event.updateOne(
          { _id: booking.event },
          { $inc: { bookedTickets: -reservedTickets } },
        );
      }

      // Note: This does not issue a refund via Stripe. It only deletes the booking record.
      await booking.deleteOne();

      res.json({ success: true, message: "Booking canceled successfully" });
    } catch (error) {
      console.error("Cancel Booking Error:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  },
};

module.exports = bookingController;
