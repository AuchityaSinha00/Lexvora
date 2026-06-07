import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 8080);
const appEnv = process.env.APP_ENV || "dev";
const appName = process.env.APP_NAME || "lexvora";
const awsRegion = process.env.AWS_REGION || "ap-south-1";
const supportEmail = process.env.SUPPORT_EMAIL || "support@lexvora.in";

const users = {
  customer: {
    email: process.env.CUSTOMER_DEMO_EMAIL || "customer@lexvora.in",
    password: process.env.CUSTOMER_DEMO_PASSWORD || "Customer@123",
    role: "customer",
  },
  admin: {
    email: process.env.ADMIN_DEMO_EMAIL || "admin@lexvora.in",
    password: process.env.ADMIN_DEMO_PASSWORD || "Admin@123",
    role: "admin",
  },
};

let lawyers = [
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

let consultationRequests = [];

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function publicLawyer(lawyer) {
  return {
    id: lawyer.id,
    name: lawyer.name,
    specialization: lawyer.specialization,
    city: lawyer.city,
    court: lawyer.court,
    experience: lawyer.experience,
    mode: lawyer.mode,
    summary: lawyer.summary,
  };
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

function simulateSms(request) {
  return `Demo SMS sent to ${request.customerPhone}: ${request.lawyerName}, phone ${request.lawyerPhone}.`;
}

function simulateRefund(request) {
  return `Demo refund of Rs ${request.fee} initiated for ${request.customerName}.`;
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      app: appName,
      environment: appEnv,
      region: awsRegion,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/runtime") {
    sendJson(response, 200, {
      app: appName,
      environment: appEnv,
      region: awsRegion,
      supportEmail,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(request);
    const user = users[body.role];

    if (!user || body.email !== user.email || body.password !== user.password) {
      sendJson(response, 401, { error: "Invalid login details" });
      return;
    }

    sendJson(response, 200, {
      user: {
        email: user.email,
        role: user.role,
      },
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lawyers") {
    sendJson(response, 200, { lawyers });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/lawyers") {
    const body = await readBody(request);
    const lawyer = {
      id: createId("lawyer"),
      name: body.name,
      phone: body.phone,
      email: body.email,
      specialization: body.specialization,
      city: body.city,
      court: body.court,
      experience: body.experience,
      mode: body.mode,
      summary: body.summary,
    };

    lawyers.push(lawyer);
    sendJson(response, 201, { lawyer });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lawyers/search") {
    const filters = {
      specialization: url.searchParams.get("specialization") || "",
      city: url.searchParams.get("city") || "",
      court: url.searchParams.get("court") || "",
    };
    const matches = lawyers.filter((lawyer) => lawyerMatches(lawyer, filters)).map(publicLawyer);
    sendJson(response, 200, { lawyers: matches });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/requests") {
    sendJson(response, 200, { requests: consultationRequests });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/requests") {
    const body = await readBody(request);
    const selectedLawyers = lawyers.filter((lawyer) => body.lawyerIds?.includes(lawyer.id));
    const createdAt = new Date();
    const createdRequests = selectedLawyers.map((lawyer) => ({
      id: createId("request"),
      lawyerId: lawyer.id,
      lawyerName: lawyer.name,
      lawyerPhone: lawyer.phone,
      customerName: body.enquiry.customerName,
      customerPhone: body.enquiry.customerPhone,
      customerEmail: body.enquiry.customerEmail,
      legalIssue: body.enquiry.legalIssue,
      gateway: body.payment.gateway,
      paymentOption: body.payment.paymentOption,
      paymentReference: body.payment.paymentReference,
      fee: 99,
      status: "Pending",
      createdAt: createdAt.toISOString(),
      refundDeadline: "48 working hours",
      adminNote: "Awaiting admin approval. Refund applies if rejected or not approved in 48 working hours.",
    }));

    consultationRequests = [...consultationRequests, ...createdRequests];
    sendJson(response, 201, { requests: createdRequests });
    return;
  }

  const requestActionMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/(approve|reject)$/);
  if (request.method === "POST" && requestActionMatch) {
    const [, requestId, action] = requestActionMatch;
    const requestItem = consultationRequests.find((item) => item.id === requestId);

    if (!requestItem) {
      sendJson(response, 404, { error: "Request not found" });
      return;
    }

    if (action === "approve") {
      requestItem.status = "Approved";
      requestItem.adminNote = `Approved. ${simulateSms(requestItem)}`;
      requestItem.smsStatus = "Sent";
    } else {
      requestItem.status = "Rejected";
      requestItem.adminNote = `Rejected by admin. ${simulateRefund(requestItem)}`;
      requestItem.refundStatus = "Initiated";
    }

    sendJson(response, 200, { request: requestItem });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/contact") {
    const body = await readBody(request);
    sendJson(response, 200, {
      message: "Contact request captured in mock API.",
      mailTo: supportEmail,
      request: body,
    });
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

function handleStatic(request, response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    handleStatic(request, response, url);
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Request failed" });
  }
}).listen(port, () => {
  console.log(`LexVora mock API app running at http://localhost:${port} (${appEnv})`);
});
