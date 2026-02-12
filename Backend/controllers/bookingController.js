const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const User = require("../models/User");

const bookingController = {
  /* This is the old booking creation logic without payment.
     It's incompatible with the new Booking model that requires a Stripe session ID.
     Keeping it here for reference, but it should not be used.
  createBooking: async (req, res) => { ... },
  */

  // Stripe-based booking flow
  createCheckoutSession: async (req, res) => {
    try {
      const { eventId, seats, quantity } = req.body;

      // 1. Get event and user from DB
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // 2. Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        success_url: `http://127.0.0.1:5501/Frontend/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://127.0.0.1:5501/Frontend/event-details.html?id=${eventId}`,
        customer_email: user.email,
        client_reference_id: eventId,
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: `${event.title} - Ticket(s)`,
                description: `Seats: ${seats.map((s) => `R${s.row}S${s.seat}`).join(", ")}`,
              },
              unit_amount: event.price * 100, // Price in paise/cents
            },
            quantity: quantity,
          },
        ],
        // Store booking details in metadata to retrieve after successful payment
        metadata: {
          eventId,
          userId: req.user.userId,
          seats: JSON.stringify(seats),
          quantity,
        },
      });

      res.status(200).json({ url: session.url });
    } catch (error) {
      console.error("Stripe session error:", error);
      res.status(500).json({ error: "Could not initiate payment session" });
    }
  },

  verifyPaymentAndCreateBooking: async (req, res) => {
    try {
      const { session_id } = req.body;

      const existingBooking = await Booking.findOne({
        stripeCheckoutSessionId: session_id,
      });
      if (existingBooking) {
        return res.status(200).json({ message: "Booking already confirmed." });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid") {
        const { eventId, userId, seats, quantity } = session.metadata;

        await Booking.create({
          event: eventId,
          user: userId,
          seats: JSON.parse(seats),
          quantity: Number(quantity),
          totalAmount: session.amount_total / 100,
          stripeCheckoutSessionId: session_id,
        });

        await Event.findByIdAndUpdate(eventId, {
          $inc: { bookedTickets: Number(quantity) },
          $push: { bookedSeats: { $each: JSON.parse(seats) } },
        });

        res.status(200).json({ message: "Booking successful!" });
      } else {
        res.status(400).json({ error: "Payment not successful." });
      }
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(500).json({ error: "Could not create booking." });
    }
  },

  // 3. Get User Bookings (for Dashboard)
  getUserBookings: async (req, res) => {
    try {
      const bookings = await Booking.find({ user: req.user.userId }).populate(
        "event",
      );
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  },

  // 4. Cancel a booking (for the user who made it)
  cancelBooking: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Authorization: Ensure the user owns the booking
      if (booking.user.toString() !== req.user.userId) {
        return res.status(401).json({ error: "User not authorized" });
      }

      // Find the event to update its bookedTickets count and release seats
      const event = await Event.findById(booking.event);
      if (event) {
        await Event.updateOne(
          { _id: booking.event },
          {
            $inc: { bookedTickets: -booking.quantity },
            $pull: { bookedSeats: { $in: booking.seats } },
          },
        );
      }

      // Note: This does not issue a refund via Stripe. It only deletes the booking record.
      await booking.deleteOne();

      res.json({ success: true, message: "Booking canceled successfully" });
    } catch (error) {
      console.error("Cancel Booking Error:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  },
};

module.exports = bookingController;
