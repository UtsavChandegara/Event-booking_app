const multer = require("multer");
const path = require("path");

// --- Multer Configuration for Image Uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // The destination directory for uploads
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Create a unique filename to prevent overwrites
    cb(null, Date.now() + "-" + file.originalname);
  },
});

module.exports = multer({ storage: storage });
