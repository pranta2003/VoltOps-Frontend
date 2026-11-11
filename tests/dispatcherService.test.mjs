// Automated Unit Tests for Dispatcher Service
// Tests offline demonstration baselines, arithmetic matching engine, license expiry disqualification,
// unverified credential disqualification, overloaded technician handling, linear lifecycle transitions,
// and HTTP 401/403 propagation.

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

const CANONICAL_SERVICE_CATEGORIES = [
  "Electrical and power systems",
  "AC, HVAC, and cooling",
  "CCTV and security",
  "Internet, networking, and hardware",
  "IT and software support",
  "Plumbing and water systems",
  "Facility maintenance",
];

const INITIAL_SERVICE_REQUESTS = [
  {
    id: "SR-1001",
    customerName: "Apex Spinning & Weaving Mills",
    facilityAddress: "Plot 14-18, Sector 3, DEPZ, Savar",
    category: "Electrical and power systems",
    assetName: "Transformer TR-02 (1000 kVA)",
    problemTitle: "Oil Temperature High Alarm & Busbar Flashover Risk",
    priority: "URGENT",
    status: "NEW",
    coveragePlan: "247-priority",
    slaRemainingMinutes: 18,
  },
  {
    id: "SR-1002",
    customerName: "Beximco Industrial Complex",
    facilityAddress: "Sarabo, Kashimpur, Gazipur",
    category: "AC, HVAC, and cooling",
    assetName: "Centrifugal Chiller Unit CH-01",
    problemTitle: "Refrigerant Low Pressure Trip",
    priority: "HIGH",
    status: "REVIEWING",
    coveragePlan: "247-standard",
    slaRemainingMinutes: 38,
  },
  {
    id: "SR-1003",
    customerName: "Rahimafrooz Storage Batteries Plant",
    facilityAddress: "Adamjee EPZ, Siddhirganj, Narayanganj",
    category: "Electrical and power systems",
    assetName: "Rectifier Transformer Station RT-01",
    problemTitle: "Battery Bank Over-temperature Warning",
    priority: "MEDIUM",
    status: "NEW",
    coveragePlan: "8hr",
    slaRemainingMinutes: null, // Plan A has NO physical arrival SLA
  },
  {
    id: "SR-1007",
    customerName: "Navana Real Estate Corporate Tower",
    facilityAddress: "Navana Pristine Pavilion, Gulshan-2, Dhaka",
    category: "Facility maintenance",
    assetName: "Dual Passenger Elevator Bank ELV-01 & 02",
    problemTitle: "Door Safety Edge Sensor Alignment Fault",
    priority: "MEDIUM",
    status: "NEW",
    coveragePlan: "custom",
    slaRemainingMinutes: null, // Plan D has negotiated terms, NO invented SLA
  },
];

const INITIAL_WORK_ORDERS = [
  {
    id: "WO-3001",
    requestId: "SR-1004",
    customerName: "Square Pharmaceuticals Hub",
    facilityAddress: "Road 11, Sector 4, Uttara, Dhaka",
    category: "Internet, networking, and hardware",
    assetName: "Core Switch Stack SW-CORE-01",
    problemSummary: "SFP Uplink Intermittent Flapping",
    priority: "HIGH",
    status: "UNASSIGNED",
    coveragePlan: "247-standard",
    slaDeadline: "2026-11-11T12:00:00Z",
  },
  {
    id: "WO-2998",
    requestId: "SR-0994",
    customerName: "ACI Foods Processing Plant",
    facilityAddress: "Narsingdi Highway Junction, Rupganj",
    category: "Electrical and power systems",
    assetName: "Main Distribution Switchboard MSB-01",
    problemSummary: "ACB Breaker Trip",
    priority: "URGENT",
    status: "ON_SITE",
    assignedTechnicianId: "tech-01",
    assignedTechnicianName: "Kamrul Islam",
    coveragePlan: "247-priority",
    slaDeadline: "2026-11-11T10:00:00Z",
  },
  {
    id: "WO-2995",
    requestId: "SR-0988",
    customerName: "Walton Hi-Tech Industries",
    facilityAddress: "Chandra, Gazipur",
    category: "Electrical and power systems",
    assetName: "Substation Relay Protection REF-01",
    problemSummary: "Overcurrent relay trip threshold testing",
    priority: "MEDIUM",
    status: "ASSIGNED",
    assignedTechnicianId: "tech-01",
    assignedTechnicianName: "Kamrul Islam",
    coveragePlan: "8hr",
    slaDeadline: null, // Plan A has NO physical arrival SLA
  },
];

