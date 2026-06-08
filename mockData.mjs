// Mock UI/data contract used by the frontend.
// In production these values can come from database-backed admin settings.

export const roleNavigation = {
  customer: [
    { id: "profile", label: "Profile", icon: "user-round" },
    { id: "find-lawyer", label: "Find Lawyer", icon: "search" },
    { id: "requests", label: "My Requests", icon: "file-clock" },
    { id: "payments", label: "Payments", icon: "credit-card" },
  ],
  admin: [
    { id: "profile", label: "Profile", icon: "shield-check" },
    { id: "lawyers", label: "Lawyer Data", icon: "briefcase-business" },
    { id: "requests", label: "Requests", icon: "inbox" },
    { id: "settings", label: "Settings", icon: "settings" },
  ],
};

export const profileQuestions = {
  customer: [
    { name: "fullName", label: "Full name", type: "text", required: true },
    { name: "phone", label: "Phone number", type: "tel", required: true },
    { name: "city", label: "City", type: "text", required: true },
    {
      name: "legalNeed",
      label: "Primary legal need",
      type: "select",
      required: true,
      options: ["Family Law", "Criminal Law", "Property Law", "Corporate Law", "Civil Litigation"],
    },
    {
      name: "preferredContact",
      label: "Preferred contact method",
      type: "select",
      required: true,
      options: ["Phone call", "WhatsApp", "Email", "In-person meeting"],
    },
    { name: "bio", label: "Short bio", type: "textarea", required: true },
  ],
  admin: [
    { name: "fullName", label: "Full name", type: "text", required: true },
    { name: "phone", label: "Phone number", type: "tel", required: true },
    { name: "department", label: "Department", type: "text", required: true },
    {
      name: "accessLevel",
      label: "Access level",
      type: "select",
      required: true,
      options: ["Operations Admin", "Legal Coordinator", "Super Admin"],
    },
    { name: "city", label: "Base city", type: "text", required: true },
    { name: "bio", label: "Admin bio", type: "textarea", required: true },
  ],
};
