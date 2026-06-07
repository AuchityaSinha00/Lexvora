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

const storageKeys = {
  lawyers: "lexvoraLawyers",
  requests: "lexvoraConsultationRequests",
};

const seedLawyers = [
  {
    id: "lawyer-1",
    name: "Adv. Riya Sharma",
    phone: "9876543210",
    email: "riya.sharma@example.com",
    specialization: "Family Law",
    city: "Delhi",
    court: "Delhi High Court",
    experience: "8 years",
    mode: "Phone and In-person",
    summary: "Handles family mediation, divorce, maintenance, and custody matters.",
  },
  {
    id: "lawyer-2",
    name: "Adv. Arjun Mehta",
    phone: "9988776655",
    email: "arjun.mehta@example.com",
    specialization: "Criminal Law",
    city: "Mumbai",
    court: "Bombay High Court",
    experience: "11 years",
    mode: "Phone",
    summary: "Supports bail, FIR, criminal defence, and urgent legal consultations.",
  },
  {
    id: "lawyer-3",
    name: "Adv. Kavya Rao",
    phone: "9123456780",
    email: "kavya.rao@example.com",
    specialization: "Property Law",
    city: "Bengaluru",
    court: "City Civil Court Bengaluru",
    experience: "7 years",
    mode: "Video Call",
    summary: "Works on property documentation, sale deed review, and ownership disputes.",
  },
];

let selectedLawyerIds = new Set();
let latestCustomerEnquiry = null;

function readStore(key, fallback) {
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getLawyers() {
  return readStore(storageKeys.lawyers, seedLawyers);
}

function saveLawyers(lawyers) {
  writeStore(storageKeys.lawyers, lawyers);
}

function getRequests() {
  return readStore(storageKeys.requests, []);
}

function saveRequests(requests) {
  writeStore(storageKeys.requests, requests);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function showRoleHome(role) {
  document.body.classList.add("is-authenticated");
  document.body.dataset.role = role;
  closeLoginModal();
  window.location.hash = role === "admin" ? "admin-home" : "customer-home";
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAdminData();
}

function logout() {
  document.body.classList.remove("is-authenticated");
  delete document.body.dataset.role;
  portalForms.forEach((portalForm) => portalForm.reset());
  window.location.hash = "home";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function lawyerMatches(lawyer, filters) {
  const specializationMatch =
    !filters.specialization || lawyer.specialization === filters.specialization;
  const cityMatch =
    !filters.city || lawyer.city.toLowerCase().includes(filters.city.toLowerCase());
  const courtMatch =
    !filters.court || lawyer.court.toLowerCase().includes(filters.court.toLowerCase());

  return specializationMatch && cityMatch && courtMatch;
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

function renderAdminData() {
  renderAdminLawyers();
  renderAdminRequests();
}

function renderAdminLawyers() {
  const lawyers = getLawyers();

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

function renderAdminRequests() {
  const requests = getRequests();

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

  const matches = getLawyers().filter((lawyer) => lawyerMatches(lawyer, latestCustomerEnquiry));
  renderLawyerResults(matches);
  caseFormStatus.textContent = `${matches.length} lawyer profile(s) found. Select one or many lawyers to request consultation.`;
  refreshIcons();
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

paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const paymentData = new FormData(paymentForm);
  const lawyersById = new Map(getLawyers().map((lawyer) => [lawyer.id, lawyer]));
  const requests = getRequests();
  const createdAt = new Date();

  selectedLawyerIds.forEach((lawyerId) => {
    const lawyer = lawyersById.get(lawyerId);
    if (!lawyer) return;

    requests.push({
      id: createId("request"),
      lawyerId,
      lawyerName: lawyer.name,
      lawyerPhone: lawyer.phone,
      customerName: latestCustomerEnquiry.customerName,
      customerPhone: latestCustomerEnquiry.customerPhone,
      customerEmail: latestCustomerEnquiry.customerEmail,
      legalIssue: latestCustomerEnquiry.legalIssue,
      gateway: paymentData.get("gateway"),
      paymentOption: paymentData.get("paymentOption"),
      paymentReference: paymentData.get("paymentReference").trim(),
      fee: 99,
      status: "Pending",
      createdAt: createdAt.toISOString(),
      refundDeadline: "48 working hours",
      adminNote: "Awaiting admin approval. Refund applies if rejected or not approved in 48 working hours.",
    });
  });

  saveRequests(requests);
  paymentStatus.textContent = "Payment captured in demo mode. Request sent to admin for approval.";
  caseFormStatus.textContent = "Your paid request has been sent to admin. You will receive lawyer details by SMS after approval.";
  selectedLawyerIds = new Set();
  requestConsultationButton.disabled = true;
  paymentForm.reset();
  renderLawyerResults([]);
  renderAdminRequests();
  setTimeout(closePaymentModal, 900);
});

lawyerProfileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(lawyerProfileForm);
  const lawyers = getLawyers();

  lawyers.push({
    id: createId("lawyer"),
    name: data.get("name").trim(),
    phone: data.get("phone").trim(),
    email: data.get("email").trim(),
    specialization: data.get("specialization"),
    city: data.get("city").trim(),
    court: data.get("court").trim(),
    experience: data.get("experience").trim(),
    mode: data.get("mode"),
    summary: data.get("summary").trim(),
  });

  saveLawyers(lawyers);
  lawyerProfileStatus.textContent = "Lawyer profile added. Customers can now find this lawyer in search.";
  lawyerProfileForm.reset();
  renderAdminLawyers();
  refreshIcons();
});

adminRequestList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-request-action]");
  if (!actionButton) return;

  const requests = getRequests();
  const request = requests.find((item) => item.id === actionButton.dataset.requestId);
  if (!request) return;

  if (actionButton.dataset.requestAction === "approve") {
    request.status = "Approved";
    request.adminNote = `Approved. Demo SMS sent to ${request.customerPhone}: ${request.lawyerName}, phone ${request.lawyerPhone}.`;
  } else {
    request.status = "Rejected";
    request.adminNote = "Rejected by admin. Demo refund of Rs 99 initiated to the customer.";
  }

  saveRequests(requests);
  renderAdminRequests();
});

if (!window.localStorage.getItem(storageKeys.lawyers)) {
  saveLawyers(seedLawyers);
}

renderLawyerResults([]);
renderAdminData();

window.addEventListener("load", refreshIcons);
