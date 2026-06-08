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
const sidePanels = document.querySelectorAll("[data-side-panel]");
const profileModal = document.querySelector("#profileModal");
const profileForm = document.querySelector("#profileForm");
const profileModalTitle = document.querySelector("#profileModalTitle");

let selectedLawyerIds = new Set();
let latestCustomerEnquiry = null;
let currentUser = null;
let currentProfileQuestions = [];

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error("Network error. Check whether the LexVora server is running and try again.");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : { error: await response.text() };

  if (!response.ok) {
    throw new Error(payload.error || `API request failed with status ${response.status}`);
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

function setStatus(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.status = type;
}

function setButtonBusy(button, isBusy, busyText = "Please wait") {
  if (!button) return;
  if (isBusy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.classList.add("is-busy");
    button.setAttribute("aria-busy", "true");
    button.textContent = busyText;
    return;
  }

  button.disabled = false;
  button.classList.remove("is-busy");
  button.removeAttribute("aria-busy");
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
    refreshIcons();
  }
}

function clearFormErrors(formElement) {
  formElement.querySelectorAll(".field-error").forEach((error) => error.remove());
  formElement.querySelectorAll(".has-error").forEach((field) => field.classList.remove("has-error"));
  formElement.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));
}

function addFieldError(field, message) {
  if (!field) return;
  const label = field.closest("label") || field.parentElement;
  const error = document.createElement("small");
  error.className = "field-error";
  error.textContent = message;
  field.classList.add("has-error");
  field.setAttribute("aria-invalid", "true");
  label.append(error);
}

function validateForm(formElement, rules = {}) {
  clearFormErrors(formElement);
  const fields = [...formElement.querySelectorAll("input, select, textarea")];
  let firstInvalidField = null;

  fields.forEach((field) => {
    const value = field.value.trim();
    const label =
      field.closest("label")?.querySelector(".field-label")?.textContent?.trim() ||
      field.closest("label")?.childNodes[0]?.textContent?.trim() ||
      field.name;
    const rule = rules[field.name] || {};

    if (field.required && !value) {
      addFieldError(field, `${label} is required.`);
      firstInvalidField ||= field;
      return;
    }

    if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      addFieldError(field, "Enter a valid email address.");
      firstInvalidField ||= field;
      return;
    }

    if (value && field.type === "tel" && !/^[0-9+\-\s()]{8,16}$/.test(value)) {
      addFieldError(field, "Enter a valid phone number.");
      firstInvalidField ||= field;
      return;
    }

    if (value && rule.minLength && value.length < rule.minLength) {
      addFieldError(field, `${label} must be at least ${rule.minLength} characters.`);
      firstInvalidField ||= field;
    }
  });

  if (firstInvalidField) {
    firstInvalidField.focus();
    return false;
  }

  return true;
}

