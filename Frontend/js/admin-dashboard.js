const BASE_URL = "http://127.0.0.1:3000/api";
let currentEditEventId = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadDashboardStats();
  loadEvents();
  loadBookings();
  loadActiveUsers();
  loadOrganizerRequests(); // Also load requests on initial page load to get the count

  // Setup event form
  document
    .getElementById("editEventForm")
    .addEventListener("submit", handleUpdateEvent);

  // Close modals on outside click
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.classList.remove("show");
    }
  });
});

// Check if user is authenticated and is admin
function checkAuth() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token || user.role !== "admin") {
    window.location.href = "admin-login.html";
    return;
  }

  document.getElementById("user-name").textContent = user.username || "Admin";
  document.body.style.display = "block";
}

// Logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "admin-login.html";
}

// Get auth headers
function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

// Show alert
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alert-container");
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertContainer.innerHTML = "";
  alertContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    const response = await fetch(`${BASE_URL}/admin/stats`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load stats");

    const data = await response.json();

    document.getElementById("total-events").textContent = data.totalEvents;
    document.getElementById("total-bookings").textContent = data.totalBookings;
    document.getElementById("active-users").textContent = data.activeUsers;
    document.getElementById("total-revenue").textContent =
      `₹${data.totalRevenue.toFixed(2)}`;
  } catch (error) {
    console.error("Error loading stats:", error);
    showAlert("Failed to load statistics", "danger");
  }
}

