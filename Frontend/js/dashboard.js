import api from "./api.js";
const API_ORIGIN = `${window.location.protocol}//${window.location.hostname}:3000`;
const organizerInitialView =
  new URLSearchParams(window.location.search).get("organizerView") ||
  "created-events";
const experienceCardsTabBtn = document.querySelector(
  '.dashboard-view-btn[data-view="experience-cards"]',
);
const dashboardCardPreviewModal = document.getElementById(
  "dashboard-card-preview-modal",
);
const dashboardCardPreviewBody = document.getElementById(
  "dashboard-card-preview-body",
);
const dashboardCardPreviewClose = document.getElementById(
  "dashboard-card-preview-close",
);
const dashboardCardPreviewBack = document.getElementById(
  "dashboard-card-preview-back",
);
const dashboardCardPreviewDownload = document.getElementById(
  "dashboard-card-preview-download",
);
const dashboardCardPreviewCopyLink = document.getElementById(
  "dashboard-card-preview-copy-link",
);
const dashboardCardPreviewShareImage = document.getElementById(
  "dashboard-card-preview-share-image",
);

const PLACEHOLDER_300x200 = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20200%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A15pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2294.5%22%20y%3D%22106%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E`;
const SCENE_THEME_CLASS = {
  STAGE_HERO: "linear-gradient(135deg, #ff7a18, #af002d)",
  CROWD_CELEBRATION: "linear-gradient(135deg, #f7971e, #ffd200)",
  NEON_POSTER: "linear-gradient(135deg, #1d2b64, #f8cdda)",
  BACKSTAGE_PASS: "linear-gradient(135deg, #434343, #000000)",
  FESTIVAL_HOLO: "linear-gradient(135deg, #36d1dc, #5b86e5)",
};
let activeDashboardPreviewCardId = "";
let activeDashboardPreviewShareToken = "";

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
  return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
}

function getDisplayCardId(cardId) {
  return String(cardId || "").replace(/^#+/, "");
}

function getDashboardCardBackground(card) {
  if (!card.backgroundImageUrl) {
    return SCENE_THEME_CLASS[card.scene] || SCENE_THEME_CLASS.STAGE_HERO;
  }

  const safeUrl = getAssetUrl(card.backgroundImageUrl).replace(/"/g, "%22");
  return `linear-gradient(rgba(7, 19, 33, 0.24), rgba(7, 19, 33, 0.58)), url('${safeUrl}')`;
}

function getDashboardSelfieBadge(card) {
  return card.userSelfieUrl
    ? `<div style="position:absolute;right:14px;bottom:14px;width:64px;height:64px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.85);box-shadow:0 8px 18px rgba(0,0,0,0.28);">
        <img src="${getAssetUrl(card.userSelfieUrl)}" alt="Attendee selfie" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>`
    : "";
}

function getDashboardInvisibleCardId(card) {
  return `<div aria-hidden="true" style="position:absolute;inset:auto 18px 18px auto;font-size:10px;letter-spacing:2px;opacity:0.02;color:#ffffff;pointer-events:none;user-select:none;">${getDisplayCardId(card.cardId)}</div>`;
}

function getDashboardMoodSelect(ticketId, moodOptions) {
  return `
    <label for="dashboard-mood-${ticketId}"><strong>Mood</strong></label>
    <select id="dashboard-mood-${ticketId}">
      ${moodOptions
        .map(
          (opt) => `<option value="${opt.key}">${opt.emoji} ${opt.label}</option>`,
        )
        .join("")}
    </select>
  `;
}

function getDashboardSceneSelect(ticketId, sceneOptions) {
  return `
    <label for="dashboard-scene-${ticketId}"><strong>Card Scene</strong></label>
    <select id="dashboard-scene-${ticketId}">
      ${sceneOptions
        .map((opt) => `<option value="${opt.key}">${opt.label}</option>`)
        .join("")}
    </select>
  `;
}

function getDashboardSelfieInput(ticketId) {
  return `
    <label for="dashboard-selfie-${ticketId}"><strong>Your Selfie</strong></label>
    <input id="dashboard-selfie-${ticketId}" type="file" accept="image/*">
  `;
}

function buildDashboardShareUrl(shareToken) {
  return new URL(
    `card-share.html?token=${encodeURIComponent(shareToken)}`,
    window.location.href,
  ).toString();
}

function buildDashboardPlatformShareUrl(platform, shareToken) {
  const shareUrl = buildDashboardShareUrl(shareToken);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(
    "Check out my Eventify experience card",
  );

  const platformUrls = {
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  return platformUrls[platform] || "";
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image data."));
    reader.readAsDataURL(blob);
  });
}

async function fetchAssetAsDataUrl(url) {
  if (!url || url.startsWith("data:")) {
    return url;
  }

  const response = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!response.ok) {
    throw new Error("Unable to load card image assets.");
  }

  const blob = await response.blob();
  return readBlobAsDataUrl(blob);
}

async function inlineCardPreviewAssets(cardEl) {
  const imageNodes = [...cardEl.querySelectorAll("img")];
  for (const imageNode of imageNodes) {
    const source = imageNode.getAttribute("src");
    if (!source || source.startsWith("data:")) continue;
    imageNode.setAttribute("src", await fetchAssetAsDataUrl(source));
  }

  const nodesWithBackgrounds = [
    cardEl,
    ...cardEl.querySelectorAll("[style*='background-image']"),
  ];
  for (const node of nodesWithBackgrounds) {
    const backgroundImage = node.style.backgroundImage || "";
    if (!backgroundImage.includes("url(")) continue;

    const urls = [...backgroundImage.matchAll(/url\((['"]?)(.*?)\1\)/g)].map(
      (match) => match[2],
    );
    if (!urls.length) continue;

    let nextBackgroundImage = backgroundImage;
    for (const assetUrl of urls) {
      if (!assetUrl || assetUrl.startsWith("data:")) continue;
      const dataUrl = await fetchAssetAsDataUrl(assetUrl);
      nextBackgroundImage = nextBackgroundImage.replace(assetUrl, dataUrl);
    }
    node.style.backgroundImage = nextBackgroundImage;
  }
}

async function waitForCardPreviewImages(cardEl) {
  const images = [...cardEl.querySelectorAll("img")];
  await Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
    ),
  );
}

async function syncUserExperienceCardTabVisibility() {
  if (!experienceCardsTabBtn) return;

  try {
    const token = localStorage.getItem("token");
    const [eligiblePayload, cardsPayload] = await Promise.all([
      api.getEligibleCards(token),
      api.getMyCards(token),
    ]);
    const hasExperienceCards =
      (eligiblePayload?.eligible?.length || 0) > 0 || (cardsPayload?.length || 0) > 0;
    experienceCardsTabBtn.style.display = hasExperienceCards
      ? "inline-block"
      : "none";
  } catch (error) {
    experienceCardsTabBtn.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  setupEventListeners();

  if (user?.role === "user") {
    setupUserDashboardOptions();
    await syncUserExperienceCardTabVisibility();
    loadBookedEvents("my-tickets");
  } else {
    setupOrganizerDashboardLayout();
    loadCreatedEvents();
    loadOrganizerAnalyticsLinks();
    syncOrganizerDashboardOptionState(organizerInitialView);
    switchOrganizerDashboardView(organizerInitialView);
  }

  setupOrganizerRequestSection();
}

function setupEventListeners() {
  const bookedEventsContainer = document.getElementById(
    "booked-events-container",
  );
  if (bookedEventsContainer) {
    bookedEventsContainer.addEventListener("click", handleBookedEventsClick);
  }

  const createdEventsContainer = document.getElementById(
    "created-events-container",
  );
  if (createdEventsContainer) {
    createdEventsContainer.addEventListener("click", handleCreatedEventsClick);
  }

  const dashboardCardsContainer = document.getElementById(
    "experience-cards-dashboard-section",
  );
  if (dashboardCardsContainer) {
    dashboardCardsContainer.addEventListener("click", handleDashboardCardsClick);
  }

  // Modal setup
  const attendeesModal = document.getElementById("attendeesModal");
  if (attendeesModal) {
    const modalCloseBtn = attendeesModal.querySelector(".close-btn");
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", () => {
        attendeesModal.style.display = "none";
      });
    }
    window.addEventListener("click", (e) => {
      if (e.target == attendeesModal) {
        attendeesModal.style.display = "none";
      }
    });
  }

  dashboardCardPreviewClose?.addEventListener("click", closeDashboardCardPreview);
  dashboardCardPreviewBack?.addEventListener("click", closeDashboardCardPreview);
  dashboardCardPreviewDownload?.addEventListener(
    "click",
    downloadDashboardPreviewCard,
  );
  dashboardCardPreviewCopyLink?.addEventListener(
    "click",
    copyDashboardPreviewLink,
  );
  dashboardCardPreviewShareImage?.addEventListener(
    "click",
    shareDashboardPreviewCard,
  );
  if (dashboardCardPreviewModal) {
    window.addEventListener("click", (e) => {
      if (e.target === dashboardCardPreviewModal) {
        closeDashboardCardPreview();
      }
    });
  }

  const userOptionWrap = document.getElementById("user-dashboard-options");
  if (userOptionWrap) {
    userOptionWrap.addEventListener("click", handleUserDashboardOptionClick);
  }

  const organizerOptionWrap = document.getElementById(
    "organizer-dashboard-options",
  );
  if (organizerOptionWrap) {
    organizerOptionWrap.addEventListener(
      "click",
      handleOrganizerDashboardOptionClick,
    );
  }
}

function filterBookingsByView(bookings, view) {
  const now = new Date();
  if (view === "my-tickets") {
    return bookings.filter((booking) => new Date(booking.event.date) >= now);
  }
  if (view === "past-tickets") {
    return bookings.filter((booking) => new Date(booking.event.date) < now);
  }
  return bookings;
}

async function loadBookedEvents(view = "all") {
  const container = document.getElementById("booked-events-container");
  const titleEl = document.getElementById("booked-section-title");
  if (!container) return;

  if (titleEl) {
    titleEl.textContent = view === "past-tickets" ? "Past Tickets" : "My Tickets";
  }

  container.innerHTML = "<p>Loading your tickets...</p>";

  try {
    const token = localStorage.getItem("token");
    const bookings = await api.getUserBookings(token, "all");
    const validBookings = bookings.filter((booking) => booking.event);
    const filteredBookings = filterBookingsByView(validBookings, view);

    if (filteredBookings.length === 0) {
      container.innerHTML =
        view === "past-tickets"
          ? "<p>No past tickets found.</p>"
          : "<p>You have no active tickets.</p>";
      return;
    }

    container.innerHTML = filteredBookings
      .map((booking) => {
        const event = booking.event;
        const imageUrl = getImageUrl(event.imageUrl);
        const isPast = new Date(event.date) < new Date();
        return `
        <div class="event-card dashboard-ticket-card" id="booking-${booking._id}">
            <img class="dashboard-ticket-image" src="${imageUrl}" alt="${event.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_300x200}';">
            <div class="event-card-content">
                <h3>${event.title}</h3>
                <p class="dashboard-ticket-description">${event.description}</p>
                <div class="event-card-footer">
                    <div class="dashboard-ticket-meta">
                        <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                        <p><strong>Tickets:</strong> ${booking.tickets}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <a class="btn btn-secondary" href="ticket.html?bookingId=${booking._id}" style="background-color: #6c757d; color: #fff;">View Tickets</a>
                        <button class="btn btn-secondary open-dashboard-cards-btn" data-booking-id="${booking._id}" style="background-color: #0d6efd; color: #fff;">Experience Card</button>
                        ${isPast ? "" : `<button class="btn btn-danger cancel-booking-btn" data-booking-id="${booking._id}">Cancel</button>`}
                    </div>
                </div>
            </div>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("Error fetching booked events:", error);
    container.innerHTML = "<p>Failed to load booked events.</p>";
  }
}

