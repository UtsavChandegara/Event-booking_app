import api from "./api.js";

const PLACEHOLDER_300x200 = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20200%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A15pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2294.5%22%20y%3D%22106%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E`;

document.addEventListener("DOMContentLoaded", () => {
  const eventsGrid = document.getElementById("events-grid");
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!eventsGrid) return;

  api
    .getAllEvents()
    .then((data) => {
      const events = Array.isArray(data) ? data : data.events || [];

      if (events.length === 0) {
        eventsGrid.innerHTML = "<p>No events found at the moment.</p>";
        return;
      }

      eventsGrid.innerHTML = events
        .map((event) => {
          const eventDate = new Date(event.date).toLocaleDateString();
          const canManage =
            user &&
            (user.role === "admin" ||
              (event.createdBy && user._id === event.createdBy._id));

          let imageUrl = PLACEHOLDER_300x200;
          if (event.imageUrl) {
            let path = event.imageUrl.trim().replace(/\\/g, "/");
            const uploadsIndex = path.indexOf("uploads/");
            if (uploadsIndex !== -1) {
              path = path.substring(uploadsIndex);
            }
            if (path.startsWith("http") || path.startsWith("data:")) {
              imageUrl = path;
            } else {
              imageUrl = `http://127.0.0.1:3000/${path}`;
            }
          }

          return `
                <div class="event-card">
                    <img src="${imageUrl}" alt="${event.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_300x200}';">
                    <div class="event-card-content">
                        <h3>${event.title}</h3>
                        <p>${event.description}</p>
                        <div class="event-card-footer">
                            <span>${eventDate}</span>
                            <button class="btn btn-primary book-btn" data-event-id="${
                              event._id
                            }">Book Now</button>
                        </div>
                        ${
                          canManage
                            ? `<div class="admin-actions" style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 5px;">
                                <a href="edit-event.html?id=${event._id}" class="btn">Edit</a>
                                <button class="btn btn-danger delete-event-btn" data-event-id="${event._id}">Delete</button>
                              </div>`
                            : ""
                        }
                    </div>
                </div>
            `;
        })
        .join("");
    })
    .catch((error) => {
      console.error("Error fetching events:", error);
      eventsGrid.innerHTML =
        "<p>Failed to load events. Please try again later.</p>";
    });

  eventsGrid.addEventListener("click", async (e) => {
    const target = e.target;

    if (target.classList.contains("book-btn")) {
      const bookBtn = target;

      if (!token) {
        alert("Please log in to book an event.");
        window.location.href = "login.html";
        return;
      }

      const eventId = bookBtn.dataset.eventId;

      // Disable button to prevent multiple clicks and show loading state
      bookBtn.disabled = true;
      bookBtn.textContent = "Booking...";

      try {
        await api.createBooking({ eventId, tickets: 1 }, token);
        bookBtn.textContent = "Booked!";
        bookBtn.classList.remove("btn-primary");
        bookBtn.classList.add("btn-success"); // You may need to add a .btn-success style

        // Redirect to account page after a short delay
        setTimeout(() => (window.location.href = "account.html"), 1500);
      } catch (error) {
        console.error("Booking Error:", error);
        bookBtn.disabled = false;
        bookBtn.textContent = "Book Now";
        alert(error.message || "Booking failed. Please try again.");
      }
    }

    if (target.classList.contains("delete-event-btn")) {
      if (!token) {
        alert("You must be logged in to delete events.");
        return;
      }

      if (confirm("Are you sure you want to delete this event?")) {
        const eventId = target.dataset.eventId;
        try {
          await api.deleteEvent(eventId, token);
          target.closest(".event-card").remove();
          alert("Event deleted successfully.");
        } catch (error) {
          console.error("Error deleting event:", error);
          alert("Failed to delete event.");
        }
      }
    }
  });
});
