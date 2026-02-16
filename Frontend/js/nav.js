document.addEventListener("DOMContentLoaded", () => {
  const navLinksContainer = document.getElementById("nav-links");
  if (!navLinksContainer) {
    console.error("Nav links container with id 'nav-links' not found.");
    return;
  }

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const getLink = (page, text) => {
    const isActive = currentPage === page ? 'class="active"' : "";
    return `<li><a href="${page}" ${isActive}>${text}</a></li>`;
  };

  let navLinksHTML =
    getLink("index.html", "Home") + getLink("events.html", "Events");

  if (token && user) {
    // --- User is Logged In ---
    navLinksHTML += getLink("account.html", "My Account");

    if (user.role === "organizer") {
      navLinksHTML += getLink("create-event.html", "Create Event");
    }
    if (user.role === "admin") {
      navLinksHTML += getLink("admin-dashboard.html", "Admin");
    }
  } else {
    // --- User is Logged Out ---
    navLinksHTML += getLink("login.html", "Login");
    // The register button has a special class, so we don't use getLink
    navLinksHTML += `<li><a href="register.html" class="btn btn-primary">Register</a></li>`;
  }

  navLinksContainer.innerHTML = navLinksHTML;
});