async function loadDashboardExperienceCards() {
  const container = document.getElementById("dashboard-cards-container");
  const unlockedWrap = document.getElementById(
    "dashboard-experience-unlocked-wrap",
  );
  const unlockedContainer = document.getElementById(
    "dashboard-unlocked-cards-container",
  );
  if (!container || !unlockedWrap || !unlockedContainer) return;
  container.innerHTML = "<p>Loading your experience cards...</p>";
  unlockedContainer.innerHTML = "<p>Loading unlocked cards...</p>";

  try {
    const token = localStorage.getItem("token");
    const [eligiblePayload, cards] = await Promise.all([
      api.getEligibleCards(token),
      api.getMyCards(token),
    ]);

    if (eligiblePayload?.eligible?.length) {
      unlockedWrap.style.display = "block";
      unlockedContainer.innerHTML = eligiblePayload.eligible
        .map(
          (item) => `
            <article class="dashboard-card-box">
              <h3 style="margin: 0 0 8px;">${item.event?.title || "Event"}</h3>
              <div><strong>Ticket:</strong> ${item.ticket?.ticketNumber || "-"}</div>
              <div><strong>Unlocked:</strong> ${new Date(item.unlockedAt).toLocaleString()}</div>
              <div class="dashboard-card-field">${getDashboardMoodSelect(item.ticket?._id, eligiblePayload.moodOptions || [])}</div>
              <div class="dashboard-card-field">${getDashboardSceneSelect(item.ticket?._id, eligiblePayload.sceneOptions || [])}</div>
              <div class="dashboard-card-field">${getDashboardSelfieInput(item.ticket?._id)}</div>
              <button class="btn btn-primary dashboard-create-card-btn" data-ticket-id="${item.ticket?._id}" style="margin-top: 12px;">Create Experience Card</button>
            </article>
          `,
        )
        .join("");
    } else {
      unlockedWrap.style.display = "none";
      unlockedContainer.innerHTML = "";
    }

    if (!cards.length) {
      container.innerHTML =
        '<p>No experience cards yet. Attend an event and unlock your card.</p>';
      return;
    }

    container.innerHTML = cards
      .map(
        (card) => `
          <article class="event-card dashboard-card-shell">
            <div id="dashboard-card-${card.id}" class="experience-card dashboard-experience-card" style="margin: 12px; background-image: ${getDashboardCardBackground(card)};">
              <div class="dashboard-card-chip-row">
                <span class="dashboard-card-chip">${card.rarity}</span>
                <span class="dashboard-card-chip">${getDisplayCardId(card.cardId)}</span>
              </div>
              <h3 style="margin: 0; font-size: clamp(1.4rem, 2vw, 2.2rem); line-height: 1.05;">${card.event?.title || "Event"}</h3>
              <p style="margin: 0; font-size: 1rem;">${card.moodEmoji} ${card.moodLabel}</p>
              <p style="margin: 0; font-size: 1rem;">${card.sceneLabel}</p>
              <p style="margin: 0; font-size: 0.95rem;">Date: ${card.event?.date ? new Date(card.event.date).toLocaleDateString() : "-"}</p>
              ${getDashboardSelfieBadge(card)}
              ${getDashboardInvisibleCardId(card)}
            </div>
            <div class="event-card-content">
              <p>Shares: ${card.shareCount} | Views: ${card.viewCount} | Downloads: ${card.downloadCount || 0}</p>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-secondary dashboard-copy-share-btn" data-card-id="${card.id}" data-share-token="${card.shareToken}">Copy Link</button>
                <button class="btn btn-secondary dashboard-preview-card-btn" data-card-id="${card.id}" data-share-token="${card.shareToken}">Preview</button>
              </div>
            </div>
          </article>
        `,
      )
      .join("");
  } catch (error) {
    container.innerHTML = `<p>${error.message}</p>`;
    unlockedWrap.style.display = "none";
  }
}

