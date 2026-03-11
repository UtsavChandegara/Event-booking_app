const mongoose = require("mongoose");

const experienceCardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      unique: true,
      index: true,
    },
    entryLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EntryLog",
      required: true,
      index: true,
    },
    cardId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mood: {
      type: String,
      enum: ["INCREDIBLE", "LOVED_IT", "GOOD", "AVERAGE", "DISAPPOINTING"],
      required: true,
      index: true,
    },
    scene: {
      type: String,
      enum: [
        "STAGE_HERO",
        "CROWD_CELEBRATION",
        "NEON_POSTER",
        "BACKSTAGE_PASS",
        "FESTIVAL_HOLO",
      ],
      required: true,
      index: true,
    },
    stylePrompt: {
      type: String,
      default: "",
      maxlength: 120,
    },
    backgroundImageUrl: {
      type: String,
      default: "",
    },
    userSelfieUrl: {
      type: String,
      default: "",
    },
    venueReferenceImageUrls: {
      type: [String],
      default: [],
    },
    generationSource: {
      type: String,
      enum: ["comfyui", "event-reference", "fallback-theme"],
      default: "fallback-theme",
    },
    aiPrompt: {
      type: String,
      default: "",
    },
    rarity: {
      type: String,
      enum: ["COMMON", "RARE", "EPIC", "LEGENDARY"],
      required: true,
      default: "COMMON",
      index: true,
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isShared: {
      type: Boolean,
      default: false,
      index: true,
    },
    sharedAt: {
      type: Date,
      default: null,
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    unlockedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

experienceCardSchema.index({ user: 1, event: 1, createdAt: -1 });

module.exports = mongoose.model("ExperienceCard", experienceCardSchema);
