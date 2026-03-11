import api from "./api.js";

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");
const query = new URLSearchParams(window.location.search);
const bookingId = query.get("bookingId");
const initialView = query.get("view") || "unlocked";

const eligibleEl = document.getElementById("eligible-cards");
const myCardsEl = document.getElementById("my-cards");
const unlockedSection = document.getElementById("unlocked-section");
const createdSection = document.getElementById("created-section");
const unlockedBtn = document.getElementById("view-unlocked-btn");
const createdBtn = document.getElementById("view-created-btn");
const unlockedUnavailableNote = document.getElementById(
  "unlocked-unavailable-note",
);
const cardPreviewModal = document.getElementById("card-preview-modal");
const cardPreviewModalBody = document.getElementById("card-preview-modal-body");
const cardPreviewBackBtn = document.getElementById("card-preview-back-btn");
const cardPreviewDownloadBtn = document.getElementById("card-preview-download-btn");

if (!token || !user) {
  window.location.href = "login.html";
}

const SCENE_THEME_CLASS = {
  STAGE_HERO: "theme-stage",
  CROWD_CELEBRATION: "theme-crowd",
  NEON_POSTER: "theme-neon",
  BACKSTAGE_PASS: "theme-backstage",
  FESTIVAL_HOLO: "theme-holo",
};

function getAssetUrl(assetUrl) {
  if (!assetUrl) return "";
  let path = String(assetUrl).trim().replace(/\\/g, "/");
  const uploadsIndex = path.indexOf("uploads/");
  if (uploadsIndex !== -1) {
    path = path.substring(uploadsIndex);
  }
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("/uploads/")) {
    return path;
  }
  return `${window.location.protocol}//${window.location.hostname}:3000/${path.replace(/^\/+/, "")}`;
}

