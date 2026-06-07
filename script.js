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
const lawyerResults = document.querySelector("#lawyerResults");
const requestConsultationButton = document.querySelector("#requestConsultationButton");
const paymentModal = document.querySelector("#paymentModal");
const paymentForm = document.querySelector("#paymentForm");
const paymentStatus = document.querySelector("#paymentStatus");
const paymentCloseButtons = document.querySelectorAll("[data-payment-close]");
const lawyerProfileForm = document.querySelector("#lawyerProfileForm");
const lawyerProfileStatus = document.querySelector("#lawyerProfileStatus");
const adminLawyerList = document.querySelector("#adminLawyerList");
const adminRequestList = document.querySelector("#adminRequestList");

let selectedLawyerIds = new Set();
let latestCustomerEnquiry = null;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "API request failed");
  }

  return payload;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

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

function openPaymentModal() {
  paymentModal.classList.add("is-open");
  paymentModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  paymentForm.elements.paymentOption.focus();
}

function closePaymentModal() {
  paymentModal.classList.remove("is-open");
  paymentModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function showRoleHome(role) {
  document.body.classList.add("is-authenticated");
  document.body.dataset.role = role;
  closeLoginModal();
  window.location.hash = role === "admin" ? "admin-home" : "customer-home";
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (role === "admin") {
    await renderAdminData();
  }
}

function logout() {
  document.body.classList.remove("is-authenticated");
  delete document.body.dataset.role;
  portalForms.forEach((portalForm) => portalForm.reset());
  window.location.hash = "home";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderLawyerResults(lawyers) {
  selectedLawyerIds = new Set();
  requestConsultationButton.disabled = true;

  if (!lawyers.length) {
    lawyerResults.innerHTML =
      '<p class="empty-state">No matching lawyers found. Try a different city, court, or specialization.</p>';
    return;
  }

  lawyerResults.innerHTML = lawyers
    .map(
      (lawyer) => `
        <article class="lawyer-card" data-lawyer-card="${escapeHtml(lawyer.id)}">
          <div class="lawyer-card-head">
            <div>
              <h3>${escapeHtml(lawyer.name)}</h3>
              <p>${escapeHtml(lawyer.summary)}</p>
            </div>
            <label class="select-lawyer">
              <input type="checkbox" value="${escapeHtml(lawyer.id)}" data-lawyer-select />
              Select
            </label>
          </div>
          <div class="lawyer-meta">
            <span>${escapeHtml(lawyer.specialization)}</span>
            <span>${escapeHtml(lawyer.city)}</span>
            <span>${escapeHtml(lawyer.court)}</span>
          </div>
          <p><strong>Experience:</strong> ${escapeHtml(lawyer.experience)}</p>
          <p><strong>Consultation:</strong> ${escapeHtml(lawyer.mode)}</p>
        </article>
      `
    )
    .join("");
}

async function renderAdminData() {
  await Promise.all([renderAdminLawyers(), renderAdminRequests()]);
}

async function renderAdminLawyers() {
  const { lawyers } = await api("/api/lawyers");

  if (!lawyers.length) {
    adminLawyerList.innerHTML = '<p class="empty-state">No lawyer profiles added yet.</p>';
    return;
  }

  adminLawyerList.innerHTML = lawyers
    .map(
      (lawyer) => `
        <article class="admin-card">
          <span class="status-chip shared">${escapeHtml(lawyer.specialization)}</span>
          <h3>${escapeHtml(lawyer.name)}</h3>
          <p>${escapeHtml(lawyer.summary)}</p>
          <dl>
            <div><dt>City</dt><dd>${escapeHtml(lawyer.city)}</dd></div>
            <div><dt>Court</dt><dd>${escapeHtml(lawyer.court)}</dd></div>
            <div><dt>Phone</dt><dd>${escapeHtml(lawyer.phone)}</dd></div>
          </dl>
        </article>
      `
    )
    .join("");
}

async function renderAdminRequests() {
  const { requests } = await api("/api/requests");

  if (!requests.length) {
    adminRequestList.innerHTML =
      '<p class="empty-state">No paid consultation requests yet.</p>';
    return;
  }

  adminRequestList.innerHTML = requests
    .map((request) => {
      const chipClass =
        request.status === "Approved" ? "shared" : request.status === "Rejected" ? "rejected" : "new";
      const actions =
        request.status === "Pending"
          ? `
            <div class="admin-actions">
              <button class="button approve" type="button" data-request-action="approve" data-request-id="${escapeHtml(
                request.id
              )}">Approve</button>
              <button class="button reject" type="button" data-request-action="reject" data-request-id="${escapeHtml(
                request.id
              )}">Reject & Refund</button>
            </div>
          `
          : "";

      return `
        <article class="admin-card">
          <span class="status-chip ${chipClass}">${escapeHtml(request.status)}</span>
          <h3>${escapeHtml(request.lawyerName)}</h3>
          <p>${escapeHtml(request.legalIssue)}</p>
          <dl>
            <div><dt>Customer</dt><dd>${escapeHtml(request.customerName)}</dd></div>
            <div><dt>Customer phone</dt><dd>${escapeHtml(request.customerPhone)}</dd></div>
            <div><dt>Payment</dt><dd>Rs 99 via ${escapeHtml(request.gateway)}</dd></div>
            <div><dt>Refund rule</dt><dd>Refund if rejected or not approved in 48 working hours.</dd></div>
            <div><dt>Message</dt><dd>${escapeHtml(request.adminNote)}</dd></div>
          </dl>
          ${actions}
        </article>
      `;
    })
    .join("");
}

loginTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    openLoginModal(trigger.dataset.loginTrigger);
  });
});

