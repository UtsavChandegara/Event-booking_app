import api from "./api.js";

const shell = document.getElementById("shared-card-shell");
const token = new URLSearchParams(window.location.search).get("token");
const backBtn = document.getElementById("shared-card-back-btn");

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

function getCardBackgroundStyle(card) {
  if (!card.backgroundImageUrl) return "";
  const safeUrl = getAssetUrl(card.backgroundImageUrl).replace(/"/g, "%22");
  return `style="background-image: linear-gradient(rgba(7, 19, 33, 0.24), rgba(7, 19, 33, 0.58)), url('${safeUrl}'); background-size: cover; background-position: center;"`;
}

function getSelfieBadgeHtml(card) {
  return card.userSelfieUrl
    ? `<div style="position:absolute;right:14px;bottom:14px;width:72px;height:72px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.85);box-shadow:0 8px 18px rgba(0,0,0,0.28);">
        <img src="${getAssetUrl(card.userSelfieUrl)}" alt="Attendee selfie" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>`
    : "";
}

function getInvisibleCardIdHtml(card) {
  return `
    <div
      aria-hidden="true"
      style="position:absolute;inset:auto 18px 18px auto;font-size:10px;letter-spacing:2px;opacity:0.02;color:#ffffff;pointer-events:none;user-select:none;"
    >${getDisplayCardId(card.cardId)}</div>
  `;
}

if (!token) {
  shell.innerHTML = '<p style="color: #d9534f;">Missing share token.</p>';
} else {
  loadCard();
}

if (backBtn) {
  backBtn.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "dashboard.html";
  });
}

async function loadCard() {
  try {
    const data = await api.getSharedCard(token);
    const card = data.card;

    shell.innerHTML = `
      <div class="shared-card-preview-wrap">
        <div id="shared-card-preview" class="experience-card ${SCENE_THEME_CLASS[card.scene] || "theme-stage"}" ${getCardBackgroundStyle(card)}>
        <div class="card-chip-row">
          <span class="chip">${card.rarity}</span>
          <span class="chip">${getDisplayCardId(card.cardId)}</span>
        </div>
        <h1 style="margin: 4px 0;">${card.event?.title || "Event"}</h1>
        <div><strong>Attendee:</strong> ${card.user?.username || "Guest"}</div>
        <div><strong>Mood:</strong> ${card.moodEmoji} ${card.moodLabel}</div>
        <div><strong>Scene:</strong> ${card.sceneLabel}</div>
        <div>Date: ${card.event?.date ? new Date(card.event.date).toLocaleDateString() : "-"}</div>
        ${getSelfieBadgeHtml(card)}
        ${getInvisibleCardIdHtml(card)}
      </div>
      </div>
      <p style="margin-top: 12px;">Views: ${card.viewCount}</p>
      <button id="download-shared-card-btn" class="btn btn-secondary">Download This Card</button>
    `;

    const downloadBtn = document.getElementById("download-shared-card-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", downloadSharedCard);
    }
  } catch (error) {
    shell.innerHTML = `<p style="color: #d9534f;">${error.message}</p>`;
  }
}

async function downloadSharedCard() {
  const preview = document.getElementById("shared-card-preview");
  if (!preview) {
    alert("Card preview not found.");
    return;
  }
  if (typeof window.html2canvas !== "function") {
    alert("Download library is not loaded.");
    return;
  }

  try {
    const canvas = await window.html2canvas(preview, {
      backgroundColor: null,
      scale: 2,
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `shared-experience-card-${Date.now()}.png`;
    link.click();

    await api.markSharedCardDownloaded(token);
  } catch (error) {
    alert(error.message || "Unable to download this shared card.");
  }
}