function setupUserDashboardOptions() {
  const userOptions = document.getElementById("user-dashboard-options");
  const createdEventsSection = document.getElementById("created-events-section");

  if (userOptions) userOptions.style.display = "block";
  if (createdEventsSection) createdEventsSection.style.display = "none";
}

function setupOrganizerDashboardLayout() {
  const bookedSection = document.querySelector(".events-list");
  const organizerOptions = document.getElementById("organizer-dashboard-options");
  const createdEventsSection = document.getElementById("created-events-section");
  const organizerAnalyticsSection = document.getElementById(
    "organizer-analytics-section",
  );

  if (bookedSection) bookedSection.style.display = "none";
  if (organizerOptions) organizerOptions.style.display = "block";
  if (createdEventsSection) createdEventsSection.style.display = "block";
  if (organizerAnalyticsSection) organizerAnalyticsSection.style.display = "none";
}

async function switchUserDashboardView(view) {
  const bookedSection = document.querySelector(".events-list");
  const cardsSection = document.getElementById("experience-cards-dashboard-section");

  if (view === "experience-cards") {
    if (bookedSection) bookedSection.style.display = "none";
    if (cardsSection) cardsSection.style.display = "block";
    await loadDashboardExperienceCards();
    return;
  }

  if (bookedSection) bookedSection.style.display = "block";
  if (cardsSection) cardsSection.style.display = "none";
  await loadBookedEvents(view);
}

