import api from "./api.js";

const PLACEHOLDER_300x200 = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20200%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A15pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2294.5%22%20y%3D%22106%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E`;

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  // Basic Auth Check
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Initial data load
  loadProfile();
  loadBookings("all");

  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  document
    .getElementById("edit-profile-btn")
    .addEventListener("click", openEditProfileModal);
  document
    .getElementById("edit-profile-form")
    .addEventListener("submit", handleUpdateProfile);
  document
    .getElementById("change-password-form")
    .addEventListener("submit", handleChangePassword);

  // Modal close buttons
  document.querySelectorAll(".modal .close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.target.closest(".modal").style.display = "none";
    });
  });

  // Booking filters
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      loadBookings(e.target.dataset.status);
    });
  });

  // Dynamic listener for cancel/e-ticket buttons
  document
    .getElementById("bookings-container")
    .addEventListener("click", (e) => {
      if (e.target.classList.contains("cancel-booking-btn")) {
        handleCancelBooking(e.target.dataset.bookingId);
      }
      if (e.target.classList.contains("view-eticket-btn")) {
        viewETicket(e.target.dataset.bookingId);
      }
    });

  // Listener for created events container
  document
    .getElementById("created-events-container")
    .addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-event-btn")) {
        handleDeleteCreatedEvent(e.target.dataset.eventId);
      }
      if (e.target.classList.contains("view-attendees-btn")) {
        openAttendeesModal(
          e.target.dataset.eventId,
          e.target.dataset.eventTitle,
        );
      }
    });
}

function showAlert(message, type = "success") {
  const container = document.getElementById("alert-container");
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  container.innerHTML = "";
  container.appendChild(alert);
  setTimeout(() => (container.innerHTML = ""), 5000);
}

async function loadProfile() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("profile-details-container");
  try {
    const user = await api.getUserProfile(token);
    currentUser = user; // Store user data globally for modals
    container.innerHTML = `
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Member Since:</strong> ${new Date(
              user.createdAt,
            ).toLocaleDateString()}</p>
            <p><strong>Phone:</strong> ${user.phone || "Not provided"}</p>
            <p><strong>City:</strong> ${user.city || "Not provided"}</p>
        `;

    // --- Integration Logic ---
    // Show 'My Events' tab and load them if user is an organizer/admin
    if (user.role === "organizer" || user.role === "admin") {
      document.getElementById("my-events-tab-btn").style.display = "block";
      loadCreatedEvents(user._id);
    }

    // Show 'Become an Organizer' section if user is a regular user
    if (user.role === "user") {
      setupOrganizerRequestSection(user);
    }
  } catch (error) {
    container.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

async function loadBookings(status) {
  const token = localStorage.getItem("token");
  const container = document.getElementById("bookings-container");
  container.innerHTML = "<p>Loading bookings...</p>";
  try {
    const bookings = await api.getUserBookings(token, status);

    if (bookings.length === 0) {
      container.innerHTML = "<p>No bookings found for this filter.</p>";
      return;
    }

    container.innerHTML = bookings
      .map((booking) => {
        if (!booking.event) {
          return `
                <div class="booking-card cancelled-event">
                    <p><strong>Booking ID: ${booking._id}</strong></p>
                    <p>This event has been removed by the organizer.</p>
                </div>`;
        }
        const isUpcoming = new Date(booking.event.date) >= new Date();
        return `
            <div class="booking-card">
                <h4>${booking.event.title}</h4>
                <p><strong>Event Date:</strong> ${new Date(
                  booking.event.date,
                ).toLocaleString()}</p>
                <p><strong>Tickets:</strong> ${booking.tickets}</p>
                <p><strong>Total:</strong> ₹${booking.totalPrice.toFixed(2)}</p>
                <div class="booking-actions">
                    <button class="btn btn-secondary view-eticket-btn" data-booking-id="${
                      booking._id
                    }">View E-Ticket</button>
                    ${
                      isUpcoming
                        ? `<button class="btn btn-danger cancel-booking-btn" data-booking-id="${booking._id}">Cancel</button>`
                        : ""
                    }
                </div>
            </div>
        `;
      })
      .join("");
  } catch (error) {
    container.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

async function loadCreatedEvents(userId) {
  const container = document.getElementById("created-events-container");
  container.innerHTML = "<p>Loading your events...</p>";

  try {
    const allEvents = await api.getAllEvents();
    const myEvents = allEvents.filter(
      (event) => event && event.createdBy && event.createdBy._id === userId,
    );

    if (myEvents.length === 0) {
      container.innerHTML = "<p>You have not created any events.</p>";
      return;
    }

    container.innerHTML = myEvents
      .map((event) => {
        let imageUrl = PLACEHOLDER_300x200;
        if (event.imageUrl) {
          let path = event.imageUrl.trim().replace(/\\/g, "/");
          const uploadsIndex = path.indexOf("uploads/");
          if (uploadsIndex !== -1) {
            path = path.substring(uploadsIndex);
          }
          imageUrl = `http://127.0.0.1:3000/${path}`;
        }

        return `
            <div class="event-card">
                <img src="${imageUrl}" alt="${event.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_300x200}';">
                <div class="event-card-content">
                    <h3>${event.title}</h3>
                    <p style="margin-top: 10px; color: #28a745; font-weight: 500;"><i class="fas fa-ticket-alt"></i> Tickets Sold: ${
                      event.bookedTickets || 0
                    } / ${event.totalTickets || "N/A"}</p>
                    <div class="event-card-footer">
                        <span>${new Date(event.date).toLocaleDateString()}</span>
                        <div>
                            <button class="btn btn-secondary view-attendees-btn" data-event-id="${
                              event._id
                            }" data-event-title="${
                              event.title
                            }" style="margin-right: 5px;">Attendees</button>
                            <a href="edit-event.html?id=${
                              event._id
                            }" class="btn" style="margin-right: 5px;">Edit</a>
                            <button class="btn btn-danger delete-event-btn" data-event-id="${
                              event._id
                            }">Delete</button>
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

async function handleDeleteCreatedEvent(eventId) {
  if (!confirm("Are you sure you want to delete this event?")) return;

  const token = localStorage.getItem("token");
  try {
    await api.deleteEvent(eventId, token);
    showAlert("Event deleted successfully.");
    // Reload created events to reflect the change
    if (currentUser) {
      loadCreatedEvents(currentUser._id);
    }
  } catch (error) {
    showAlert(error.message, "error");
  }
}

function openEditProfileModal() {
  if (!currentUser) return;
  document.getElementById("edit-username").value = currentUser.username;
  document.getElementById("edit-email").value = currentUser.email;
  document.getElementById("edit-phone").value = currentUser.phone || "";
  document.getElementById("edit-city").value = currentUser.city || "";
  document.getElementById("edit-profile-modal").style.display = "flex";
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = "Saving...";

  const profileData = {
    username: document.getElementById("edit-username").value,
    email: document.getElementById("edit-email").value,
    phone: document.getElementById("edit-phone").value,
    city: document.getElementById("edit-city").value,
  };

  try {
    const result = await api.updateUserProfile(profileData, token);
    showAlert(result.message);
    localStorage.setItem("user", JSON.stringify(result.user)); // Update user in local storage
    loadProfile(); // Refresh profile display
    document.getElementById("edit-profile-modal").style.display = "none";
  } catch (error) {
    showAlert(error.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const btn = e.target.querySelector('button[type="submit"]');

  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword !== confirmPassword) {
    showAlert("New passwords do not match.", "error");
    return;
  }
  if (newPassword.length < 6) {
    showAlert("Password must be at least 6 characters.", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Changing...";

  try {
    const result = await api.changePassword(
      { currentPassword, newPassword },
      token,
    );
    showAlert(result.message);
    e.target.reset(); // Clear the form
  } catch (error) {
    showAlert(error.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Change Password";
  }
}

async function handleCancelBooking(bookingId) {
  if (!confirm("Are you sure you want to cancel this booking?")) return;

  const token = localStorage.getItem("token");
  try {
    await api.cancelBooking(bookingId, token);
    showAlert("Booking cancelled successfully.");
    loadBookings(document.querySelector(".filter-btn.active").dataset.status); // Refresh list
  } catch (error) {
    showAlert(error.message, "error");
  }
}

async function viewETicket(bookingId) {
  const token = localStorage.getItem("token");
  const modal = document.getElementById("eticket-modal");
  const content = document.getElementById("eticket-content");
  content.innerHTML = "<p>Loading ticket...</p>";
  modal.style.display = "flex";

  try {
    // For this to work, you need an endpoint to get a single booking's details
    // We'll simulate it by finding it in the full list for now.
    const allBookings = await api.getUserBookings(token, "all");
    const booking = allBookings.find((b) => b._id === bookingId);

    if (!booking || !booking.event) {
      throw new Error("Booking details not found.");
    }

    // Basic E-Ticket content
    content.innerHTML = `
            <h3>${booking.event.title}</h3>
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p><strong>Booked By:</strong> ${currentUser.username}</p>
            <p><strong>Date:</strong> ${new Date(
              booking.event.date,
            ).toLocaleString()}</p>
            <p><strong>Location:</strong> ${booking.event.location}</p>
            <p><strong>Tickets:</strong> ${booking.tickets}</p>
            <hr>
            <p>Please present this ticket at the entrance.</p>
            <div id="qrcode"></div>
        `;

    // Optional: Generate a QR Code
    // You would need to include a library like qrcode.js for this.
    // new QRCode(document.getElementById("qrcode"), booking._id);
  } catch (error) {
    content.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

function setupOrganizerRequestSection(user) {
  const organizerSection = document.getElementById("organizer-section");
  if (!organizerSection) return;

  organizerSection.style.display = "block";
  switch (user.organizerRequestStatus) {
    case "pending":
      organizerSection.innerHTML = `
              <h3>Request Pending</h3>
              <p>Your request to become an organizer is currently under review.</p>
          `;
      break;
    case "rejected":
      organizerSection.innerHTML = `
              <h3>Become an Organizer</h3>
              <p style="color: #dc3545;">Your previous request was not approved. You may submit another request for review.</p>
              <button id="request-organizer-btn" class="btn">Request Organizer Role</button>
          `;
      document
        .getElementById("request-organizer-btn")
        .addEventListener("click", handleRequestOrganizerRole);
      break;
    default: // 'none' or undefined
      organizerSection.innerHTML = `
              <h3>Become an Organizer</h3>
              <p>Want to create and manage your own events? Request to upgrade your account.</p>
              <button id="request-organizer-btn" class="btn">Request Organizer Role</button>
          `;
      document
        .getElementById("request-organizer-btn")
        .addEventListener("click", handleRequestOrganizerRole);
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
    showAlert(data.message);
    // Update user in localStorage to reflect new status and reload
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.reload();
  } catch (error) {
    showAlert(error.message, "error");
    btn.disabled = false;
    btn.textContent = "Request Organizer Role";
  }
}

async function openAttendeesModal(eventId, eventTitle) {
  const token = localStorage.getItem("token");
  if (!token) return;

  const modal = document.getElementById("attendeesModal");
  const attendeesListContainer = document.getElementById(
    "attendees-list-container",
  );
  const modalTitle = document.getElementById("attendees-modal-title");

  modalTitle.textContent = `Attendees for "${eventTitle}"`;
  attendeesListContainer.innerHTML = `<p>Loading attendees...</p>`;
  modal.style.display = "flex";

  try {
    const bookings = await api.getEventBookings(eventId, token);

    if (bookings.length === 0) {
      attendeesListContainer.innerHTML =
        "<p>No one has booked this event yet.</p>";
      return;
    }

    let attendeesHtml = `
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Tickets</th>
          </tr>
        </thead>
        <tbody>
    `;

    bookings.forEach((booking) => {
      const user = booking.user || { username: "Deleted User", email: "N/A" };
      attendeesHtml += `
        <tr>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${booking.tickets}</td>
        </tr>
      `;
    });

    attendeesHtml += `</tbody></table>`;
    attendeesListContainer.innerHTML = attendeesHtml;
  } catch (error) {
    console.error("Error fetching attendees:", error);
    attendeesListContainer.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

function switchTab(tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));

  document.getElementById(tabName).classList.add("active");
  document
    .querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`)
    .classList.add("active");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Make functions globally accessible for inline HTML onclick attributes
window.switchTab = switchTab;
window.logout = logout;