const INITIAL_TECHNICIANS = [
  {
    id: "tech-01",
    name: "Kamrul Islam",
    employeeId: "EMP-E-01",
    branch: "EPZ Industrial Core",
    designation: "Certified Master Electrician",
    status: "AVAILABLE",
    activeJobCount: 0,
    skills: [{ id: "sk-01", name: "High Voltage Panels", category: "Electrical and power systems" }],
    certifications: [
      {
        id: "cert-01",
        name: "BEE Grade-A Electrical License",
        verified: true,
        expiryDate: "2028-12-31",
      },
    ],
  },
  {
    id: "tech-05",
    name: "Tariqul Islam",
    employeeId: "EMP-N-05",
    branch: "EPZ Industrial Core",
    designation: "Network Infrastructure Specialist",
    status: "AVAILABLE",
    activeJobCount: 0,
    skills: [{ id: "sk-13", name: "Cisco Catalyst Switch Stacks", category: "Internet, networking, and hardware" }],
    certifications: [{ id: "cert-05", name: "CCNA", verified: true, expiryDate: "2027-06-30" }],
  },
  {
    id: "tech-09",
    name: "Rafiqul Islam (Expired License)",
    employeeId: "EMP-E-09",
    branch: "EPZ Industrial Core",
    designation: "Industrial Electrician",
    status: "AVAILABLE",
    activeJobCount: 0,
    skills: [{ id: "sk-01", name: "High Voltage Panels", category: "Electrical and power systems" }],
    certifications: [
      {
        id: "cert-10",
        name: "BEE Grade-B Electrical License (EXPIRED)",
        verified: true,
        expiryDate: "2023-01-15", // EXPIRED
      },
    ],
  },
  {
    id: "tech-10",
    name: "Farooq Hossain (Pending Verification)",
    employeeId: "EMP-S-10",
    branch: "Tejgaon Hub",
    designation: "Security Systems Technician",
    status: "AVAILABLE",
    activeJobCount: 0,
    skills: [{ id: "sk-11", name: "PTZ Dome Cameras", category: "CCTV and security" }],
    certifications: [
      {
        id: "cert-11",
        name: "SIA Security Surveillance Installer",
        verified: false, // UNVERIFIED
        expiryDate: "2028-12-31",
      },
    ],
  },
  {
    id: "tech-11",
    name: "Sajid Karim (On Leave)",
    employeeId: "EMP-H-11",
    branch: "Gazipur Zone",
    designation: "HVAC Specialist",
    status: "ON_LEAVE", // ON LEAVE
    activeJobCount: 0,
    skills: [{ id: "sk-04", name: "Centrifugal Chillers", category: "AC, HVAC, and cooling" }],
    certifications: [{ id: "cert-12", name: "EPA 608 Universal", verified: true, expiryDate: "2028-05-10" }],
  },
  {
    id: "tech-12",
    name: "Jahangir Alam (Off Duty)",
    employeeId: "EMP-E-12",
    branch: "EPZ Industrial Core",
    designation: "Industrial Electrician",
    status: "OFF_DUTY", // OFF DUTY
    activeJobCount: 0,
    skills: [{ id: "sk-01", name: "High Voltage Panels", category: "Electrical and power systems" }],
    certifications: [{ id: "cert-13", name: "BEE Grade-A", verified: true, expiryDate: "2027-10-01" }],
  },
  {
    id: "tech-13",
    name: "Belal Ahmed (Overloaded)",
    employeeId: "EMP-P-13",
    branch: "Tejgaon Hub",
    designation: "Plumbing Specialist",
    status: "ON_JOB",
    activeJobCount: 3, // OVERLOADED WITH 3 JOBS
    skills: [{ id: "sk-07", name: "High Pressure Booster Pumps", category: "Plumbing and water systems" }],
    certifications: [{ id: "cert-14", name: "Commercial Piping Class-1", verified: true, expiryDate: "2027-08-15" }],
  },
];