async function handleUserDashboardOptionClick(e) {
  const button = e.target.closest(".dashboard-view-btn");
  if (!button) return;

  document
    .querySelectorAll(".dashboard-view-btn")
    .forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");

  await switchUserDashboardView(button.dataset.view);
}

async function createDashboardExperienceCard(ticketId) {
  const mood = document.getElementById(`dashboard-mood-${ticketId}`)?.value;
  const scene = document.getElementById(`dashboard-scene-${ticketId}`)?.value;
  const selfie =
    document.getElementById(`dashboard-selfie-${ticketId}`)?.files?.[0] || null;

  if (!mood || !scene) {
    alert("Please choose mood and scene.");
    return;
  }

  const token = localStorage.getItem("token");
  const response = await api.createExperienceCard(
    { ticketId, mood, scene, selfie },
    token,
  );
  alert(response.generationWarning || response.message || "Experience card created.");
  await loadDashboardExperienceCards();
  await syncUserExperienceCardTabVisibility();
}

function switchOrganizerDashboardView(view) {
  const createdEventsSection = document.getElementById("created-events-section");
  const organizerAnalyticsSection = document.getElementById(
    "organizer-analytics-section",
  );

  if (view === "create-event") {
    window.location.href = "create-event.html";
    return;
  }

  if (createdEventsSection) {
    createdEventsSection.style.display =
      view === "created-events" ? "block" : "none";
  }
  if (organizerAnalyticsSection) {
    organizerAnalyticsSection.style.display =
      view === "experience-analytics" ? "block" : "none";
  }
}