loginCloseButtons.forEach((button) => {
  button.addEventListener("click", closeLoginModal);
});

paymentCloseButtons.forEach((button) => {
  button.addEventListener("click", closePaymentModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (loginModal.classList.contains("is-open")) closeLoginModal();
    if (paymentModal.classList.contains("is-open")) closePaymentModal();
  }
});

logoutButtons.forEach((button) => {
  button.addEventListener("click", logout);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const contactRequest = {
    name: data.get("name").trim(),
    email: data.get("email").trim(),
    topic: data.get("topic"),
    message: data.get("message").trim(),
  };

  if (!contactRequest.name || !contactRequest.email || !contactRequest.topic || !contactRequest.message) {
    statusText.textContent = "Please complete every field before sending.";
    return;
  }

  try {
    await api("/api/contact", {
      method: "POST",
      body: JSON.stringify(contactRequest),
    });
    statusText.textContent = "Contact request captured by mock API.";
  } catch (error) {
    statusText.textContent = error.message;
  }
});

portalForms.forEach((portalForm) => {
  portalForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const portalName = portalForm.dataset.portal || "Portal";
    const portalStatus = portalForm.querySelector(".portal-status");
    const role = portalName.toLowerCase();
    const email = portalForm.elements.email.value.trim();
    const password = portalForm.elements.password.value;

    try {
      const { user } = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ role, email, password }),
      });
      portalStatus.textContent = "Login successful. Opening your home page.";
      await showRoleHome(user.role);
    } catch (error) {
      portalStatus.textContent = error.message;
    }
  });
});

lawyerEnquiryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(lawyerEnquiryForm);
  latestCustomerEnquiry = {
    specialization: data.get("specialization"),
    city: data.get("city").trim(),
    court: data.get("court").trim(),
    customerName: data.get("clientName").trim(),
    customerPhone: data.get("phone").trim(),
    customerEmail: data.get("clientEmail").trim(),
    contactMethod: data.get("contactMethod"),
    legalIssue: data.get("legalIssue").trim(),
  };

  const params = new URLSearchParams({
    specialization: latestCustomerEnquiry.specialization,
    city: latestCustomerEnquiry.city,
    court: latestCustomerEnquiry.court,
  });

  try {
    const { lawyers } = await api(`/api/lawyers/search?${params.toString()}`);
    renderLawyerResults(lawyers);
    caseFormStatus.textContent = `${lawyers.length} lawyer profile(s) found. Select one or many lawyers to request consultation.`;
    refreshIcons();
  } catch (error) {
    caseFormStatus.textContent = error.message;
  }
});

lawyerResults.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-lawyer-select]");
  if (!checkbox) return;

  const card = checkbox.closest(".lawyer-card");
  card.classList.toggle("is-selected", checkbox.checked);

  if (checkbox.checked) {
    selectedLawyerIds.add(checkbox.value);
  } else {
    selectedLawyerIds.delete(checkbox.value);
  }

  requestConsultationButton.disabled = selectedLawyerIds.size === 0;
});

requestConsultationButton.addEventListener("click", () => {
  if (!latestCustomerEnquiry || selectedLawyerIds.size === 0) {
    caseFormStatus.textContent = "Search and select at least one lawyer first.";
    return;
  }

  paymentStatus.textContent = "";
  paymentForm.reset();
  openPaymentModal();
});

paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const paymentData = new FormData(paymentForm);

  try {
    const { requests } = await api("/api/requests", {
      method: "POST",
      body: JSON.stringify({
        lawyerIds: [...selectedLawyerIds],
        enquiry: latestCustomerEnquiry,
        payment: {
          gateway: paymentData.get("gateway"),
          paymentOption: paymentData.get("paymentOption"),
          paymentReference: paymentData.get("paymentReference").trim(),
        },
      }),
    });

    paymentStatus.textContent = "Payment captured in demo mode. Request sent to admin for approval.";
    caseFormStatus.textContent = `${requests.length} paid request(s) sent to admin. You will receive lawyer details by SMS after approval.`;
    selectedLawyerIds = new Set();
    requestConsultationButton.disabled = true;
    paymentForm.reset();
    renderLawyerResults([]);
    await renderAdminRequests();
    setTimeout(closePaymentModal, 900);
  } catch (error) {
    paymentStatus.textContent = error.message;
  }
});

lawyerProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(lawyerProfileForm);
  const lawyer = {
    name: data.get("name").trim(),
    phone: data.get("phone").trim(),
    email: data.get("email").trim(),
    specialization: data.get("specialization"),
    city: data.get("city").trim(),
    court: data.get("court").trim(),
    experience: data.get("experience").trim(),
    mode: data.get("mode"),
    summary: data.get("summary").trim(),
  };

  try {
    await api("/api/lawyers", {
      method: "POST",
      body: JSON.stringify(lawyer),
    });
    lawyerProfileStatus.textContent = "Lawyer profile added through mock API.";
    lawyerProfileForm.reset();
    await renderAdminLawyers();
    refreshIcons();
  } catch (error) {
    lawyerProfileStatus.textContent = error.message;
  }
});

adminRequestList.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-request-action]");
  if (!actionButton) return;

  try {
    await api(`/api/requests/${actionButton.dataset.requestId}/${actionButton.dataset.requestAction}`, {
      method: "POST",
    });
    await renderAdminRequests();
  } catch (error) {
    adminRequestList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
});

renderLawyerResults([]);

window.addEventListener("load", () => {
  refreshIcons();
});
