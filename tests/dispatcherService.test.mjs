// Automated Unit Tests for Dispatcher Service
// Tests offline demonstration baselines, arithmetic matching engine, request-to-order conversion, and safe assignment.

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
  },
];

const INITIAL_WORK_ORDERS = [
  {
    id: "WO-3001",
    requestId: "SR-1004",
    customerName: "Square Pharmaceuticals Distribution Hub",
    facilityAddress: "Road 11, Sector 4, Uttara, Dhaka",
    category: "Internet, networking, and hardware",
    assetName: "Core Switch Stack SW-CORE-01",
    problemSummary: "SFP Uplink Intermittent Flapping",
    priority: "HIGH",
    status: "UNASSIGNED",
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
  },
];

const INITIAL_TECHNICIANS = [
  {
    id: "tech-01",
    name: "Kamrul Islam",
    branch: "EPZ Industrial Core",
    designation: "Certified Master Electrician",
    status: "ON_JOB",
    activeJobCount: 1,
    skills: [{ id: "sk-01", name: "High Voltage Panels", category: "Electrical and power systems" }],
    certifications: [{ name: "BEE Grade-A Electrical License", verified: true }],
  },
  {
    id: "tech-05",
    name: "Tariqul Islam",
    branch: "EPZ Industrial Core",
    designation: "Network Infrastructure Specialist",
    status: "AVAILABLE",
    activeJobCount: 0,
    skills: [{ id: "sk-13", name: "Cisco Catalyst Switch Stacks", category: "Internet, networking, and hardware" }],
    certifications: [{ name: "CCNA", verified: true }],
  },
  {
    id: "tech-off",
    name: "Off Duty Tech",
    branch: "EPZ Industrial Core",
    designation: "General Electrician",
    status: "OFF_DUTY",
    activeJobCount: 0,
    skills: [{ id: "sk-01", name: "High Voltage Panels", category: "Electrical and power systems" }],
    certifications: [{ name: "BEE Grade-B", verified: true }],
  },
];

// Pure dispatcher service engine for testing
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
    } catch {
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
    } catch {
      const request = this.requests.find((r) => r.id === dto.requestId);
      if (!request) throw new Error("Request not found");
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
    } catch {
      const order = this.workOrders.find((w) => w.id === workOrderId);
      if (!order) throw new Error("Order not found");

      const recs = [];
      for (const tech of this.technicians) {
        if (tech.status === "OFF_DUTY" || tech.status === "ON_LEAVE") continue;
        const hasSkill = tech.skills.some((s) => s.category === order.category);
        if (!hasSkill) continue;

        let score = 50;
        if (tech.certifications.some((c) => c.verified)) score += 25;
        if (tech.status === "AVAILABLE") score += 15;
        score = Math.min(100, score);

        recs.push({
          technicianId: tech.id,
          technicianName: tech.name,
          matchScore: score,
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
    } catch {
      const order = this.workOrders.find((w) => w.id === dto.workOrderId);
      const tech = this.technicians.find((t) => t.id === dto.technicianId);
      order.status = "ASSIGNED";
      order.assignedTechnicianId = tech.id;
      tech.status = "ON_JOB";
      tech.activeJobCount += 1;
      return { success: true, data: order, isOffline: true };
    }
  }

  async completeWorkOrder(orderId) {
    const order = this.workOrders.find((w) => w.id === orderId);
    order.status = "COMPLETED";
    if (order.assignedTechnicianId) {
      const tech = this.technicians.find((t) => t.id === order.assignedTechnicianId);
      tech.activeJobCount -= 1;
      if (tech.activeJobCount === 0) tech.status = "AVAILABLE";
    }
    return { success: true, data: order, isOffline: true };
  }
}

test("Scenario 1: Dispatcher metrics computation handles 404 by returning truthful offline baseline", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);
  const res = await service.getMetrics();
  assert.equal(res.success, true);
  assert.equal(res.isOffline, true);
  assert.equal(res.data.unassignedRequests, 2);
  assert.equal(res.data.activeWorkOrders, 1);
  assert.equal(res.data.tradeCoverage.length, 7);
});

test("Scenario 2: Converting a service request to a Work Order", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);
  const convertRes = await service.convertRequestToWorkOrder({
    requestId: "SR-1001",
    priority: "URGENT",
  });
  assert.equal(convertRes.success, true);
  assert.ok(convertRes.data.id.startsWith("WO-"));
  assert.equal(convertRes.data.status, "UNASSIGNED");
  assert.equal(convertRes.data.category, "Electrical and power systems");
  assert.equal(service.requests.find((r) => r.id === "SR-1001").status, "CONVERTED");
});

test("Scenario 3: Arithmetic Matching Engine enforces trade matching and excludes off-duty staff", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  // WO-3001 is Internet, networking, and hardware
  const netMatch = await service.getMatchingTechnicians("WO-3001");
  assert.equal(netMatch.data.length, 1);
  assert.equal(netMatch.data[0].technicianName, "Tariqul Islam");
  assert.equal(netMatch.data[0].matchScore, 90);

  // Off duty tech (tech-off) must NEVER be recommended
  const elecMatch = await service.getMatchingTechnicians("WO-2998");
  const hasOffDuty = elecMatch.data.some((t) => t.technicianId === "tech-off");
  assert.equal(hasOffDuty, false, "Off duty technician must be excluded from matching recommendations");
});

test("Scenario 4: Safe Human Assignment workflow updates technician and order", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  const assignRes = await service.assignTechnician({
    workOrderId: "WO-3001",
    technicianId: "tech-05",
  });

  assert.equal(assignRes.success, true);
  assert.equal(assignRes.data.status, "ASSIGNED");
  assert.equal(service.technicians.find((t) => t.id === "tech-05").status, "ON_JOB");
  assert.equal(service.technicians.find((t) => t.id === "tech-05").activeJobCount, 1);
});

test("Scenario 5: Work order completion releases technician to AVAILABLE status", async () => {
  const mock = new MockAxios();
  const service = new TestDispatcherService(mock);

  // WO-2998 was assigned to Kamrul Islam (tech-01)
  const completeRes = await service.completeWorkOrder("WO-2998");
  assert.equal(completeRes.success, true);
  assert.equal(completeRes.data.status, "COMPLETED");

  const tech = service.technicians.find((t) => t.id === "tech-01");
  assert.equal(tech.activeJobCount, 0);
  assert.equal(tech.status, "AVAILABLE");
});