function syncOrganizerDashboardOptionState(view) {
  document.querySelectorAll(".organizer-view-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function handleOrganizerDashboardOptionClick(e) {
  const button = e.target.closest(".organizer-view-btn");
  if (!button) return;

  syncOrganizerDashboardOptionState(button.dataset.view);
  switchOrganizerDashboardView(button.dataset.view);
}

async function loadCreatedEvents() {
  const container = document.getElementById("created-events-container");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || !container) return;
  container.innerHTML = "<p>Loading your created events...</p>";

  try {
    const allEvents = await api.getAllEvents();
    const myEvents = allEvents.filter(
      (event) => event?.createdBy?._id === user._id,
    );

    if (myEvents.length === 0) {
      container.innerHTML = "<p>You have not created any events.</p>";
      return;
    }

    container.innerHTML = myEvents
      .map((event) => {
        const imageUrl = getImageUrl(event.imageUrl);
        return `
        <div class="event-card dashboard-ticket-card" id="event-${event._id}">
            <img class="dashboard-ticket-image" src="${imageUrl}" alt="${event.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_300x200}';">
            <div class="event-card-content">
                <h3>${event.title}</h3>
                <p class="dashboard-ticket-description">${event.description}</p>
                <p class="dashboard-created-event-stats"><i class="fas fa-ticket-alt"></i> Tickets Sold: ${event.bookedTickets || 0} / ${event.totalTickets || "N/A"}</p>
                <div class="event-card-footer">
                    <span class="dashboard-ticket-meta">${new Date(event.date).toLocaleDateString()}</span>
                    <div>
                        <button class="btn btn-secondary view-attendees-btn" data-event-id="${event._id}" data-event-title="${event.title}" style="margin-right: 5px; background-color: #6c757d; color: white;">Attendees</button>
                        <a href="edit-event.html?id=${event._id}" class="btn btn-primary" style="margin-right: 5px;">Edit</a>
                        <button class="btn btn-danger delete-event-btn" data-event-id="${event._id}">Delete</button>
                    </div>
                </div>
            </div>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("Error fetching created events:", error);
    container.innerHTML = "<p>Failed to load created events.</p>";
  }
}

function getImageUrl(imageUrl) {
  if (!imageUrl) return PLACEHOLDER_300x200;
  let path = imageUrl.trim().replace(/\\/g, "/");
  const uploadsIndex = path.indexOf("uploads/");
  if (uploadsIndex !== -1) {
    path = path.substring(uploadsIndex);
  }
  if (path.startsWith("http") || path.startsWith("data:")) {
    return path;
  }
  return `${API_ORIGIN}/${path}`;
}

async function loadOrganizerAnalyticsLinks() {
  const container = document.getElementById("organizer-analytics-container");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!container || !user || user.role === "user") return;
  container.innerHTML = "<p>Loading analytics shortcuts...</p>";

  try {
    const allEvents = await api.getAllEvents();
    const myEvents = allEvents.filter(
      (event) => event?.createdBy?._id === user._id,
    );

    if (!myEvents.length) {
      container.innerHTML =
        "<p>Create an event first to start tracking experience analytics.</p>";
      return;
    }

    container.innerHTML = myEvents
      .map(
        (event) => `
          <article class="event-card">
            <div class="event-card-content">
              <h3>${event.title}</h3>
              <p>${event.location}</p>
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
                <a href="event-experience-analytics.html?eventId=${event._id}" class="btn btn-secondary" style="background-color: #198754; color: white;">Open Analytics</a>
                <a href="ticket-scanner.html" class="btn btn-secondary" style="background-color: #6c757d; color: white;">Open Scanner</a>
              </div>
            </div>
          </article>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading organizer analytics shortcuts:", error);
    container.innerHTML = "<p>Failed to load analytics shortcuts.</p>";
  }
}

async function handleBookedEventsClick(e) {
  if (e.target.classList.contains("open-dashboard-cards-btn")) {
    const button = document.querySelector(
      '.dashboard-view-btn[data-view="experience-cards"]',
    );
    if (!button) return;

    document
      .querySelectorAll(".dashboard-view-btn")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    await switchUserDashboardView("experience-cards");
    return;
  }

  if (e.target.classList.contains("cancel-booking-btn")) {
    const bookingId = e.target.dataset.bookingId;
    if (confirm("Are you sure you want to cancel this booking?")) {
      try {
        const token = localStorage.getItem("token");
        await api.cancelBooking(bookingId, token);
        document.getElementById(`booking-${bookingId}`)?.remove();
        alert("Booking cancelled successfully.");
        await loadBookedEvents("my-tickets");
      } catch (error) {
        console.error("Error cancelling booking:", error);
        alert("Failed to cancel booking.");
      }
    }
  }
}

async function handleDashboardCardsClick(e) {
  const createButton = e.target.closest(".dashboard-create-card-btn");
  if (createButton) {
    createButton.disabled = true;
    createButton.textContent = "Creating...";
    try {
      await createDashboardExperienceCard(createButton.dataset.ticketId);
    } catch (error) {
      alert(error.message);
    } finally {
      createButton.disabled = false;
      createButton.textContent = "Create Experience Card";
    }
    return;
  }

  const shareButton = e.target.closest(".dashboard-copy-share-btn");
  if (shareButton) {
    try {
      const token = localStorage.getItem("token");
      await api.markCardShared(shareButton.dataset.cardId, token);
      const shareUrl = buildDashboardShareUrl(shareButton.dataset.shareToken);

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Share link copied.");
      } else {
        window.prompt("Copy this share link:", shareUrl);
      }
      await loadDashboardExperienceCards();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  const appShareButton = e.target.closest(".dashboard-share-app-btn");
  if (appShareButton) {
    try {
      const token = localStorage.getItem("token");
      await api.markCardShared(appShareButton.dataset.cardId, token);
      const targetUrl = buildDashboardPlatformShareUrl(
        appShareButton.dataset.platform,
        appShareButton.dataset.shareToken,
      );
      if (!targetUrl) {
        throw new Error("Unsupported share platform.");
      }

      window.open(targetUrl, "_blank", "noopener,noreferrer");
      await loadDashboardExperienceCards();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  const previewButton = e.target.closest(".dashboard-preview-card-btn");
  if (previewButton) {
    openDashboardCardPreview(
      previewButton.dataset.cardId,
      previewButton.dataset.shareToken,
    );
  }
}

function openDashboardCardPreview(cardId, shareToken = "") {
  const sourceCard = document.getElementById(`dashboard-card-${cardId}`);
  if (!sourceCard || !dashboardCardPreviewModal || !dashboardCardPreviewBody) {
    alert("Card preview not found.");
    return;
  }

  activeDashboardPreviewCardId = cardId;
  activeDashboardPreviewShareToken = shareToken;
  dashboardCardPreviewBody.innerHTML = sourceCard.outerHTML;
  dashboardCardPreviewModal.style.display = "flex";
}

function closeDashboardCardPreview() {
  activeDashboardPreviewCardId = "";
  activeDashboardPreviewShareToken = "";
  if (dashboardCardPreviewModal) {
    dashboardCardPreviewModal.style.display = "none";
  }
  if (dashboardCardPreviewBody) {
    dashboardCardPreviewBody.innerHTML = "";
  }
}

async function copyDashboardPreviewLink() {
  if (!activeDashboardPreviewCardId || !activeDashboardPreviewShareToken) {
    alert("Card preview not found.");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    await api.markCardShared(activeDashboardPreviewCardId, token);
    const shareUrl = buildDashboardShareUrl(activeDashboardPreviewShareToken);

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
      alert("Share link copied.");
    } else {
      window.prompt("Copy this share link:", shareUrl);
    }
    await loadDashboardExperienceCards();
  } catch (error) {
    alert(error.message || "Unable to copy share link.");
  }
}

async function shareDashboardPreviewCard() {
  if (!activeDashboardPreviewCardId || !activeDashboardPreviewShareToken) {
    alert("Card preview not found.");
    return;
  }

  try {
    const blob = await exportDashboardPreviewCardBlob();
    const fileName = `experience-card-${activeDashboardPreviewCardId || Date.now()}.png`;
    const imageFile = new File([blob], fileName, { type: "image/png" });
    const token = localStorage.getItem("token");
    await api.markCardShared(activeDashboardPreviewCardId, token);

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [imageFile] })
    ) {
      await navigator.share({
        title: "Eventify Experience Card",
        text: "Share this experience card",
        files: [imageFile],
      });
    } else {
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      alert(
        "This browser cannot share the image file directly. The card image was downloaded instead.",
      );
    }
    await loadDashboardExperienceCards();
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    alert(error.message || "Unable to share this card image.");
  }
}

async function renderDashboardPreviewCanvas() {
  const previewCard = dashboardCardPreviewBody?.querySelector(".experience-card");
  if (!previewCard) {
    throw new Error("Card preview not found.");
  }
  if (typeof window.html2canvas !== "function") {
    throw new Error("Download library is not loaded.");
  }

  const exportWrap = document.createElement("div");
  exportWrap.style.position = "fixed";
  exportWrap.style.left = "-10000px";
  exportWrap.style.top = "0";
  exportWrap.style.pointerEvents = "none";
  exportWrap.style.opacity = "0";

  try {
    const exportCard = previewCard.cloneNode(true);
    exportCard.style.margin = "0";
    exportCard.style.width = `${previewCard.offsetWidth}px`;
    exportWrap.appendChild(exportCard);
    document.body.appendChild(exportWrap);

    await inlineCardPreviewAssets(exportCard);
    await waitForCardPreviewImages(exportCard);

    return await window.html2canvas(exportCard, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
    });
  } finally {
    exportWrap.remove();
  }
}

