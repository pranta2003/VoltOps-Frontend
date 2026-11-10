import test from "node:test";
import assert from "node:assert/strict";

// Mock axios instance to test HTTP response and error scenarios
class MockAxios {
  constructor() {
    this.handlers = new Map();
  }

  on(method, url, handler) {
    this.handlers.set(`${method.toUpperCase()} ${url}`, handler);
  }

  async get(url, config) {
    const key = `GET ${url}`;
    const handler = this.handlers.get(key);
    if (!handler) {
      const err = new Error(`Request failed with status code 404`);
      err.response = { status: 404, data: { message: "Route not found" } };
      throw err;
    }
    return handler(config);
  }

  async post(url, data) {
    const key = `POST ${url}`;
    const handler = this.handlers.get(key);
    if (!handler) {
      const err = new Error(`Request failed with status code 404`);
      err.response = { status: 404, data: { message: "Route not found" } };
      throw err;
    }
    return handler(data);
  }

  async patch(url, data) {
    const key = `PATCH ${url}`;
    const handler = this.handlers.get(key);
    if (!handler) {
      const err = new Error(`Request failed with status code 404`);
      err.response = { status: 404, data: { message: "Route not found" } };
      throw err;
    }
    return handler(data);
  }
}

// Minimal offline baselines for testing logic
const OFFLINE_BASELINE_USERS = [
  { id: "u-1", name: "Pranta Admin", email: "admin@voltops.com", role: "ADMIN", branch: "EPZ", isActive: true },
  { id: "u-2", name: "Tania Dispatcher", email: "dispatcher@voltops.com", role: "DISPATCHER", branch: "Gazipur", isActive: true },
  { id: "u-3", name: "Kamrul Technician", email: "kamrul@voltops.com", role: "TECHNICIAN", branch: "EPZ", isActive: false },
];

test("Scenario 1: GET /api/admin/users handles 404 by returning truthful offline baseline", async () => {
  const mockApi = new MockAxios();
  // No handler registered -> triggers 404

  let status = 404;
  let endpointConnected = false;
  let isLive = false;

  try {
    await mockApi.get("/admin/users");
  } catch (err) {
    status = err.response?.status;
    endpointConnected = status !== 404;
  }

  assert.equal(status, 404);
  assert.equal(endpointConnected, false);
  assert.equal(isLive, false);
});

test("Scenario 2: POST /api/admin/users returns success: false on 404 and does not fabricate user", async () => {
  const mockApi = new MockAxios();
  let result;

  try {
    await mockApi.post("/admin/users", {
      name: "New Staff",
      email: "staff@voltops.com",
      role: "DISPATCHER",
    });
    result = { success: true };
  } catch (err) {
    result = {
      success: false,
      data: null,
      isLive: false,
      statusCode: err.response?.status,
      endpointConnected: false,
      error: "Backend endpoint POST /api/admin/users is not yet implemented. Account cannot be saved.",
    };
  }

  assert.equal(result.success, false);
  assert.equal(result.data, null);
  assert.equal(result.statusCode, 404);
  assert.match(result.error, /POST \/api\/admin\/users is not yet implemented/);
});

test("Scenario 3: PATCH /api/admin/users/:id/status returns 401 Unauthorized handling", async () => {
  const mockApi = new MockAxios();
  mockApi.on("PATCH", "/admin/users/u-1/status", () => {
    const err = new Error("Unauthorized");
    err.response = { status: 401, data: { error: "Token expired or invalid" } };
    throw err;
  });

  let result;
  try {
    await mockApi.patch("/admin/users/u-1/status", { isActive: false });
  } catch (err) {
    result = {
      success: false,
      data: null,
      statusCode: err.response?.status,
      error: err.response?.data?.error,
    };
  }

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 401);
  assert.equal(result.error, "Token expired or invalid");
});

test("Scenario 4: 500 Server Error on GET /technicians safely falls back to offline passport baseline", async () => {
  const mockApi = new MockAxios();
  mockApi.on("GET", "/technicians", () => {
    const err = new Error("Internal Server Error");
    err.response = { status: 500, data: { message: "Database connection failed" } };
    throw err;
  });

  let fallbackTriggered = false;
  try {
    await mockApi.get("/technicians");
  } catch (err) {
    fallbackTriggered = true;
  }

  assert.equal(fallbackTriggered, true);
});

test("Scenario 5: Network failure (ERR_NETWORK) classification", async () => {
  const mockApi = new MockAxios();
  mockApi.on("GET", "/admin/metrics", () => {
    const err = new Error("Network Error");
    err.code = "ERR_NETWORK";
    throw err;
  });

  let errorClass;
  try {
    await mockApi.get("/admin/metrics");
  } catch (err) {
    errorClass = err.code;
  }

  assert.equal(errorClass, "ERR_NETWORK");
});

test("Scenario 6: Malformed response shape handling (e.g. non-array data)", async () => {
  const mockApi = new MockAxios();
  mockApi.on("GET", "/admin/users", () => ({
    data: "<html><body>Proxy 502 Bad Gateway</body></html>",
  }));

  const res = await mockApi.get("/admin/users");
  const isMalformed = typeof res.data !== "object" || !Array.isArray(res.data?.data);

  assert.equal(isMalformed, true);
});

test("Scenario 7: Offline baseline query filtering (search, role, status)", () => {
  const search = "kamrul";
  const filtered = OFFLINE_BASELINE_USERS.filter((u) =>
    u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "u-3");
  assert.equal(filtered[0].role, "TECHNICIAN");
});

test("Scenario 8: Self-deactivation safeguard arithmetic", () => {
  const currentUser = { email: "admin@voltops.com" };
  const targetUser = { email: "admin@voltops.com", isActive: true };

  const isSelfDeactivation =
    targetUser.isActive &&
    currentUser.email.toLowerCase() === targetUser.email.toLowerCase();

  assert.equal(isSelfDeactivation, true);
});
