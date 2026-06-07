const header = document.querySelector("[data-elevate]");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const form = document.querySelector("#adminForm");
const statusText = document.querySelector(".form-status");
const portalForms = document.querySelectorAll(".portal-form");
const loginModal = document.querySelector("#loginModal");
const loginTriggers = document.querySelectorAll("[data-login-trigger]");
const loginPanels = document.querySelectorAll("[data-login-panel]");
const loginCloseButtons = document.querySelectorAll("[data-login-close]");

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

function openLoginModal(panelName) {
  loginPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.loginPanel === panelName);
  });
  loginModal.classList.add("is-open");
  loginModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  loginModal.querySelector(".login-panel.is-active input").focus();
}

function closeLoginModal() {
  loginModal.classList.remove("is-open");
  loginModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

loginTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    openLoginModal(trigger.dataset.loginTrigger);
  });
});

loginCloseButtons.forEach((button) => {
  button.addEventListener("click", closeLoginModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && loginModal.classList.contains("is-open")) {
    closeLoginModal();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const name = data.get("name").trim();
  const email = data.get("email").trim();
  const topic = data.get("topic");
  const message = data.get("message").trim();

  if (!name || !email || !topic || !message) {
    statusText.textContent = "Please complete every field before sending.";
    return;
  }

  const subject = encodeURIComponent(`LexVora admin query: ${topic}`);
  const body = encodeURIComponent(
    `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}`
  );

  statusText.textContent = "Opening your email app with the message prepared.";
  window.location.href = `mailto:support@lexvora.in?subject=${subject}&body=${body}`;
});

portalForms.forEach((portalForm) => {
  portalForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const portalName = portalForm.dataset.portal || "Portal";
    const portalStatus = portalForm.querySelector(".portal-status");
    portalStatus.textContent = `${portalName} login is ready for backend connection.`;
  });
});

window.addEventListener("load", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
