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
const logoutButtons = document.querySelectorAll("[data-logout]");
const lawyerEnquiryForm = document.querySelector("#lawyerEnquiryForm");
const caseFormStatus = document.querySelector("#caseFormStatus");

const demoUsers = {
  Customer: {
    email: "customer@lexvora.in",
    password: "Customer@123",
    role: "customer",
  },
  Admin: {
    email: "admin@lexvora.in",
    password: "Admin@123",
    role: "admin",
  },
};

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

function showRoleHome(role) {
  document.body.classList.add("is-authenticated");
  document.body.dataset.role = role;
  closeLoginModal();
  window.location.hash = role === "admin" ? "admin-home" : "customer-home";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function logout() {
  document.body.classList.remove("is-authenticated");
  delete document.body.dataset.role;
  portalForms.forEach((portalForm) => portalForm.reset());
  window.location.hash = "home";
  window.scrollTo({ top: 0, behavior: "smooth" });
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

logoutButtons.forEach((button) => {
  button.addEventListener("click", logout);
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
    const credentials = demoUsers[portalName];
    const email = portalForm.elements.email.value.trim();
    const password = portalForm.elements.password.value;

    if (email === credentials.email && password === credentials.password) {
      portalStatus.textContent = "Login successful. Opening your home page.";
      showRoleHome(credentials.role);
      return;
    }

    portalStatus.textContent = "Invalid demo login details. Please check the email and password.";
  });
});

lawyerEnquiryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  caseFormStatus.textContent =
    "Demo enquiry submitted. In the real system, these details will be shared with the selected lawyer and their contact details will be shared with you.";
  lawyerEnquiryForm.reset();
});

window.addEventListener("load", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