function getDisplayCardId(cardId) {
  return String(cardId || "").replace(/^#+/, "");
}

let moodOptions = [];
let sceneOptions = [];
let hasUnlockedSlots = false;
let previewingCardId = "";

const getMoodSelect = (ticketId) => `
  <label for="mood-${ticketId}"><strong>Mood</strong></label>
  <select id="mood-${ticketId}">
    ${moodOptions
      .map(
        (opt) =>
          `<option value="${opt.key}">${opt.emoji} ${opt.label}</option>`,
      )
      .join("")}
  </select>
`;

const getSceneSelect = (ticketId) => `
  <label for="scene-${ticketId}"><strong>Card Scene</strong></label>
  <select id="scene-${ticketId}">
    ${sceneOptions
      .map((opt) => `<option value="${opt.key}">${opt.label}</option>`)
      .join("")}
  </select>
`;

const getCardBackgroundStyle = (card) => {
  if (!card.backgroundImageUrl) return "";
  const safeUrl = getAssetUrl(card.backgroundImageUrl).replace(/"/g, "%22");
  return `style="background-image: linear-gradient(rgba(7, 19, 33, 0.24), rgba(7, 19, 33, 0.56)), url('${safeUrl}');"`;
};

const getSelfieInput = (ticketId) => `
  <label for="selfie-${ticketId}"><strong>Your Selfie</strong></label>
  <input id="selfie-${ticketId}" type="file" accept="image/*">
`;

const getSelfieBadgeHtml = (card) =>
  card.userSelfieUrl
    ? `<div class="selfie-badge"><img src="${getAssetUrl(card.userSelfieUrl)}" alt="Attendee selfie"></div>`
    : "";

const getInvisibleCardIdHtml = (card) => `
  <div
    aria-hidden="true"
    style="position: absolute; inset: auto 18px 18px auto; font-size: 10px; letter-spacing: 2px; opacity: 0.02; color: #ffffff; pointer-events: none; user-select: none;"
  >${getDisplayCardId(card.cardId)}</div>
`;

function buildShareUrl(shareToken) {
  return new URL(
    `card-share.html?token=${encodeURIComponent(shareToken)}`,
    window.location.href,
  ).toString();
}

const eligibleCardHtml = (item) => `
  <article class="box">
    <h3 style="margin: 0 0 8px;">${item.event?.title || "Event"}</h3>
    <div class="meta"><strong>Ticket:</strong> ${item.ticket?.ticketNumber || "-"}</div>
    <div class="meta"><strong>Unlocked:</strong> ${new Date(item.unlockedAt).toLocaleString()}</div>
    <div class="field">${getMoodSelect(item.ticket?._id)}</div>
    <div class="field">${getSceneSelect(item.ticket?._id)}</div>
    <div class="field">${getSelfieInput(item.ticket?._id)}</div>
    <button class="btn btn-primary create-card-btn" data-ticket-id="${item.ticket?._id}" style="margin-top: 12px;">Create Experience Card</button>
  </article>
`;

const myCardHtml = (card) => `
  <article class="box">
    <div id="card-preview-${card.id}" class="experience-card ${SCENE_THEME_CLASS[card.scene] || "theme-stage"}" ${getCardBackgroundStyle(card)}>
      <div class="card-chip-row">
        <span class="chip">${card.rarity}</span>
        <span class="chip">${getDisplayCardId(card.cardId)}</span>
      </div>
      <h3 style="margin: 4px 0;">${card.event?.title || "Event"}</h3>
      <div>${card.moodEmoji} ${card.moodLabel}</div>
      <div>${card.sceneLabel}</div>
      <div class="meta">Date: ${card.event?.date ? new Date(card.event.date).toLocaleDateString() : "-"}</div>
      ${getSelfieBadgeHtml(card)}
      ${getInvisibleCardIdHtml(card)}
    </div>
    <div class="meta" style="margin-top: 8px;">Source: ${
      card.generationSource === "comfyui"
        ? "Local AI"
        : card.generationSource === "event-reference"
          ? "Organizer Event Place Photo"
          : "Built-in Theme Art"
    }</div>
    ${
      card.venueReferenceImageUrls?.length
        ? `<div class="meta">Venue refs: ${card.venueReferenceImageUrls.length} uploaded</div>`
        : ""
    }
    <div class="meta" style="margin-top: 8px;">
      Shares: ${card.shareCount} | Views: ${card.viewCount} | Downloads: ${card.downloadCount || 0}
    </div>
    <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
      <button class="btn btn-secondary copy-share-btn" data-card-id="${card.id}" data-share-token="${card.shareToken}">Create/Copy Link</button>
      <button class="btn btn-secondary icon-btn share-app-btn" title="Share on WhatsApp" data-card-id="${card.id}" data-share-token="${card.shareToken}" data-platform="whatsapp"><i class="fa-brands fa-whatsapp"></i></button>
      <button class="btn btn-secondary icon-btn share-app-btn" title="Share on Telegram" data-card-id="${card.id}" data-share-token="${card.shareToken}" data-platform="telegram"><i class="fa-brands fa-telegram"></i></button>
      <button class="btn btn-secondary icon-btn share-app-btn" title="Share on X" data-card-id="${card.id}" data-share-token="${card.shareToken}" data-platform="x"><i class="fa-brands fa-x-twitter"></i></button>
      <button class="btn btn-secondary icon-btn share-app-btn" title="Share on Facebook" data-card-id="${card.id}" data-share-token="${card.shareToken}" data-platform="facebook"><i class="fa-brands fa-facebook-f"></i></button>
      <button class="btn btn-secondary download-card-btn" data-card-id="${card.id}">Download Card</button>
      <button class="btn preview-card-btn" data-card-id="${card.id}">Preview</button>
    </div>
  </article>
`;

async function loadEligibleCards() {
  try {
    const data = await api.getEligibleCards(token, bookingId || "");
    moodOptions = data.moodOptions || [];
    sceneOptions = data.sceneOptions || [];
    hasUnlockedSlots = data.eligible.length > 0;
    syncUnlockedOptionVisibility();

    if (!data.eligible.length) {
      eligibleEl.innerHTML = "<p>No unlocked card slots right now. Attend an event and verify entry first.</p>";
      return;
    }
    eligibleEl.innerHTML = data.eligible.map(eligibleCardHtml).join("");
  } catch (error) {
    hasUnlockedSlots = false;
    syncUnlockedOptionVisibility();
    eligibleEl.innerHTML = `<p style="color: #d9534f;">${error.message}</p>`;
  }
}

async function loadMyCards() {
  try {
    const cards = await api.getMyCards(token, bookingId || "");
    if (!cards.length) {
      myCardsEl.innerHTML = "<p>No cards created yet.</p>";
      return;
    }
    myCardsEl.innerHTML = cards.map(myCardHtml).join("");
  } catch (error) {
    myCardsEl.innerHTML = `<p style="color: #d9534f;">${error.message}</p>`;
  }
}

function setView(view) {
  const isUnlocked = view !== "created" && hasUnlockedSlots;
  if (unlockedSection) unlockedSection.style.display = isUnlocked ? "block" : "none";
  if (createdSection) createdSection.style.display = isUnlocked ? "none" : "block";
  if (unlockedBtn) unlockedBtn.classList.toggle("active", isUnlocked);
  if (createdBtn) createdBtn.classList.toggle("active", !isUnlocked);
}

function syncUnlockedOptionVisibility() {
  if (unlockedBtn) {
    unlockedBtn.style.display = hasUnlockedSlots ? "inline-block" : "none";
  }
  if (unlockedUnavailableNote) {
    unlockedUnavailableNote.style.display = hasUnlockedSlots ? "none" : "block";
  }
  if (!hasUnlockedSlots) {
    setView("created");
  }
}

async function createCard(ticketId) {
  const mood = document.getElementById(`mood-${ticketId}`)?.value;
  const scene = document.getElementById(`scene-${ticketId}`)?.value;
  const selfie = document.getElementById(`selfie-${ticketId}`)?.files?.[0] || null;

  if (!mood || !scene) {
    alert("Please choose mood and scene.");
    return;
  }

  try {
    const response = await api.createExperienceCard(
      { ticketId, mood, scene, selfie },
      token,
    );
    alert(response.generationWarning || response.message || "Experience card created.");
    await Promise.all([loadEligibleCards(), loadMyCards()]);
  } catch (error) {
    alert(error.message);
  }
}

async function copyShareLink(cardId, shareToken) {
  try {
    await api.markCardShared(cardId, token);
    const shareUrl = buildShareUrl(shareToken);

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
      alert("Share link created and copied.");
    } else {
      window.prompt("Copy this share link:", shareUrl);
    }

    await loadMyCards();
  } catch (error) {
    alert(error.message);
  }
}

async function openShareApp(cardId, shareToken, platform) {
  try {
    await api.markCardShared(cardId, token);
    const shareUrl = buildShareUrl(shareToken);
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent("Check out my Eventify experience card");

    const platformUrls = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };

    const targetUrl = platformUrls[platform];
    if (!targetUrl) {
      throw new Error("Unsupported share platform.");
    }

    window.open(targetUrl, "_blank", "noopener,noreferrer");
    await loadMyCards();
  } catch (error) {
    alert(error.message);
  }
}

