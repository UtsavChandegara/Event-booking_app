const Event = require("../models/Event");
const User = require("../models/User");
const Booking = require("../models/Booking");

exports.createEvent = async (req, res) => {
  try {
    let user = req.user;

    // If req.user is from a lightweight auth middleware (has userId but no role),
    // we need to fetch the full user object to check the role.
    if (user && user.userId && !user.role) {
      user = await User.findById(user.userId);
    }

    // Check if user is authorized to create an event
    if (!user || user.role !== "organizer") {
      return res
        .status(403)
        .json({ message: "Access denied. Only organizers can create events." });
    }

    const {
      title,
      date,
      location,
      description,
      price,
      totalTickets,
      imageUrl,
    } = req.body;

    let finalImageUrl = imageUrl ? imageUrl.trim() : imageUrl;

    if (req.file) {
      finalImageUrl = req.file.path.replace(/\\/g, "/");
    }

    if (!finalImageUrl) {
      return res
        .status(400)
        .json({ message: "Event image is required (upload or URL)." });
    }

    const newEvent = new Event({
      title,
      date,
      location,
      description,
      price,
      totalTickets,
      imageUrl: finalImageUrl,
      createdBy: user.userId || user._id, // Use the id from the user object
    });

    const event = await newEvent.save();
    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Server error while creating event." });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate("createdBy", "username _id");
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getEventBookings = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Authorization check: only event creator or admin can see bookings
    if (
      req.user.role !== "admin" &&
      event.createdBy.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view bookings for this event" });
    }

    // Find all bookings for this event and populate user details
    const bookings = await Booking.find({ event: eventId }).populate(
      "user",
      "username email",
    );

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching event bookings:", error);
    res.status(500).json({ message: "Server error while fetching bookings." });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "createdBy",
      "username _id",
    );
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const {
      title,
      date,
      location,
      description,
      price,
      totalTickets,
      imageUrl,
    } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user is authorized (admin or creator)
    if (
      req.user.role !== "admin" &&
      event.createdBy.toString() !== req.user.userId
    ) {
      return res.status(403).json({ message: "User not authorized" });
    }

    let finalImageUrl = event.imageUrl;
    if (req.file) {
      finalImageUrl = req.file.path.replace(/\\/g, "/");
    } else if (imageUrl) {
      finalImageUrl = imageUrl.trim();
    }

    event.title = title || event.title;
    event.date = date || event.date;
    event.location = location || event.location;
    event.description = description || event.description;
    event.price = price || event.price;
    event.totalTickets = totalTickets || event.totalTickets;
    event.imageUrl = finalImageUrl;

    await event.save();
    res.json(event);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if the user is an admin or the one who created the event
    if (
      req.user.role !== "admin" &&
      event.createdBy.toString() !== req.user.userId
    ) {
      return res.status(401).json({ message: "User not authorized" });
    }

    await event.deleteOne(); // Use deleteOne() for Mongoose v6+

    res.json({ message: "Event removed" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Server error" });
  }
};
