const crypto = require("crypto");
const ExperienceCard = require("../models/ExperienceCard");
const EntryLog = require("../models/EntryLog");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const { generateCardScene, buildScenePrompt } = require("../services/cardSceneService");

const MOOD_CONFIG = {
  INCREDIBLE: { label: "Incredible", emoji: "🔥" },
  LOVED_IT: { label: "Loved it", emoji: "🎵" },
  GOOD: { label: "Good", emoji: "🙂" },
  AVERAGE: { label: "Average", emoji: "😐" },
  DISAPPOINTING: { label: "Disappointing", emoji: "👎" },
};

const SCENE_CONFIG = {
  STAGE_HERO: { label: "Stage Hero", theme: "Sunset spotlight" },
  CROWD_CELEBRATION: { label: "Crowd Celebration", theme: "Confetti burst" },
  NEON_POSTER: { label: "Neon Poster", theme: "Neon grid glow" },
  BACKSTAGE_PASS: { label: "Backstage Pass", theme: "Metal pass vibe" },
  FESTIVAL_HOLO: { label: "Festival Holo", theme: "Holographic shimmer" },
};

const RARITY_WEIGHTS = [
  { key: "COMMON", max: 65 },
  { key: "RARE", max: 90 },
  { key: "EPIC", max: 98 },
  { key: "LEGENDARY", max: 100 },
];

const buildCardId = () =>
  `${Math.floor(Math.random() * 90000 + 10000)}-${Date.now().toString(36).toUpperCase()}`;

const chooseRarity = () => {
  const roll = Math.random() * 100;
  return (
    RARITY_WEIGHTS.find((bucket) => roll < bucket.max)?.key || "COMMON"
  );
};

const mapCardDto = (card) => ({
  id: card._id,
  cardId: card.cardId,
  user: card.user,
  event: card.event,
  booking: card.booking,
  ticket: card.ticket,
  mood: card.mood,
  moodLabel: MOOD_CONFIG[card.mood]?.label || card.mood,
  moodEmoji: MOOD_CONFIG[card.mood]?.emoji || "",
  scene: card.scene,
  sceneLabel: SCENE_CONFIG[card.scene]?.label || card.scene,
  sceneTheme: SCENE_CONFIG[card.scene]?.theme || "",
  stylePrompt: card.stylePrompt || "",
  backgroundImageUrl: card.backgroundImageUrl || "",
  userSelfieUrl: card.userSelfieUrl || "",
  venueReferenceImageUrls: card.venueReferenceImageUrls || [],
  generationSource: card.generationSource || "fallback-theme",
  aiPrompt: card.aiPrompt || "",
  rarity: card.rarity,
  shareToken: card.shareToken,
  isShared: card.isShared,
  sharedAt: card.sharedAt,
  shareCount: card.shareCount,
  viewCount: card.viewCount,
  downloadCount: card.downloadCount,
  unlockedAt: card.unlockedAt,
  createdAt: card.createdAt,
});

const getEligibleCards = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = req.query.bookingId;

    const query = { user: userId };
    if (bookingId) query.booking = bookingId;

    const logs = await EntryLog.find(query)
      .populate("event", "title date location")
      .populate("ticket", "ticketNumber status")
      .populate("booking", "tickets")
      .sort({ scannedAt: -1 });

    const cards = await ExperienceCard.find({
      ticket: { $in: logs.map((log) => log.ticket?._id).filter(Boolean) },
    }).select("ticket");
    const cardTicketSet = new Set(cards.map((card) => card.ticket.toString()));

    const eligible = logs
      .filter((log) => log.ticket && !cardTicketSet.has(log.ticket._id.toString()))
      .map((log) => ({
        event: log.event,
        booking: log.booking,
        ticket: log.ticket,
        entryLogId: log._id,
        unlockedAt: log.scannedAt,
      }));

    return res.json({
      totalEligible: eligible.length,
      moodOptions: Object.entries(MOOD_CONFIG).map(([key, value]) => ({
        key,
        ...value,
      })),
      sceneOptions: Object.entries(SCENE_CONFIG).map(([key, value]) => ({
        key,
        ...value,
      })),
      eligible,
    });
  } catch (error) {
    console.error("Get Eligible Cards Error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch eligible experience cards." });
  }
};