// Load Organizer Requests
async function loadOrganizerRequests() {
  try {
    const response = await fetch(`${BASE_URL}/admin/organizer-requests`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load organizer requests");

    const requests = await response.json();
    const container = document.getElementById("requests-container");
    const countBadge = document.getElementById("requests-count-badge");

    if (countBadge) {
      countBadge.textContent = requests.length;
      countBadge.style.display = requests.length > 0 ? "inline-block" : "none";
    }

    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>No pending organizer requests.</p></div>';
      return;
    }

    let html =
      "<table><thead><tr><th>Username</th><th>Email</th><th>Request Date</th><th>Actions</th></tr></thead><tbody>";

    requests.forEach((request) => {
      const date = new Date(request.createdAt).toLocaleString();
      html += `
        <tr>
          <td><strong>${request.username}</strong></td>
          <td>${request.email}</td>
          <td>${date}</td>
          <td>
            <div class="btn-group">
              <button class="btn btn-edit" onclick="approveRequest('${request._id}', '${request.username}')">Approve</button>
              <button class="btn btn-delete" onclick="rejectRequest('${request._id}', '${request.username}')">Reject</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (error) {
    console.error("Error loading organizer requests:", error);
  }
}

// Load events
async function loadEvents() {
  try {
    const response = await fetch(`${BASE_URL}/admin/events`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load events");

    const events = await response.json();

    const now = new Date();
    const upcomingEvents = events.filter((e) => new Date(e.date) >= now);
    const pastEvents = events.filter((e) => new Date(e.date) < now);

    renderEventsList(
      upcomingEvents,
      "upcoming-events-container",
      "No upcoming events found",
    );
    renderEventsList(
      pastEvents,
      "past-events-container",
      "No past events found",
    );
  } catch (error) {
    console.error("Error loading events:", error);
    document.getElementById("upcoming-events-container").innerHTML =
      '<div class="empty-state"><p>Error loading events</p></div>';
  }
}

function renderEventsList(events, containerId, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>${emptyMessage}</p></div>`;
    return;
  }

  let html =
    "<table><thead><tr><th>Title</th><th>Date</th><th>Location</th><th>Price</th><th>Tickets</th><th>Booked</th><th>Actions</th></tr></thead><tbody>";

  events.forEach((event) => {
    const date = new Date(event.date).toLocaleString();
    const available = event.totalTickets - (event.bookedTickets || 0);
    const status = available > 0 ? "success" : "danger";

    html += `
        <tr>
          <td><strong>${event.title}</strong></td>
          <td>${date}</td>
          <td>${event.location}</td>
          <td>₹${event.price}</td>
          <td>${event.totalTickets}</td>
          <td><span class="badge badge-${status}">${event.bookedTickets || 0}/${
            event.totalTickets
          }</span></td>
          <td>
            <div class="btn-group">
              <button class="btn btn-edit" onclick="openEditEvent('${
                event._id
              }', '${event.title}', '${event.date}', '${event.location}', '${
                event.description
              }', ${event.price}, ${event.totalTickets})">Edit</button>
              <button class="btn btn-edit" onclick="viewEventBookings('${
                event._id
              }', '${event.title}')">Bookings</button>
              <button class="btn btn-delete" onclick="deleteEvent('${
                event._id
              }', '${event.title}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// Load bookings
async function loadBookings() {
  try {
    const response = await fetch(`${BASE_URL}/admin/bookings`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load bookings");

    const bookings = await response.json();
    const container = document.getElementById("bookings-container");

    if (bookings.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>No bookings found</p></div>';
      return;
    }

    let html =
      "<table><thead><tr><th>User</th><th>Event</th><th>Tickets</th><th>Total Price</th><th>Date</th><th>Actions</th></tr></thead><tbody>";

    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt).toLocaleString();
      const user = booking.user || { username: "Deleted User", email: "N/A" };
      const event = booking.event || { title: "Deleted Event" };

      html += `
        <tr>
          <td><strong>${user.username}</strong><br><small>${user.email}</small></td>
          <td>${event.title}</td>
          <td>${booking.tickets}</td>
          <td>₹${booking.totalPrice.toFixed(2)}</td>
          <td>${date}</td>
          <td>
            <button class="btn btn-cancel" onclick="cancelBooking('${
              booking._id
            }', '${event.title.replace(/'/g, "\\'")}')">Cancel</button>
          </td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (error) {
    console.error("Error loading bookings:", error);
    document.getElementById("bookings-container").innerHTML =
      '<div class="empty-state"><p>Error loading bookings</p></div>';
  }
}

// Load active users
async function loadActiveUsers() {
  try {
    const response = await fetch(`${BASE_URL}/admin/users/active`, {
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to load users");

    const users = await response.json();
    const container = document.getElementById("users-container");

    if (users.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>No active users found</p></div>';
      return;
    }

    let html =
      "<table><thead><tr><th>Username</th><th>Email</th><th>Total Bookings</th><th>Total Spent</th></tr></thead><tbody>";

    users.forEach((user) => {
      html += `
        <tr>
          <td><strong>${user.username}</strong></td>
          <td>${user.email}</td>
          <td>${user.bookingCount}</td>
          <td>₹${user.totalSpent.toFixed(2)}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (error) {
    console.error("Error loading users:", error);
    document.getElementById("users-container").innerHTML =
      '<div class="empty-state"><p>Error loading users</p></div>';
  }
}

// Switch tabs
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Remove active from all buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Show selected tab
  document.getElementById(tabName).classList.add("active");
  event.target.classList.add("active");

  // Reload data for the selected tab
  if (tabName === "events") {
    loadEvents();
  } else if (tabName === "bookings") {
    loadBookings();
  } else if (tabName === "users") {
    loadActiveUsers();
  } else if (tabName === "requests") {
    loadOrganizerRequests();
  }
}

// Open edit event modal
function openEditEvent(
  id,
  title,
  date,
  location,
  description,
  price,
  totalTickets,
) {
  currentEditEventId = id;
  document.getElementById("event-title").value = title;
  document.getElementById("event-date").value = new Date(date)
    .toISOString()
    .slice(0, 16);
  document.getElementById("event-location").value = location;
  document.getElementById("event-description").value = description;
  document.getElementById("event-price").value = price;
  document.getElementById("event-tickets").value = totalTickets;

  document.getElementById("editEventModal").classList.add("show");
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("show");
}

// Handle update event
async function handleUpdateEvent(e) {
  e.preventDefault();

  if (!currentEditEventId) return;

  const data = {
    title: document.getElementById("event-title").value,
    date: document.getElementById("event-date").value,
    location: document.getElementById("event-location").value,
    description: document.getElementById("event-description").value,
    price: parseFloat(document.getElementById("event-price").value),
    totalTickets: parseInt(document.getElementById("event-tickets").value),
  };

  try {
    const response = await fetch(
      `${BASE_URL}/admin/events/${currentEditEventId}`,
      {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) throw new Error("Failed to update event");

    showAlert("Event updated successfully", "success");
    closeModal("editEventModal");
    loadEvents();
    loadDashboardStats();
  } catch (error) {
    console.error("Error updating event:", error);
    showAlert("Failed to update event", "danger");
  }
}

// Delete event
async function deleteEvent(id, title) {
  if (
    !confirm(
      `Are you sure you want to delete "${title}"? This will also cancel all associated bookings.`,
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/events/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to delete event");

    showAlert("Event deleted successfully", "success");
    loadEvents();
    loadBookings();
    loadDashboardStats();
  } catch (error) {
    console.error("Error deleting event:", error);
    showAlert("Failed to delete event", "danger");
  }
}

// View event bookings
async function viewEventBookings(eventId, eventTitle) {
  const modal = document.getElementById("eventBookingsModal");
  const content = document.getElementById("event-bookings-content");

  try {
    const response = await fetch(
      `${BASE_URL}/admin/events/${eventId}/bookings`,
      {
        headers: getHeaders(),
      },
    );

    if (!response.ok) throw new Error("Failed to load bookings");

    const data = await response.json();

    if (data.bookings.length === 0) {
      content.innerHTML =
        '<div class="empty-state"><p>No bookings for this event</p></div>';
      modal.classList.add("show");
      return;
    }

    let html = `<p style="margin-bottom: 20px;"><strong>Event:</strong> ${eventTitle}</p>`;
    html += `<p style="margin-bottom: 20px;"><strong>Total Bookings:</strong> ${data.totalBookings} | <strong>Total Tickets Booked:</strong> ${data.totalTickets}</p>`;
    html +=
      "<table><thead><tr><th>User</th><th>Email</th><th>Tickets</th><th>Actions</th></tr></thead><tbody>";

    data.bookings.forEach((booking) => {
      const user = booking.user || { username: "Deleted User", email: "N/A" };
      html += `
        <tr>
          <td><strong>${user.username}</strong></td>
          <td>${user.email}</td>
          <td>${booking.tickets}</td>
          <td>
            <button class="btn btn-cancel" onclick="cancelBooking('${booking._id}', '${eventTitle}')">Cancel</button>
          </td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    content.innerHTML = html;
    modal.classList.add("show");
  } catch (error) {
    console.error("Error loading event bookings:", error);
    content.innerHTML =
      '<div class="empty-state"><p>Error loading bookings</p></div>';
    modal.classList.add("show");
  }
}

// Cancel booking
async function cancelBooking(bookingId, eventTitle) {
  if (
    !confirm(
      `Are you sure you want to cancel this booking for "${eventTitle}"?`,
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/admin/bookings/${bookingId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to cancel booking");

    showAlert("Booking cancelled successfully", "success");
    loadBookings();
    loadDashboardStats();
    document.getElementById("eventBookingsModal").classList.remove("show");
  } catch (error) {
    console.error("Error canceling booking:", error);
    showAlert("Failed to cancel booking", "danger");
  }
}

// Approve Organizer Request
async function approveRequest(userId, username) {
  if (
    !confirm(`Are you sure you want to approve ${username} as an organizer?`)
  ) {
    return;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/admin/organizer-requests/${userId}/approve`,
      {
        method: "POST",
        headers: getHeaders(),
      },
    );

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to approve request");

    showAlert(data.message, "success");
    loadOrganizerRequests(); // Refresh the list
  } catch (error) {
    console.error("Error approving request:", error);
    showAlert(error.message, "danger");
  }
}

// Reject Organizer Request
async function rejectRequest(userId, username) {
  if (!confirm(`Are you sure you want to reject ${username}'s request?`)) {
    return;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/admin/organizer-requests/${userId}/reject`,
      {
        method: "POST",
        headers: getHeaders(),
      },
    );

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to reject request");

    showAlert(data.message, "success");
    loadOrganizerRequests(); // Refresh the list
  } catch (error) {
    console.error("Error rejecting request:", error);
    showAlert(error.message, "danger");
  }
}