function tooltip(text) {
  return `<button class="tooltip-trigger" type="button" tabindex="-1" aria-label="${escapeHtml(text)}" title="${escapeHtml(text)}" data-tooltip="${escapeHtml(text)}">
    <i data-lucide="circle-help"></i>
  </button>`;
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

function openProfileModal(role, questions) {
  currentProfileQuestions = questions;
  profileModalTitle.textContent = role === "admin" ? "Create admin profile" : "Create customer profile";
  profileForm.innerHTML = `
    <div class="profile-grid">
      ${questions.map(renderProfileQuestion).join("")}
    </div>
    <button class="button primary form-submit" type="submit">
      <i data-lucide="save"></i>
      Save Profile
    </button>
    <p class="form-status" id="profileStatus" role="status" aria-live="polite"></p>
  `;
  profileModal.classList.add("is-open");
  profileModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  profileForm.querySelector("input, select, textarea").focus();
  refreshIcons();
}

function closeProfileModal() {
  profileModal.classList.remove("is-open");
  profileModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function renderProfileQuestion(question) {
  const required = question.required ? "required" : "";
  const hint = `Used to create your ${question.name === "bio" ? "profile summary" : "LexVora profile"}.`;
  const labelText = `<span class="field-label">${escapeHtml(question.label)} ${tooltip(hint)}</span>`;

  if (question.type === "select") {
    return `
      <label>
        ${labelText}
        <select name="${escapeHtml(question.name)}" ${required}>
          <option value="">Select</option>
          ${question.options.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (question.type === "textarea") {
    return `
      <label>
        ${labelText}
        <textarea name="${escapeHtml(question.name)}" rows="4" ${required}></textarea>
      </label>
    `;
  }

  return `
    <label>
      ${labelText}
      <input type="${escapeHtml(question.type)}" name="${escapeHtml(question.name)}" ${required} />
    </label>
  `;
}

function renderSidePanel(role, profile, tabs) {
  const panel = [...sidePanels].find((item) => item.dataset.sidePanel === role);
  if (!panel) return;

  const initials = (profile.fullName || currentUser.email || "LV")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  panel.innerHTML = `
    <div class="side-profile">
      <span class="side-avatar">${escapeHtml(initials)}</span>
      <div>
        <h3>${escapeHtml(profile.fullName || "Profile")}</h3>
        <p>${escapeHtml(currentUser.email)}</p>
      </div>
    </div>
    <nav class="side-tabs" aria-label="${escapeHtml(role)} dashboard tabs">
      ${tabs
        .map(
          (tab, index) => `
            <button class="side-tab ${index === 0 ? "is-active" : ""}" type="button" data-dashboard-tab="${escapeHtml(tab.id)}">
              <i data-lucide="${escapeHtml(tab.icon)}"></i>
              ${escapeHtml(tab.label)}
            </button>
          `
        )
        .join("")}
    </nav>
    <dl class="side-detail">
      <div><dt>Phone</dt><dd>${escapeHtml(profile.phone || "Not set")}</dd></div>
      <div><dt>City</dt><dd>${escapeHtml(profile.city || "Not set")}</dd></div>
      <div><dt>Bio</dt><dd>${escapeHtml(profile.bio || "Not set")}</dd></div>
    </dl>
  `;
  refreshIcons();
}

async function loadProfileShell(role) {
  let tabs = [];
  let questions = [];
  let profile = null;

  try {
    [{ tabs }, { questions }, { profile }] = await Promise.all([
      api(`/api/navigation/${role}`),
      api(`/api/profile-questions/${role}`),
      api(`/api/profiles/${role}?email=${encodeURIComponent(currentUser.email)}`),
    ]);
  } catch (error) {
    const panel = [...sidePanels].find((item) => item.dataset.sidePanel === role);
    if (panel) {
      panel.innerHTML = `<p class="empty-state error-state">${escapeHtml(error.message)}</p>`;
    }
    throw error;
  }

  if (!profile) {
    renderSidePanel(role, { fullName: "Profile pending", bio: "Complete setup to continue." }, tabs);
    openProfileModal(role, questions);
    return;
  }

  renderSidePanel(role, profile, tabs);
}

async function showRoleHome(role) {
  document.body.classList.add("is-authenticated");
  document.body.dataset.role = role;
  closeLoginModal();
  window.location.hash = role === "admin" ? "admin-home" : "customer-home";
  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    if (role === "admin") {
      await renderAdminData();
    }
    await loadProfileShell(role);
  } catch (error) {
    alert(error.message);
  }
}

function logout() {
  document.body.classList.remove("is-authenticated");
  delete document.body.dataset.role;
  currentUser = null;
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
  let lawyers = [];
  try {
    ({ lawyers } = await api("/api/lawyers"));
  } catch (error) {
    adminLawyerList.innerHTML = `<p class="empty-state error-state">${escapeHtml(error.message)}</p>`;
    return;
  }

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
  let requests = [];
  try {
    ({ requests } = await api("/api/requests"));
  } catch (error) {
    adminRequestList.innerHTML = `<p class="empty-state error-state">${escapeHtml(error.message)}</p>`;
    return;
  }

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
    if (profileModal.classList.contains("is-open")) event.preventDefault();
  }
});

logoutButtons.forEach((button) => {
  button.addEventListener("click", logout);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm(form, { message: { minLength: 10 } })) {
    setStatus(statusText, "Please fix the highlighted fields.", "error");
    return;
  }

  const data = new FormData(form);
  const contactRequest = {
    name: data.get("name").trim(),
    email: data.get("email").trim(),
    topic: data.get("topic"),
    message: data.get("message").trim(),
  };

  if (!contactRequest.name || !contactRequest.email || !contactRequest.topic || !contactRequest.message) {
    setStatus(statusText, "Please complete every field before sending.", "error");
    return;
  }

  const submitButton = form.querySelector("[type='submit']");
  try {
    setButtonBusy(submitButton, true, "Sending");
    await api("/api/contact", {
      method: "POST",
      body: JSON.stringify(contactRequest),
    });
    setStatus(statusText, "Contact request captured by mock API.", "success");
    form.reset();
  } catch (error) {
    setStatus(statusText, error.message, "error");
  } finally {
    setButtonBusy(submitButton, false);
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

    if (!validateForm(portalForm)) {
      setStatus(portalStatus, "Enter a valid email and password.", "error");
      return;
    }

    const submitButton = portalForm.querySelector("[type='submit']");
    try {
      setButtonBusy(submitButton, true, "Logging in");
      const { user } = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ role, email, password }),
      });
      currentUser = user;
      setStatus(portalStatus, "Login successful. Opening your home page.", "success");
      await showRoleHome(user.role);
    } catch (error) {
      setStatus(portalStatus, error.message, "error");
    } finally {
      setButtonBusy(submitButton, false);
    }
  });
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const profileStatus = profileForm.querySelector("#profileStatus");
  if (!validateForm(profileForm, { bio: { minLength: 20 } })) {
    setStatus(profileStatus, "Please complete the highlighted profile fields.", "error");
    return;
  }

  const data = new FormData(profileForm);
  const profile = Object.fromEntries(
    currentProfileQuestions.map((question) => [question.name, data.get(question.name)?.trim() || ""])
  );

  const submitButton = profileForm.querySelector("[type='submit']");
  try {
    setButtonBusy(submitButton, true, "Saving");
    const result = await api(`/api/profiles/${currentUser.role}`, {
      method: "POST",
      body: JSON.stringify({
        email: currentUser.email,
        profile,
      }),
    });
    const { tabs } = await api(`/api/navigation/${currentUser.role}`);
    renderSidePanel(currentUser.role, result.profile, tabs);
    setStatus(profileStatus, "Profile saved.", "success");
    closeProfileModal();
  } catch (error) {
    setStatus(profileStatus, error.message, "error");
  } finally {
    setButtonBusy(submitButton, false);
  }
});

lawyerEnquiryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm(lawyerEnquiryForm, { legalIssue: { minLength: 20 } })) {
    setStatus(caseFormStatus, "Please fix the highlighted enquiry fields.", "error");
    return;
  }

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
    setStatus(
      caseFormStatus,
      `${lawyers.length} lawyer profile(s) found. Select one or many lawyers to request consultation.`,
      lawyers.length ? "success" : "info"
    );
    refreshIcons();
  } catch (error) {
    setStatus(caseFormStatus, error.message, "error");
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
    setStatus(caseFormStatus, "Search and select at least one lawyer first.", "error");
    return;
  }

  setStatus(paymentStatus, "", "info");
  paymentForm.reset();
  openPaymentModal();
});

paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm(paymentForm)) {
    setStatus(paymentStatus, "Please complete all payment details.", "error");
    return;
  }

  const paymentData = new FormData(paymentForm);

  const submitButton = paymentForm.querySelector("[type='submit']");
  try {
    setButtonBusy(submitButton, true, "Processing");
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

    setStatus(paymentStatus, "Payment captured in demo mode. Request sent to admin for approval.", "success");
    setStatus(
      caseFormStatus,
      `${requests.length} paid request(s) sent to admin. You will receive lawyer details by SMS after approval.`,
      "success"
    );
    selectedLawyerIds = new Set();
    requestConsultationButton.disabled = true;
    paymentForm.reset();
    renderLawyerResults([]);
    await renderAdminRequests();
    setTimeout(closePaymentModal, 900);
  } catch (error) {
    setStatus(paymentStatus, error.message, "error");
  } finally {
    setButtonBusy(submitButton, false);
  }
});

lawyerProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm(lawyerProfileForm, { summary: { minLength: 20 } })) {
    setStatus(lawyerProfileStatus, "Please fix the highlighted lawyer profile fields.", "error");
    return;
  }

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

  const submitButton = lawyerProfileForm.querySelector("[type='submit']");
  try {
    setButtonBusy(submitButton, true, "Adding");
    await api("/api/lawyers", {
      method: "POST",
      body: JSON.stringify(lawyer),
    });
    setStatus(lawyerProfileStatus, "Lawyer profile added through mock API.", "success");
    lawyerProfileForm.reset();
    await renderAdminLawyers();
    refreshIcons();
  } catch (error) {
    setStatus(lawyerProfileStatus, error.message, "error");
  } finally {
    setButtonBusy(submitButton, false);
  }
});

adminRequestList.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-request-action]");
  if (!actionButton) return;

  try {
    actionButton.disabled = true;
    await api(`/api/requests/${actionButton.dataset.requestId}/${actionButton.dataset.requestAction}`, {
      method: "POST",
    });
    await renderAdminRequests();
  } catch (error) {
    adminRequestList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  } finally {
    actionButton.disabled = false;
  }
});

renderLawyerResults([]);

window.addEventListener("load", () => {
  refreshIcons();
});
