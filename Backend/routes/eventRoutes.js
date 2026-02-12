const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use path.join to create an absolute path to the uploads directory
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    // Sanitize filename and make it unique
    cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "_"));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// === Public Routes ===
// Anyone can view events
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);

// === Protected Routes ===
// Only authenticated users can create, update, or delete events
router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  eventController.createEvent,
);
router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  eventController.updateEvent,
);
router.delete("/:id", authMiddleware, eventController.deleteEvent);

// Route to get bookings for a specific event (for organizers/admins)
router.get("/:id/bookings", authMiddleware, eventController.getEventBookings);

module.exports = router;
