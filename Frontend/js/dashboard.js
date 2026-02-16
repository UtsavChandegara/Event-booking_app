import api from "./api.js";

const PLACEHOLDER_300x200 = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20200%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A15pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2294.5%22%20y%3D%22106%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E`;

document.addEventListener("DOMContentLoaded", init);

function init() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  loadBookedEvents();
  loadCreatedEvents();
  setupEventListeners();
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
}

async function loadBookedEvents() {
  const container = document.getElementById("booked-events-container");
  if (!container) return;
  container.innerHTML = "<p>Loading your booked events...</p>";

  try {
    const token = localStorage.getItem("token");
    const bookings = await api.getUserBookings(token, "all");
    const validBookings = bookings.filter((booking) => booking.event);

    if (validBookings.length === 0) {
      container.innerHTML = "<p>You have no booked events.</p>";
      return;
    }

    container.innerHTML = validBookings
      .map((booking) => {
        const event = booking.event;
        const imageUrl = getImageUrl(event.imageUrl);
        return `
        <div class="event-card" id="booking-${booking._id}">
            <img src="${imageUrl}" alt="${event.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_300x200}';">
            <div class="event-card-content">
                <h3>${event.title}</h3>
                <p>${event.description}</p>
                <div class="event-card-footer">
                    <div>
                        <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                        <p><strong>Tickets:</strong> ${booking.tickets}</p>
                    </div>
                    <button class="btn btn-danger cancel-booking-btn" data-booking-id="${booking._id}">Cancel</button>
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
        <div class="event-card" id="event-${event._id}">
            <img src="${imageUrl}" alt="${event.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_300x200}';">
            <div class="event-card-content">
                <h3>${event.title}</h3>
                <p>${event.description}</p>
                <p style="margin-top: 10px; color: #28a745; font-weight: 500;"><i class="fas fa-ticket-alt"></i> Tickets Sold: ${event.bookedTickets || 0} / ${event.totalTickets || "N/A"}</p>
                <div class="event-card-footer">
                    <span>${new Date(event.date).toLocaleDateString()}</span>
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
  return `http://127.0.0.1:3000/${path}`;
}

async function handleBookedEventsClick(e) {
  if (e.target.classList.contains("cancel-booking-btn")) {
    const bookingId = e.target.dataset.bookingId;
    if (confirm("Are you sure you want to cancel this booking?")) {
      try {
        const token = localStorage.getItem("token");
        await api.cancelBooking(bookingId, token);
        document.getElementById(`booking-${bookingId}`)?.remove();
        alert("Booking cancelled successfully.");
      } catch (error) {
        console.error("Error cancelling booking:", error);
        alert("Failed to cancel booking.");
      }
    }
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