const createCard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { ticketId, mood, scene, stylePrompt } = req.body;

    if (!ticketId || !mood || !scene) {
      return res
        .status(400)
        .json({ message: "ticketId, mood, and scene are required." });
    }
    if (!MOOD_CONFIG[mood]) {
      return res.status(400).json({ message: "Invalid mood option." });
    }
    if (!SCENE_CONFIG[scene]) {
      return res.status(400).json({ message: "Invalid scene option." });
    }

    const ticket = await Ticket.findById(ticketId)
      .populate("event", "title date location imageUrl venueReferenceImages")
      .populate("booking", "tickets");
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }
    if (ticket.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized for this ticket." });
    }
    if (ticket.status !== "USED") {
      return res.status(400).json({
        message: "Ticket must be verified at entry before creating a card.",
      });
    }

    const entryLog = await EntryLog.findOne({
      ticket: ticket._id,
      user: userId,
      event: ticket.event._id,
    }).sort({ scannedAt: -1 });
    if (!entryLog) {
      return res.status(400).json({
        message: "No verified attendance record found for this ticket.",
      });
    }

    const existingCard = await ExperienceCard.findOne({ ticket: ticket._id })
      .populate("event", "title date location")
      .populate("user", "username")
      .populate("ticket", "ticketNumber");
    if (existingCard) {
      return res.status(409).json({
        message: "Experience card already exists for this ticket.",
        card: mapCardDto(existingCard),
      });
    }

    const promptPayload = buildScenePrompt({
      event: ticket.event,
      scene,
      stylePrompt,
    });
    const generatedScene = await generateCardScene({
      event: ticket.event,
      scene,
      stylePrompt,
    });

    const selfieUpload = req.file ? req.file.path.replace(/\\/g, "/") : "";

    const card = await ExperienceCard.create({
      user: userId,
      event: ticket.event._id,
      booking: ticket.booking._id,
      ticket: ticket._id,
      entryLog: entryLog._id,
      cardId: buildCardId(),
      mood,
      scene,
      stylePrompt: promptPayload.stylePrompt,
      backgroundImageUrl: generatedScene.imageUrl,
      userSelfieUrl: selfieUpload,
      venueReferenceImageUrls: ticket.event.venueReferenceImages || [],
      generationSource: generatedScene.source,
      aiPrompt: generatedScene.prompt || promptPayload.positivePrompt,
      rarity: chooseRarity(),
      shareToken: crypto.randomBytes(18).toString("base64url"),
      unlockedAt: entryLog.scannedAt,
    });

    const populatedCard = await ExperienceCard.findById(card._id)
      .populate("event", "title date location")
      .populate("user", "username")
      .populate("ticket", "ticketNumber")
      .populate("booking", "tickets");

    return res.status(201).json({
      message:
        generatedScene.source === "comfyui"
          ? "Experience card created successfully."
          : generatedScene.source === "event-reference"
            ? "Experience card created using the organizer's event place photo."
            : "Experience card created with built-in themed scene art.",
      card: mapCardDto(populatedCard),
      generationWarning: generatedScene.warning || "",
    });
  } catch (error) {
    console.error("Create Card Error:", error);
    return res.status(500).json({ message: "Failed to create experience card." });
  }
};

const getMyCards = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = req.query.bookingId;
    const query = { user: userId };
    if (bookingId) query.booking = bookingId;

    const cards = await ExperienceCard.find(query)
      .populate("event", "title date location")
      .populate("ticket", "ticketNumber")
      .populate("booking", "tickets")
      .sort({ createdAt: -1 });

    return res.json(cards.map(mapCardDto));
  } catch (error) {
    console.error("Get My Cards Error:", error);
    return res.status(500).json({ message: "Failed to fetch experience cards." });
  }
};

const markCardShared = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardId } = req.params;

    const card = await ExperienceCard.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found." });
    }
    if (card.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized for this card." });
    }

    card.isShared = true;
    card.sharedAt = card.sharedAt || new Date();
    card.shareCount += 1;
    await card.save();

    return res.json({
      message: "Card share recorded.",
      shareCount: card.shareCount,
      sharedAt: card.sharedAt,
    });
  } catch (error) {
    console.error("Mark Card Shared Error:", error);
    return res.status(500).json({ message: "Failed to record card sharing." });
  }
};

const markCardDownloaded = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardId } = req.params;

    const card = await ExperienceCard.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found." });
    }
    if (card.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized for this card." });
    }

    card.downloadCount += 1;
    await card.save();

    return res.json({
      message: "Card download recorded.",
      downloadCount: card.downloadCount,
    });
  } catch (error) {
    console.error("Mark Card Downloaded Error:", error);
    return res.status(500).json({ message: "Failed to record download." });
  }
};

const getSharedCard = async (req, res) => {
  try {
    const { shareToken } = req.params;
    const card = await ExperienceCard.findOne({ shareToken })
      .populate("event", "title date location")
      .populate("user", "username");

    if (!card) {
      return res.status(404).json({ message: "Shared card not found." });
    }

    await ExperienceCard.updateOne({ _id: card._id }, { $inc: { viewCount: 1 } });
    card.viewCount += 1;

    return res.json({
      card: {
        ...mapCardDto(card),
        user: card.user,
        event: card.event,
      },
    });
  } catch (error) {
    console.error("Get Shared Card Error:", error);
    return res.status(500).json({ message: "Failed to fetch shared card." });
  }
};

