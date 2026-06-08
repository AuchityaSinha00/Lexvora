import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createRepository } from "./db.mjs";
import { profileQuestions, roleNavigation } from "./mockData.mjs";

const root = process.cwd();
const port = Number(process.env.PORT || 8080);
const appEnv = process.env.APP_ENV || "dev";
const appName = process.env.APP_NAME || "lexvora";
const awsRegion = process.env.AWS_REGION || "ap-south-1";
const supportEmail = process.env.SUPPORT_EMAIL || "support@lexvora.in";
const dbClient = process.env.DB_CLIENT || "memory";
const databaseUrl = process.env.DATABASE_URL || "";
const dbSsl = process.env.DB_SSL === "true";
const dbPoolMax = Number(process.env.DB_POOL_MAX || 10);

// Repository is the single data access point. Use DB_CLIENT=postgres in prod.
const repository = await createRepository({
  dbClient,
  databaseUrl,
  dbSsl,
  dbPoolMax,
});

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
      database: await repository.health(),
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
      dbClient,
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

  if (request.method === "GET" && url.pathname.startsWith("/api/navigation/")) {
    const role = url.pathname.split("/").at(-1);
    sendJson(response, 200, { tabs: roleNavigation[role] || [] });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/profile-questions/")) {
    const role = url.pathname.split("/").at(-1);
    sendJson(response, 200, { questions: profileQuestions[role] || [] });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/profiles/")) {
    const role = url.pathname.split("/").at(-1);
    const email = url.searchParams.get("email") || "";
    const profile = await repository.getProfile(role, email);
    sendJson(response, 200, { profile });
    return;
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/profiles/")) {
    const role = url.pathname.split("/").at(-1);
    const body = await readBody(request);
    const profile = await repository.upsertProfile(role, body.email, body.profile);
    sendJson(response, 200, { profile });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lawyers") {
    const lawyers = await repository.listLawyers();
    sendJson(response, 200, { lawyers });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/lawyers") {
    const body = await readBody(request);
    const lawyer = await repository.createLawyer({
      name: body.name,
      phone: body.phone,
      email: body.email,
      specialization: body.specialization,
      city: body.city,
      court: body.court,
      experience: body.experience,
      mode: body.mode,
      summary: body.summary,
    });
    sendJson(response, 201, { lawyer });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lawyers/search") {
    const filters = {
      specialization: url.searchParams.get("specialization") || "",
      city: url.searchParams.get("city") || "",
      court: url.searchParams.get("court") || "",
    };
    const matches = await repository.searchLawyers(filters);
    sendJson(response, 200, { lawyers: matches });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/requests") {
    const requests = await repository.listRequests();
    sendJson(response, 200, { requests });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/requests") {
    const body = await readBody(request);
    const createdRequests = await repository.createConsultationRequests({
      lawyerIds: body.lawyerIds || [],
      enquiry: body.enquiry,
      payment: body.payment,
    });
    sendJson(response, 201, { requests: createdRequests });
    return;
  }

  const requestActionMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/(approve|reject)$/);
  if (request.method === "POST" && requestActionMatch) {
    const [, requestId, action] = requestActionMatch;
    const requests = await repository.listRequests();
    const requestItem = requests.find((item) => item.id === requestId);

    if (!requestItem) {
      sendJson(response, 404, { error: "Request not found" });
      return;
    }

    let updatedRequest;
    if (action === "approve") {
      updatedRequest = await repository.updateRequestStatus(
        requestId,
        "Approved",
        `Approved. ${simulateSms(requestItem)}`,
        { smsStatus: "Sent" }
      );
    } else {
      updatedRequest = await repository.updateRequestStatus(
        requestId,
        "Rejected",
        `Rejected by admin. ${simulateRefund(requestItem)}`,
        { refundStatus: "Initiated" }
      );
    }

    sendJson(response, 200, { request: updatedRequest });
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
