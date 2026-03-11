import api from "./api.js";

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  loadProfile();
  setupEventListeners();
});

function setupEventListeners() {
  document
    .getElementById("edit-profile-btn")
    ?.addEventListener("click", openEditProfileModal);

  document
    .getElementById("edit-profile-form")
    ?.addEventListener("submit", handleUpdateProfile);

  document
    .getElementById("change-password-form")
    ?.addEventListener("submit", handleChangePassword);

  document.querySelectorAll(".modal .close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.target.closest(".modal").style.display = "none";
    });
  });
}

function showAlert(message, type = "success") {
  const container = document.getElementById("alert-container");
  if (!container) return;

  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  container.innerHTML = "";
  container.appendChild(alert);
  setTimeout(() => {
    container.innerHTML = "";
  }, 4000);
}

function renderProfile(user) {
  const container = document.getElementById("profile-details-container");
  if (!container || !user) return;

  container.innerHTML = `
    <p><strong>Username:</strong> ${user.username}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Role:</strong> ${user.role}</p>
    <p><strong>Member Since:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
    <p><strong>Phone:</strong> ${user.phone || "Not provided"}</p>
    <p><strong>City:</strong> ${user.city || "Not provided"}</p>
  `;
}

async function loadProfile() {
  const token = localStorage.getItem("token");
  try {
    const user = await api.getUserProfile(token);
    currentUser = user;
    renderProfile(user);

    if (user.role === "user") {
      setupOrganizerRequestSection(user);
    }
  } catch (error) {
    const container = document.getElementById("profile-details-container");
    if (container) {
      container.innerHTML = `<p class="error">${error.message}</p>`;
    }
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
  const button = e.target.querySelector('button[type="submit"]');

  button.disabled = true;
  button.textContent = "Saving...";

  const profileData = {
    username: document.getElementById("edit-username").value,
    email: document.getElementById("edit-email").value,
    phone: document.getElementById("edit-phone").value,
    city: document.getElementById("edit-city").value,
  };

  try {
    const result = await api.updateUserProfile(profileData, token);
    currentUser = result.user;
    localStorage.setItem("user", JSON.stringify(result.user));

    renderProfile(result.user);
    showAlert(result.message || "Profile updated.");
    document.getElementById("edit-profile-modal").style.display = "none";
  } catch (error) {
    showAlert(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Save Changes";
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const button = e.target.querySelector('button[type="submit"]');

  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword !== confirmPassword) {
    showAlert("New passwords do not match.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Changing...";

  try {
    const result = await api.changePassword(
      { currentPassword, newPassword },
      token,
    );
    showAlert(result.message || "Password changed.");
    e.target.reset();
  } catch (error) {
    showAlert(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Change Password";
  }
}

function setupOrganizerRequestSection(user) {
  const organizerSection = document.getElementById("organizer-section");
  if (!organizerSection) return;

  organizerSection.style.display = "block";

  if (user.organizerRequestStatus === "pending") {
    organizerSection.innerHTML = `
      <h3>Request Pending</h3>
      <p>Your request to become an organizer is under review.</p>
    `;
    return;
  }

  const rejected = user.organizerRequestStatus === "rejected";
  organizerSection.innerHTML = `
    <h3>Become an Organizer</h3>
    <p ${rejected ? 'style="color: #dc3545;"' : ""}>
      ${
        rejected
          ? "Your previous request was rejected. You can submit again."
          : "Want to create events? Request organizer access."
      }
    </p>
    <button id="request-organizer-btn" class="btn">Request Organizer Role</button>
  `;

  document
    .getElementById("request-organizer-btn")
    ?.addEventListener("click", handleRequestOrganizerRole);
}

async function handleRequestOrganizerRole() {
  const token = localStorage.getItem("token");
  const btn = document.getElementById("request-organizer-btn");
  if (!token || !btn) return;

  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    const data = await api.requestOrganizerRole(token);
    localStorage.setItem("user", JSON.stringify(data.user));
    showAlert(data.message || "Request submitted.");
    window.location.reload();
  } catch (error) {
    showAlert(error.message, "error");
    btn.disabled = false;
    btn.textContent = "Request Organizer Role";
  }
}

function switchTab(tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));

  document.getElementById(tabName)?.classList.add("active");
  document
    .querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`)
    ?.classList.add("active");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

window.switchTab = switchTab;
window.logout = logout;