const markSharedCardDownloaded = async (req, res) => {
  try {
    const { shareToken } = req.params;
    const card = await ExperienceCard.findOne({ shareToken }).select("_id");

    if (!card) {
      return res.status(404).json({ message: "Shared card not found." });
    }

    await ExperienceCard.updateOne({ _id: card._id }, { $inc: { downloadCount: 1 } });
    return res.json({ message: "Shared card download recorded." });
  } catch (error) {
    console.error("Mark Shared Card Downloaded Error:", error);
    return res.status(500).json({ message: "Failed to record shared download." });
  }
};

const getEventAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).select("title createdBy");

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = event.createdBy.toString() === req.user.userId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not authorized for this event." });
    }

    const [
      generatedCards,
      sharedCards,
      moodStats,
      sceneStats,
      rarityStats,
      funnelTotals,
      topSharedCards,
    ] =
      await Promise.all([
        ExperienceCard.countDocuments({ event: eventId }),
        ExperienceCard.countDocuments({ event: eventId, isShared: true }),
        ExperienceCard.aggregate([
          { $match: { event: event._id } },
          { $group: { _id: "$mood", count: { $sum: 1 } } },
        ]),
        ExperienceCard.aggregate([
          { $match: { event: event._id } },
          { $group: { _id: "$scene", count: { $sum: 1 } } },
        ]),
        ExperienceCard.aggregate([
          { $match: { event: event._id } },
          { $group: { _id: "$rarity", count: { $sum: 1 } } },
        ]),
        ExperienceCard.aggregate([
          { $match: { event: event._id } },
          {
            $group: {
              _id: null,
              totalViews: { $sum: "$viewCount" },
              totalDownloads: { $sum: "$downloadCount" },
              totalShares: { $sum: "$shareCount" },
            },
          },
        ]),
        ExperienceCard.find({ event: event._id })
          .populate("user", "username")
          .select("cardId rarity shareCount viewCount downloadCount user")
          .sort({ shareCount: -1, viewCount: -1, downloadCount: -1, createdAt: -1 })
          .limit(5),
      ]);

    const moodDistribution = Object.keys(MOOD_CONFIG).map((key) => {
      const count = moodStats.find((item) => item._id === key)?.count || 0;
      const percentage = generatedCards
        ? Number(((count / generatedCards) * 100).toFixed(1))
        : 0;
      return {
        key,
        label: MOOD_CONFIG[key].label,
        emoji: MOOD_CONFIG[key].emoji,
        count,
        percentage,
      };
    });

    const sceneDistribution = Object.keys(SCENE_CONFIG).map((key) => {
      const count = sceneStats.find((item) => item._id === key)?.count || 0;
      return {
        key,
        label: SCENE_CONFIG[key].label,
        count,
      };
    });

    const rarityDistribution = ["COMMON", "RARE", "EPIC", "LEGENDARY"].map(
      (key) => ({
        key,
        count: rarityStats.find((item) => item._id === key)?.count || 0,
      }),
    );

    const funnel = {
      totalShares: funnelTotals[0]?.totalShares || 0,
      totalViews: funnelTotals[0]?.totalViews || 0,
      totalDownloads: funnelTotals[0]?.totalDownloads || 0,
    };

    const topCards = topSharedCards.map((card) => ({
      id: card._id,
      cardId: card.cardId,
      rarity: card.rarity,
      owner: card.user?.username || "Unknown",
      shareCount: card.shareCount,
      viewCount: card.viewCount,
      downloadCount: card.downloadCount,
    }));

    const shareToViewRate = funnel.totalShares
      ? Number(((funnel.totalViews / funnel.totalShares) * 100).toFixed(1))
      : 0;
    const viewToDownloadRate = funnel.totalViews
      ? Number(((funnel.totalDownloads / funnel.totalViews) * 100).toFixed(1))
      : 0;
    const shareToDownloadRate = funnel.totalShares
      ? Number(((funnel.totalDownloads / funnel.totalShares) * 100).toFixed(1))
      : 0;

    return res.json({
      event: {
        id: event._id,
        title: event.title,
      },
      summary: {
        cardsGenerated: generatedCards,
        cardsShared: sharedCards,
        totalViews: funnel.totalViews,
        totalDownloads: funnel.totalDownloads,
      },
      moodDistribution,
      sceneDistribution,
      rarityDistribution,
      funnel: {
        ...funnel,
        shareToViewRate,
        viewToDownloadRate,
        shareToDownloadRate,
      },
      topCards,
    });
  } catch (error) {
    console.error("Get Event Analytics Error:", error);
    return res.status(500).json({ message: "Failed to fetch analytics." });
  }
};

module.exports = {
  getEligibleCards,
  createCard,
  getMyCards,
  markCardShared,
  markCardDownloaded,
  getSharedCard,
  markSharedCardDownloaded,
  getEventAnalytics,
};
