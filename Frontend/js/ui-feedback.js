(function () {
  const FEEDBACK_ROOT_ID = "app-feedback-root";

  function ensureMarkup() {
    if (document.getElementById(FEEDBACK_ROOT_ID)) {
      return document.getElementById(FEEDBACK_ROOT_ID);
    }

    const root = document.createElement("div");
    root.id = FEEDBACK_ROOT_ID;
    root.className = "app-feedback";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <div class="app-feedback__backdrop"></div>
      <div class="app-feedback__dialog" role="dialog" aria-modal="true" aria-labelledby="app-feedback-title">
        <div class="app-feedback__badge" id="app-feedback-badge"></div>
        <h2 class="app-feedback__title" id="app-feedback-title">Notice</h2>
        <p class="app-feedback__message" id="app-feedback-message"></p>
        <div class="app-feedback__copy-wrap" id="app-feedback-copy-wrap" hidden>
          <input class="app-feedback__copy-input" id="app-feedback-copy-input" type="text" readonly>
        </div>
        <div class="app-feedback__actions">
          <button type="button" class="btn btn-secondary" id="app-feedback-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="app-feedback-confirm">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    return root;
  }

  function getElements() {
    const root = ensureMarkup();
    return {
      root,
      badge: document.getElementById("app-feedback-badge"),
      title: document.getElementById("app-feedback-title"),
      message: document.getElementById("app-feedback-message"),
      copyWrap: document.getElementById("app-feedback-copy-wrap"),
      copyInput: document.getElementById("app-feedback-copy-input"),
      cancel: document.getElementById("app-feedback-cancel"),
      confirm: document.getElementById("app-feedback-confirm"),
    };
  }

  let currentResolver = null;
  let currentMode = "alert";
  let escapeHandler = null;

  function close(result) {
    const { root, copyWrap, copyInput } = getElements();
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    root.classList.remove("is-success", "is-error", "is-info");
    copyWrap.hidden = true;
    copyInput.value = "";
    document.body.classList.remove("feedback-open");
    if (escapeHandler) {
      window.removeEventListener("keydown", escapeHandler);
      escapeHandler = null;
    }

    const resolver = currentResolver;
    currentResolver = null;
    currentMode = "alert";
    if (typeof resolver === "function") {
      resolver(result);
    }
  }

  function open(options) {
    const {
      type = "info",
      title = "Notice",
      message = "",
      confirmLabel = "OK",
      cancelLabel = "Cancel",
      mode = "alert",
      value = "",
      dismissible = true,
    } = options || {};

    const elements = getElements();
    currentMode = mode;

    elements.root.classList.remove("is-success", "is-error", "is-info");
    elements.root.classList.add("is-open", `is-${type}`);
    elements.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("feedback-open");

    elements.badge.textContent =
      type === "success" ? "Success" : type === "error" ? "Error" : "Notice";
    elements.title.textContent = title;
    elements.message.textContent = message;
    elements.confirm.textContent = confirmLabel;
    elements.cancel.textContent = cancelLabel;
    elements.cancel.style.display = mode === "confirm" ? "inline-flex" : "none";
    elements.copyWrap.hidden = mode !== "copy";
    elements.copyInput.value = value || "";
    elements.copyInput.readOnly = true;

    return new Promise((resolve) => {
      currentResolver = resolve;

      elements.confirm.onclick = async () => {
        if (mode === "copy" && elements.copyInput.value) {
          if (navigator.clipboard && window.isSecureContext) {
            try {
              await navigator.clipboard.writeText(elements.copyInput.value);
            } catch (error) {
              elements.copyInput.focus();
              elements.copyInput.select();
            }
          } else {
            elements.copyInput.focus();
            elements.copyInput.select();
          }
          close(elements.copyInput.value);
          return;
        }

        close(true);
      };

      elements.cancel.onclick = () => close(false);

      elements.root.onclick = (event) => {
        if (event.target !== elements.root && !event.target.classList.contains("app-feedback__backdrop")) {
          return;
        }

        if (!dismissible) {
          return;
        }

        close(mode === "confirm" ? false : true);
      };

      if (escapeHandler) {
        window.removeEventListener("keydown", escapeHandler);
      }
      escapeHandler = (event) => {
        if (event.key === "Escape" && dismissible) {
          close(mode === "confirm" ? false : true);
        }
      };
      window.addEventListener("keydown", escapeHandler);
    });
  }

  const feedback = {
    alert(message, options = {}) {
      return open({
        type: options.type || "info",
        title: options.title || "Notice",
        message: String(message || ""),
        confirmLabel: options.confirmLabel || "OK",
        mode: "alert",
        dismissible: options.dismissible !== false,
      });
    },
    confirm(message, options = {}) {
      return open({
        type: options.type || "info",
        title: options.title || "Please Confirm",
        message: String(message || ""),
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        mode: "confirm",
        dismissible: options.dismissible !== false,
      });
    },
    copy(message, value, options = {}) {
      return open({
        type: options.type || "info",
        title: options.title || "Copy Link",
        message: String(message || ""),
        confirmLabel: options.confirmLabel || "Copy",
        cancelLabel: options.cancelLabel || "Close",
        mode: "copy",
        value: String(value || ""),
        dismissible: options.dismissible !== false,
      });
    },
  };

  window.appFeedback = feedback;
  window.alert = function (message) {
    feedback.alert(message);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureMarkup, { once: true });
  } else {
    ensureMarkup();
  }
})();
