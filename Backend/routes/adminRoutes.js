const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const checkAdmin = require("../middleware/checkAdmin");
const adminController = require("../controllers/adminController");

// All admin routes require authentication and admin role
router.use(auth, checkAdmin);

// Dashboard stats
router.get("/stats", adminController.getDashboardStats);

// Event management
router.get("/events", adminController.getAllEventsWithStats);
router.put("/events/:id", adminController.updateEvent);
router.delete("/events/:id", adminController.deleteEvent);

// Booking management
router.get("/bookings", adminController.getAllBookingsWithDetails);
router.delete("/bookings/:bookingId", adminController.cancelBooking);

// Event-specific bookings
router.get("/events/:eventId/bookings", adminController.getEventBookings);

// Active users
router.get("/users/active", adminController.getActiveUsers);

// Organizer Role Management
router.get("/organizer-requests", adminController.getOrganizerRequests);
router.post(
  "/organizer-requests/:userId/approve",
  adminController.approveOrganizerRequest,
);
router.post(
  "/organizer-requests/:userId/reject",
  adminController.rejectOrganizerRequest,
);

module.exports = router;