async function downloadCard(cardId) {
  const cardPreview = document.getElementById(`card-preview-${cardId}`);
  if (!cardPreview) {
    alert("Card preview not found.");
    return;
  }

  if (typeof window.html2canvas !== "function") {
    alert("Download library is not loaded.");
    return;
  }

  try {
    const canvas = await window.html2canvas(cardPreview, {
      backgroundColor: null,
      scale: 2,
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `experience-card-${cardId}.png`;
    link.click();

    await api.markCardDownloaded(cardId, token);
    await loadMyCards();
  } catch (error) {
    alert(error.message || "Unable to download this card.");
  }
}

function openPreviewModal(cardId) {
  const sourcePreview = document.getElementById(`card-preview-${cardId}`);
  if (!sourcePreview) {
    alert("Card preview not found.");
    return;
  }

  previewingCardId = cardId;
  cardPreviewModalBody.innerHTML = sourcePreview.outerHTML;
  cardPreviewModal.style.display = "flex";
  cardPreviewModal.setAttribute("aria-hidden", "false");
}

function closePreviewModal() {
  previewingCardId = "";
  cardPreviewModal.style.display = "none";
  cardPreviewModal.setAttribute("aria-hidden", "true");
  cardPreviewModalBody.innerHTML = "";
}

function setupEvents() {
  if (unlockedBtn) {
    unlockedBtn.addEventListener("click", () => setView("unlocked"));
  }
  if (createdBtn) {
    createdBtn.addEventListener("click", () => setView("created"));
  }

  eligibleEl.addEventListener("click", async (event) => {
    const button = event.target.closest(".create-card-btn");
    if (!button) return;
    button.disabled = true;
    button.textContent = "Creating...";
    await createCard(button.dataset.ticketId);
    button.disabled = false;
    button.textContent = "Create Experience Card";
  });

  myCardsEl.addEventListener("click", async (event) => {
    const shareButton = event.target.closest(".copy-share-btn");
    if (shareButton) {
      shareButton.disabled = true;
      shareButton.textContent = "Creating...";
      await copyShareLink(shareButton.dataset.cardId, shareButton.dataset.shareToken);
      shareButton.disabled = false;
      shareButton.textContent = "Create/Copy Link";
      return;
    }

    const appShareButton = event.target.closest(".share-app-btn");
    if (appShareButton) {
      appShareButton.disabled = true;
      const originalText = appShareButton.textContent;
      appShareButton.textContent = "Opening...";
      await openShareApp(
        appShareButton.dataset.cardId,
        appShareButton.dataset.shareToken,
        appShareButton.dataset.platform,
      );
      appShareButton.disabled = false;
      appShareButton.textContent = originalText;
      return;
    }

    const downloadButton = event.target.closest(".download-card-btn");
    if (downloadButton) {
      downloadButton.disabled = true;
      downloadButton.textContent = "Downloading...";
      await downloadCard(downloadButton.dataset.cardId);
      downloadButton.disabled = false;
      downloadButton.textContent = "Download Card";
      return;
    }

    const previewButton = event.target.closest(".preview-card-btn");
    if (previewButton) {
      openPreviewModal(previewButton.dataset.cardId);
    }
  });

  cardPreviewBackBtn?.addEventListener("click", closePreviewModal);
  cardPreviewDownloadBtn?.addEventListener("click", async () => {
    if (!previewingCardId) return;
    await downloadCard(previewingCardId);
  });
  cardPreviewModal?.addEventListener("click", (event) => {
    if (event.target === cardPreviewModal) {
      closePreviewModal();
    }
  });
}

async function init() {
  setupEvents();
  await Promise.all([loadEligibleCards(), loadMyCards()]);
  setView(initialView);
}

init();