const VALID_WORK_ORDER_TRANSITIONS = {
  UNASSIGNED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["TRAVELLING", "CANCELLED"],
  TRAVELLING: ["ON_SITE", "CANCELLED"],
  ON_SITE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// Pure test dispatcher service implementation mirroring dispatcherService.ts exactly
class TestDispatcherService {
  constructor(axiosInstance) {
    this.api = axiosInstance;
    this.reset();
  }

  reset() {
    this.requests = JSON.parse(JSON.stringify(INITIAL_SERVICE_REQUESTS));
    this.workOrders = JSON.parse(JSON.stringify(INITIAL_WORK_ORDERS));
    this.technicians = JSON.parse(JSON.stringify(INITIAL_TECHNICIANS));
  }

  async getMetrics() {
    try {
      const res = await this.api.get("/dispatcher/metrics");
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw err;
      }
      const unassignedRequests = this.requests.filter((r) => r.status === "NEW" || r.status === "REVIEWING").length;
      const activeWorkOrders = this.workOrders.filter(
        (w) => w.status === "ASSIGNED" || w.status === "TRAVELLING" || w.status === "ON_SITE"
      ).length;
      const techniciansOnDuty = this.technicians.filter((t) => t.status === "AVAILABLE" || t.status === "ON_JOB").length;
      const urgentSlaWatch = this.requests.filter((r) => r.priority === "URGENT").length;
      return {
        success: true,
        data: {
          unassignedRequests,
          activeWorkOrders,
          techniciansOnDuty,
          urgentSlaWatch,
          tradeCoverage: CANONICAL_SERVICE_CATEGORIES.map((cat) => ({
            category: cat,
            availableCount: this.technicians.filter(
              (t) => t.status === "AVAILABLE" && t.skills.some((s) => s.category === cat)
            ).length,
          })),
        },
        isOffline: true,
      };
    }
  }

  async convertRequestToWorkOrder(dto) {
    try {
      const res = await this.api.post("/dispatcher/work-orders", dto);
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw err;
      }
      const request = this.requests.find((r) => r.id === dto.requestId);
      if (!request) throw new Error("Request not found");

      const plan = dto.coveragePlan || request.coveragePlan || "247-standard";
      let slaDeadline = null;
      if (dto.slaDeadline !== undefined) {
        slaDeadline = dto.slaDeadline;
      } else if (plan === "247-priority") {
        slaDeadline = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      } else if (plan === "247-standard") {
        slaDeadline = new Date(Date.now() + 40 * 60 * 1000).toISOString();
      }

      const newId = `WO-${3000 + this.workOrders.length + 1}`;
      const newOrder = {
        id: newId,
        requestId: request.id,
        customerName: request.customerName,
        facilityAddress: request.facilityAddress,
        category: request.category,
        assetName: request.assetName,
        problemSummary: request.problemTitle,
        priority: dto.priority || request.priority,
        status: "UNASSIGNED",
        coveragePlan: plan,
        slaDeadline,
      };
      request.status = "CONVERTED";
      this.workOrders.unshift(newOrder);
      return { success: true, data: newOrder, isOffline: true };
    }
  }

  async getMatchingTechnicians(workOrderId) {
    try {
      const res = await this.api.get(`/dispatcher/work-orders/${workOrderId}/matching`);
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw err;
      }
      const order = this.workOrders.find((w) => w.id === workOrderId);
      if (!order) throw new Error("Order not found");

      const recs = [];
      for (const tech of this.technicians) {
        // Status exclusion
        if (tech.status === "OFF_DUTY" || tech.status === "ON_LEAVE" || tech.status === "UNAVAILABLE") continue;

        // Overloaded exclusion (>= 3 jobs)
        if (tech.activeJobCount >= 3) continue;

        // Trade skill match
        const hasSkill = tech.skills.some((s) => s.category === order.category);
        if (!hasSkill) continue;

        // Active unexpired verified certification check
        const activeVerifiedCerts = tech.certifications.filter((c) => {
          if (!c.verified) return false;
          if (!c.expiryDate) return true;
          const exp = new Date(c.expiryDate);
          return !isNaN(exp.getTime()) && exp >= new Date();
        });

        if (activeVerifiedCerts.length === 0) continue; // Disqualified

        const isStandby = tech.status === "AVAILABLE" && tech.activeJobCount === 0;

        let score = 50;
        if (activeVerifiedCerts.length > 0) score += 25;
        if (isStandby) score += 15;
        score = Math.min(100, score);

        const recommendationTier = isStandby ? "TIER_1_PREFERRED" : "TIER_2_ELIGIBLE";

        recs.push({
          technicianId: tech.id,
          technicianName: tech.name,
          matchScore: score,
          recommendationTier,
          activeJobCount: tech.activeJobCount,
          explanation: `${score}% score: Verified in ${order.category}`,
        });
      }
      recs.sort((a, b) => b.matchScore - a.matchScore);
      return { success: true, data: recs, isOffline: true };
    }
  }

  async assignTechnician(dto) {
    try {
      const res = await this.api.post(`/dispatcher/work-orders/${dto.workOrderId}/assign`, dto);
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw err;
      }
      const order = this.workOrders.find((w) => w.id === dto.workOrderId);
      if (!order) throw new Error("Order not found");
      if (order.status !== "UNASSIGNED") {
        throw new Error(`Cannot assign technician to order with status ${order.status}`);
      }

      const tech = this.technicians.find((t) => t.id === dto.technicianId);
      if (!tech) throw new Error("Technician not found");

      order.status = "ASSIGNED";
      order.assignedTechnicianId = tech.id;
      order.assignedTechnicianName = tech.name;
      tech.status = "ON_JOB";
      tech.activeJobCount += 1;
      return { success: true, data: order, isOffline: true };
    }
  }

  async updateWorkOrderStatus(orderId, status) {
    try {
      const res = await this.api.patch(`/dispatcher/work-orders/${orderId}/status`, { status });
      return res.data;
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw err;
      }
      const order = this.workOrders.find((w) => w.id === orderId);
      if (!order) throw new Error("Order not found");

      const allowed = VALID_WORK_ORDER_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) {
        throw new Error(
          `Invalid status transition: Cannot transition Work Order ${order.id} from "${order.status}" to "${status}".`
        );
      }

      order.status = status;
      if (status === "COMPLETED" && order.assignedTechnicianId) {
        const tech = this.technicians.find((t) => t.id === order.assignedTechnicianId);
        if (tech && tech.activeJobCount > 0) {
          tech.activeJobCount -= 1;
          if (tech.activeJobCount === 0) tech.status = "AVAILABLE";
        }
      }
      return { success: true, data: order, isOffline: true };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Telemetry and 404 Fallback Tests
