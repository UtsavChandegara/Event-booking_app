const Event = require("../models/Event");
const Booking = require("../models/Booking");
const User = require("../models/User");

const adminController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const totalEvents = await Event.countDocuments();
      const totalBookings = await Booking.countDocuments();
      const totalUsers = await User.countDocuments({ role: "user" });
      const totalRevenue = await Booking.aggregate([
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);

      const activeUsers = await Booking.distinct("user");

      res.json({
        totalEvents,
        totalBookings,
        totalUsers,
        activeUsers: activeUsers.length,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get all events with booking statistics
  getAllEventsWithStats: async (req, res) => {
    try {
      // Use an aggregation pipeline for much better performance than N+1 queries.
      const eventsWithStats = await Event.aggregate([
        {
          $lookup: {
            from: "bookings", // The name of the bookings collection in MongoDB
            localField: "_id",
            foreignField: "event",
            as: "bookings",
          },
        },
        {
          $lookup: {
            from: "users", // The name of the users collection
            localField: "createdBy",
            foreignField: "_id",
            as: "creatorInfo",
          },
        },
        {
          $addFields: {
            bookedTickets: { $sum: "$bookings.tickets" },
            totalBookingsCount: { $size: "$bookings" },
            // Use $first to get the single creator object from the array
            createdBy: { $first: "$creatorInfo" },
          },
        },
        {
          $addFields: {
            availableTickets: {
              $subtract: ["$totalTickets", "$bookedTickets"],
            },
          },
        },
        {
          // Reshape the createdBy field and remove temporary fields
          $project: {
            bookings: 0,
            creatorInfo: 0,
            "createdBy.password": 0, // Ensure password is not sent
            "createdBy.resetPasswordToken": 0,
            "createdBy.resetPasswordExpires": 0,
          },
        },
      ]);
      res.json(eventsWithStats);
    } catch (error) {
      console.error("Error fetching events with stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get all bookings with details
  getAllBookingsWithDetails: async (req, res) => {
    try {
      const bookings = await Booking.find()
        .populate("user", "username email")
        .populate("event", "title date location");

      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update event (admin can edit any event)
  updateEvent: async (req, res) => {
    try {
      const { title, date, location, description, price, totalTickets } =
        req.body;
      const eventId = req.params.id;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Update fields
      if (title) event.title = title;
      if (date) event.date = date;
      if (location) event.location = location;
      if (description) event.description = description;
      if (price) event.price = price;
      if (totalTickets !== undefined) event.totalTickets = totalTickets;

      await event.save();
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete any event (admin privilege)
  deleteEvent: async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Delete all bookings associated with this event
      await Booking.deleteMany({ event: req.params.id });

      await event.deleteOne();

      res.json({ message: "Event and all associated bookings removed" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Cancel any booking (admin privilege)
  cancelBooking: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Find the event to update its bookedTickets count
      const event = await Event.findById(booking.event);
      if (event) {
        event.bookedTickets = Math.max(
          0,
          (event.bookedTickets || 0) - booking.tickets,
        );
        await event.save();
      }

      await booking.deleteOne();

      res.json({ message: "Booking canceled successfully" });
    } catch (error) {
      console.error("Error canceling booking:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get booking details for an event
  getEventBookings: async (req, res) => {
    try {
      const eventId = req.params.eventId;

      const bookings = await Booking.find({ event: eventId })
        .populate("user", "username email")
        .populate("event", "title");

      const totalTickets = bookings.reduce(
        (sum, booking) => sum + booking.tickets,
        0,
      );

      res.json({
        bookings,
        totalTickets,
        totalBookings: bookings.length,
      });
    } catch (error) {
      console.error("Error fetching event bookings:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get all active users (users who have made at least one booking)
  getActiveUsers: async (req, res) => {
    try {
      const activeUsers = await Booking.aggregate([
        {
          $group: {
            _id: "$user",
            bookingCount: { $sum: 1 },
            totalSpent: { $sum: "$totalPrice" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: "$userDetails",
        },
        {
          $project: {
            userId: "$_id",
            username: "$userDetails.username",
            email: "$userDetails.email",
            bookingCount: 1,
            totalSpent: 1,
          },
        },
      ]);

      res.json(activeUsers);
    } catch (error) {
      console.error("Error fetching active users:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // --- Organizer Role Management ---

  getOrganizerRequests: async (req, res) => {
    try {
      const requests = await User.find({
        organizerRequestStatus: "pending",
      }).select("username email createdAt");
      res.json(requests);
    } catch (error) {
      console.error("Error fetching organizer requests:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  approveOrganizerRequest: async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.role = "organizer";
      user.organizerRequestStatus = "approved";
      await user.save();

      // TODO: In a real app, you would send an email notification to the user.

      res.json({
        message: `User ${user.username} has been approved as an organizer.`,
      });
    } catch (error) {
      console.error("Error approving organizer request:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  rejectOrganizerRequest: async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.organizerRequestStatus = "rejected";
      await user.save();

      // TODO: In a real app, you would send an email notification to the user.

      res.json({
        message: `User ${user.username}'s request has been rejected.`,
      });
    } catch (error) {
      console.error("Error rejecting organizer request:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = adminController;