async function exportDashboardPreviewCardBlob() {
  const canvas = await renderDashboardPreviewCanvas();
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
        return;
      }
      reject(new Error("Unable to export this card."));
    }, "image/png");
  });
  return blob;
}

async function downloadDashboardPreviewCard() {
  try {
    const blob = await exportDashboardPreviewCardBlob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `experience-card-${activeDashboardPreviewCardId || Date.now()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    if (activeDashboardPreviewCardId) {
      const token = localStorage.getItem("token");
      await api.markCardDownloaded(activeDashboardPreviewCardId, token);
      await loadDashboardExperienceCards();
    }
  } catch (error) {
    alert(error.message || "Unable to download this card.");
  }
}

async function handleCreatedEventsClick(e) {
  const target = e.target;
  const token = localStorage.getItem("token");

  if (target.classList.contains("delete-event-btn")) {
    const eventId = target.dataset.eventId;
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await api.deleteEvent(eventId, token);
        document.getElementById(`event-${eventId}`)?.remove();
        alert("Event deleted successfully.");
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event.");
      }
    }
  }

  if (target.classList.contains("view-attendees-btn")) {
    const eventId = target.dataset.eventId;
    const eventTitle = target.dataset.eventTitle;
    openAttendeesModal(eventId, eventTitle);
  }
}

function setupOrganizerRequestSection() {
  const user = JSON.parse(localStorage.getItem("user"));
  const organizerSection = document.getElementById("organizer-section");
  if (!user || user.role !== "user" || !organizerSection) return;

  organizerSection.style.display = "block";
  let content = "";
  switch (user.organizerRequestStatus) {
    case "pending":
      content = `
        <h2>Request Pending</h2>
        <p style="color: #666;">Your request to become an organizer is currently under review by an administrator.</p>
      `;
      break;
    case "rejected":
      content = `
        <h2>Become an Organizer</h2>
        <p style="margin-bottom: 10px; color: #dc3545;">Your previous request was not approved. You may submit another request for review.</p>
        <button id="request-organizer-btn" class="btn btn-primary">Request Organizer Role</button>
      `;
      break;
    default: // 'none' or undefined
      content = `
        <h2>Become an Organizer</h2>
        <p style="margin-bottom: 20px; color: #666;">Want to create and manage your own events? Request to upgrade your account to an organizer.</p>
        <button id="request-organizer-btn" class="btn btn-primary">Request Organizer Role</button>
      `;
  }
  organizerSection.innerHTML = content;
  const requestBtn = document.getElementById("request-organizer-btn");
  if (requestBtn) {
    requestBtn.addEventListener("click", handleRequestOrganizerRole);
  }
}

async function handleRequestOrganizerRole() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const btn = document.getElementById("request-organizer-btn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    const data = await api.requestOrganizerRole(token);
    alert(data.message);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.reload();
  } catch (error) {
    alert(error.message);
    btn.disabled = false;
    btn.textContent = "Request Organizer Role";
  }
}

async function openAttendeesModal(eventId, eventTitle) {
  const attendeesModal = document.getElementById("attendeesModal");
  const attendeesListContainer = document.getElementById(
    "attendees-list-container",
  );
  const modalTitle = document.getElementById("attendees-modal-title");

  const token = localStorage.getItem("token");
  if (!token || !attendeesModal) return;

  modalTitle.textContent = `Attendees for "${eventTitle}"`;
  attendeesListContainer.innerHTML = `<p>Loading attendees...</p>`;
  attendeesModal.style.display = "flex";

  try {
    const bookings = await api.getEventBookings(eventId, token);

    if (bookings.length === 0) {
      attendeesListContainer.innerHTML =
        "<p>No one has booked this event yet.</p>";
      return;
    }

    const attendeesHtml = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid #ddd;">
            <th style="padding: 8px;">Username</th>
            <th style="padding: 8px;">Email</th>
            <th style="padding: 8px;">Tickets Booked</th>
          </tr>
        </thead>
        <tbody>
          ${bookings
            .map(
              (booking) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px;">${booking.user?.username || "Deleted User"}</td>
              <td style="padding: 8px;">${booking.user?.email || "N/A"}</td>
              <td style="padding: 8px;">${booking.tickets}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
    attendeesListContainer.innerHTML = attendeesHtml;
  } catch (error) {
    console.error("Error fetching attendees:", error);
    attendeesListContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
  }
}