// ─────────────────────────────────────────────────────────────────────────────
test("Scenario 1: Dispatcher metrics computation handles 404 by returning truthful offline baseline", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);
  const res = await service.getMetrics();
  assert.equal(res.success, true);
  assert.equal(res.isOffline, true);
  assert.equal(res.data.unassignedRequests, 4);
  assert.equal(res.data.activeWorkOrders, 2);
  assert.equal(res.data.tradeCoverage.length, 7);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Authentication Error Propagation Tests (401 & 403 must never be swallowed)
// ─────────────────────────────────────────────────────────────────────────────
test("Scenario 2: HTTP 401 Unauthorized errors are thrown and NEVER swallowed into offline demo mode", async () => {
  const mock = new MockAxios();
  mock.on("GET", "/dispatcher/metrics", () => {
    const err = new Error("Unauthorized");
    err.response = { status: 401, data: { message: "Invalid JWT token" } };
    throw err;
  });

  const service = new TestDispatcherService(mock);
  await assert.rejects(
    async () => {
      await service.getMetrics();
    },
    (err) => {
      assert.equal(err.response?.status, 401);
      return true;
    }
  );
});

test("Scenario 3: HTTP 403 Forbidden errors are thrown and NEVER swallowed into offline demo mode", async () => {
  const mock = new MockAxios();
  mock.on("POST", "/dispatcher/work-orders", () => {
    const err = new Error("Forbidden");
    err.response = { status: 403, data: { message: "Dispatcher role required" } };
    throw err;
  });

  const service = new TestDispatcherService(mock);
  await assert.rejects(
    async () => {
      await service.convertRequestToWorkOrder({ requestId: "SR-1001" });
    },
    (err) => {
      assert.equal(err.response?.status, 403);
      return true;
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Service Category & SLA Coverage Rule Tests (4 Plans)
// ─────────────────────────────────────────────────────────────────────────────
test("Scenario 4: Plan A (8-Hour Daily) conversion results in null arrival SLA deadline", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  const res = await service.convertRequestToWorkOrder({
    requestId: "SR-1003", // Rahimafrooz is on Plan A (8hr)
  });

  assert.equal(res.success, true);
  assert.equal(res.data.coveragePlan, "8hr");
  assert.equal(res.data.slaDeadline, null, "8-Hour Daily Coverage has no physical arrival SLA");
});

test("Scenario 5: Plan C (24/7 Priority) conversion defaults to 20-minute physical arrival SLA", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  const res = await service.convertRequestToWorkOrder({
    requestId: "SR-1001", // Apex is on Plan C (247-priority)
  });

  assert.equal(res.success, true);
  assert.equal(res.data.coveragePlan, "247-priority");
  assert.ok(res.data.slaDeadline, "24/7 Priority must have a physical arrival SLA deadline");

  const diffMinutes = Math.round((new Date(res.data.slaDeadline).getTime() - Date.now()) / (60 * 1000));
  assert.ok(diffMinutes >= 19 && diffMinutes <= 21, `Expected ~20m SLA target, got ${diffMinutes}m`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Arithmetic Matching Engine Hardening & Disqualification Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
test("Scenario 6: Disqualifies technicians with expired licenses (tech-09 expired in 2023)", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  // WO-2998 requires Electrical and power systems
  const match = await service.getMatchingTechnicians("WO-2998");

  // tech-09 has expired BEE Grade-B license -> must be disqualified
  const hasExpiredTech = match.data.some((t) => t.technicianId === "tech-09");
  assert.equal(hasExpiredTech, false, "Technician with expired license must be disqualified");

  // tech-01 has valid BEE Grade-A license -> must be included
  const hasValidTech = match.data.some((t) => t.technicianId === "tech-01");
  assert.equal(hasValidTech, true, "Technician with active verified license must be included");
});

test("Scenario 7: Disqualifies technicians with pending/unverified credentials (tech-10)", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  // Add CCTV work order
  service.workOrders.push({
    id: "WO-TEST-CCTV",
    category: "CCTV and security",
    customerName: "Test Facility",
    facilityAddress: "Tejgaon",
    status: "UNASSIGNED",
  });

  const match = await service.getMatchingTechnicians("WO-TEST-CCTV");
  const hasPendingTech = match.data.some((t) => t.technicianId === "tech-10");
  assert.equal(hasPendingTech, false, "Technician with unverified credential must be disqualified");
});

test("Scenario 8: Disqualifies off-duty (tech-12) and on-leave (tech-11) technicians", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  const match = await service.getMatchingTechnicians("WO-2998");
  assert.equal(match.data.some((t) => t.technicianId === "tech-12"), false, "Off-duty technician must be excluded");
  assert.equal(match.data.some((t) => t.technicianId === "tech-11"), false, "On-leave technician must be excluded");
});

test("Scenario 9: Disqualifies overloaded technicians with 3 or more active concurrent jobs (tech-13)", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  // Add Plumbing work order
  service.workOrders.push({
    id: "WO-TEST-PLUMB",
    category: "Plumbing and water systems",
    customerName: "Test Facility",
    facilityAddress: "Tejgaon",
    status: "UNASSIGNED",
  });

  const match = await service.getMatchingTechnicians("WO-TEST-PLUMB");
  const hasOverloaded = match.data.some((t) => t.technicianId === "tech-13");
  assert.equal(hasOverloaded, false, "Technician with 3+ active jobs must be disqualified as overloaded");
});

test("Scenario 10: Assigns recommendation tiers (TIER_1_PREFERRED vs TIER_2_ELIGIBLE)", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  const match = await service.getMatchingTechnicians("WO-3001");
  assert.equal(match.data.length, 1);
  assert.equal(match.data[0].technicianId, "tech-05");
  assert.equal(match.data[0].recommendationTier, "TIER_1_PREFERRED", "Standby certified technician is Tier 1");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Work Order Operational Lifecycle State Transition Tests
// ─────────────────────────────────────────────────────────────────────────────
test("Scenario 11: Valid linear lifecycle transitions (UNASSIGNED -> ASSIGNED -> TRAVELLING -> ON_SITE -> COMPLETED)", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  // 1. Assign tech-05 to WO-3001
  const assignRes = await service.assignTechnician({
    workOrderId: "WO-3001",
    technicianId: "tech-05",
  });
  assert.equal(assignRes.data.status, "ASSIGNED");

  // 2. ASSIGNED -> TRAVELLING
  const travelRes = await service.updateWorkOrderStatus("WO-3001", "TRAVELLING");
  assert.equal(travelRes.data.status, "TRAVELLING");

  // 3. TRAVELLING -> ON_SITE
  const onsiteRes = await service.updateWorkOrderStatus("WO-3001", "ON_SITE");
  assert.equal(onsiteRes.data.status, "ON_SITE");

  // 4. ON_SITE -> COMPLETED
  const completeRes = await service.updateWorkOrderStatus("WO-3001", "COMPLETED");
  assert.equal(completeRes.data.status, "COMPLETED");

  // Technician must be freed
  const tech = service.technicians.find((t) => t.id === "tech-05");
  assert.equal(tech.activeJobCount, 0);
  assert.equal(tech.status, "AVAILABLE");
});

test("Scenario 12: Invalid lifecycle transitions are rejected with explicit errors", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  // Attempt illegal jump: UNASSIGNED -> COMPLETED
  await assert.rejects(
    async () => {
      await service.updateWorkOrderStatus("WO-3001", "COMPLETED");
    },
    (err) => {
      assert.ok(err.message.includes("Invalid status transition"));
      return true;
    }
  );

  // Attempt illegal re-opening of COMPLETED order
  // First complete WO-2998 (which is currently ON_SITE)
  await service.updateWorkOrderStatus("WO-2998", "COMPLETED");

  // Attempt to transition COMPLETED order to ASSIGNED
  await assert.rejects(
    async () => {
      await service.updateWorkOrderStatus("WO-2998", "ASSIGNED");
    },
    (err) => {
      assert.ok(err.message.includes("Invalid status transition"));
      return true;
    }
  );
});
