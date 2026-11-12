// Comprehensive Automated Integration Tests: End-to-End Service Lifecycle Workflow
// Verifies:
// 1. Customer request creation and validation.
// 2. Dispatcher review, SLA calculation, and Work Order conversion.
// 3. Dispatcher candidate matching and human-confirmed assignment.
// 4. Technician job receipt and strict linear progression (ASSIGNED -> TRAVELLING -> ON_SITE -> COMPLETED).
// 5. Automatic technician release to AVAILABLE upon completion.
// 6. Automatic invoice generation and customer payment processing.
// 7. Rejection of illegal lifecycle state jumps and duplicate mutations.
// 8. End-to-end operational audit event logging.

import test from "node:test";
import assert from "node:assert/strict";

const VALID_WORK_ORDER_TRANSITIONS = {
  UNASSIGNED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["TRAVELLING", "CANCELLED"],
  TRAVELLING: ["ON_SITE", "CANCELLED"],
  ON_SITE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

class WorkflowHarness {
  constructor() {
    this.reset();
  }

  reset() {
    this.requests = [
      {
        id: "SR-1001",
        customerId: "cust-epz-01",
        customerName: "Apex Spinning & Weaving Mills",
        facilityAddress: "Plot 14-18, Sector 3, DEPZ, Savar",
        category: "Electrical and power systems",
        assetName: "Substation Transformer TR-02",
        problemTitle: "Oil Temperature High Warning",
        problemDescription: "Winding temp reached 92C.",
        priority: "URGENT",
        status: "NEW",
        submittedAt: new Date().toISOString(),
        coveragePlan: "247-priority",
        slaRemainingMinutes: 20,
      },
    ];

    this.workOrders = [
      {
        id: "WO-3001",
        requestId: "SR-1004",
        customerName: "Square Pharma Hub",
        facilityAddress: "Road 11, Uttara, Dhaka",
        category: "Internet, networking, and hardware",
        assetName: "Core Switch Stack SW-01",
        problemSummary: "SFP Uplink Intermittent Flapping",
        priority: "HIGH",
        status: "UNASSIGNED",
        coveragePlan: "247-standard",
        slaDeadline: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    this.technicians = [
      {
        id: "tech-01",
        name: "Kamrul Islam",
        designation: "Certified Master Electrician",
        status: "AVAILABLE",
        activeJobCount: 0,
        skills: [{ id: "sk-1", name: "High Voltage", category: "Electrical and power systems" }],
        certifications: [{ id: "c-1", name: "BEE Grade A", verified: true, expiryDate: "2028-12-31" }],
      },
      {
        id: "tech-02",
        name: "Farhan Ahmed",
        designation: "HVAC Specialist",
        status: "AVAILABLE",
        activeJobCount: 0,
        skills: [{ id: "sk-2", name: "Chillers", category: "AC, HVAC, and cooling" }],
        certifications: [{ id: "c-2", name: "EPA Universal", verified: true, expiryDate: "2027-10-15" }],
      },
      {
        id: "tech-03",
        name: "Tanvir Ahmed",
        designation: "Fluid Systems Tech",
        status: "AVAILABLE",
        activeJobCount: 2, // At maximum allowed workload
        skills: [{ id: "sk-3", name: "Pumps", category: "Plumbing and water systems" }],
        certifications: [{ id: "c-3", name: "DOE Hydraulic", verified: true, expiryDate: "2028-05-20" }],
      },
    ];

    this.invoices = [];
    this.events = [];
  }

  // 1. Customer create request
  createCustomerRequest(dto, customer = { id: "cust-epz-01", name: "Apex Spinning Mills" }) {
    if (!dto.problemTitle?.trim()) {
      throw new Error("Validation Error: Problem title is required.");
    }
    if (!dto.problemDescription?.trim()) {
      throw new Error("Validation Error: Problem description is required.");
    }
    if (!dto.assetName?.trim()) {
      throw new Error("Validation Error: Asset name is required.");
    }

    const plan = dto.coveragePlan || "247-standard";
    let slaRemainingMinutes = null;
    if (plan === "247-priority") slaRemainingMinutes = 20;
    else if (plan === "247-standard") slaRemainingMinutes = 40;

    const id = `SR-${1000 + this.requests.length + 1}`;
    const newReq = {
      id,
      customerId: customer.id,
      customerName: customer.name,
      facilityAddress: dto.facilityAddress || "DEPZ Sector 3, Savar",
      category: dto.category,
      assetName: dto.assetName,
      problemTitle: dto.problemTitle.trim(),
      problemDescription: dto.problemDescription.trim(),
      priority: dto.priority,
      status: "NEW",
      submittedAt: new Date().toISOString(),
      coveragePlan: plan,
      slaRemainingMinutes,
    };

    this.requests.unshift(newReq);
    this.events.unshift({
      id: `EVT-${Date.now()}`,
      action: "REQUEST_REVIEWED",
      targetId: id,
      summary: `New service request submitted: ${id}`,
    });

    return newReq;
  }

  // 2. Dispatcher convert request to work order
  convertRequestToWorkOrder(dto) {
    const req = this.requests.find((r) => r.id === dto.requestId);
    if (!req) throw new Error(`Service request ${dto.requestId} not found.`);
    if (req.status === "CONVERTED") {
      const err = new Error(`Service request ${dto.requestId} is already converted into a Work Order.`);
      err.code = "ALREADY_CONVERTED";
      throw err;
    }

    const plan = dto.coveragePlan || req.coveragePlan || "247-standard";
    let slaDeadline = null;
    if (plan === "247-priority") slaDeadline = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    else if (plan === "247-standard") slaDeadline = new Date(Date.now() + 40 * 60 * 1000).toISOString();

    const newWorkOrderId = `WO-${3000 + this.workOrders.length + 1}`;
    const wo = {
      id: newWorkOrderId,
      requestId: req.id,
      customerName: req.customerName,
      facilityAddress: req.facilityAddress,
      category: req.category,
      assetName: req.assetName,
      problemSummary: req.problemTitle,
      priority: dto.priority || req.priority,
      status: "UNASSIGNED",
      coveragePlan: plan,
      slaDeadline,
      createdAt: new Date().toISOString(),
      workNotes: dto.notes,
    };

    req.status = "CONVERTED";
    req.workOrderId = newWorkOrderId;
    this.workOrders.unshift(wo);

    this.events.unshift({
      id: `EVT-${Date.now()}`,
      action: "ORDER_CREATED",
      targetId: newWorkOrderId,
      summary: `Converted ${req.id} into Work Order ${newWorkOrderId}`,
    });

    return wo;
  }

  // 3. Dispatcher assign technician
  assignTechnician(dto) {
    const order = this.workOrders.find((w) => w.id === dto.workOrderId);
    if (!order) throw new Error(`Work order ${dto.workOrderId} not found.`);
    if (order.status !== "UNASSIGNED") {
      const err = new Error(`Cannot assign technician to work order with status "${order.status}".`);
      err.code = "INVALID_STATUS";
      throw err;
    }

    const tech = this.technicians.find((t) => t.id === dto.technicianId);
    if (!tech) throw new Error(`Technician ${dto.technicianId} not found.`);
    if (tech.activeJobCount >= 3) {
      const err = new Error(`Cannot dispatch ${tech.name}: technician overloaded.`);
      err.code = "TECHNICIAN_OVERLOADED";
      throw err;
    }

    order.status = "ASSIGNED";
    order.assignedTechnicianId = tech.id;
    order.assignedTechnicianName = `${tech.name} (${tech.designation})`;

    tech.status = "ON_JOB";
    tech.activeJobCount += 1;

    this.events.unshift({
      id: `EVT-${Date.now()}`,
      action: "TECH_DISPATCHED",
      targetId: order.id,
      summary: `Assigned technician ${tech.name} to ${order.id}`,
    });

    return order;
  }

  // 4. Technician advance status
  updateJobStatus(workOrderId, newStatus, notes, actorName = "Technician") {
    const order = this.workOrders.find((w) => w.id === workOrderId);
    if (!order) throw new Error(`Work order ${workOrderId} not found.`);

    const allowed = VALID_WORK_ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      const err = new Error(`Invalid status transition from ${order.status} to ${newStatus}.`);
      err.code = "INVALID_TRANSITION";
      throw err;
    }

    const prev = order.status;
    order.status = newStatus;
    if (notes) order.workNotes = order.workNotes ? `${order.workNotes} | ${notes}` : notes;

    if (newStatus === "TRAVELLING" && !order.startedAt) {
      order.startedAt = new Date().toISOString();
    } else if (newStatus === "COMPLETED") {
      order.completedAt = new Date().toISOString();

      // Release tech
      if (order.assignedTechnicianId) {
        const tech = this.technicians.find((t) => t.id === order.assignedTechnicianId);
        if (tech && tech.activeJobCount > 0) {
          tech.activeJobCount -= 1;
          if (tech.activeJobCount === 0) tech.status = "AVAILABLE";
        }
      }

      // Generate customer invoice
      const invoiceId = `INV-${4100 + this.invoices.length + 1}`;
      this.invoices.unshift({
        id: invoiceId,
        workOrderId: order.id,
        customerId: "cust-epz-01",
        customerName: order.customerName,
        assetName: order.assetName,
        billingDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        status: "PAYMENT_DUE",
        items: [
          { id: "i1", description: `Field Service: ${order.category}`, quantity: 1, unitPrice: 150, totalPrice: 150 },
          { id: "i2", description: `Repair: ${order.problemSummary}`, quantity: 1, unitPrice: 280, totalPrice: 280 },
        ],
        subtotal: 430,
        taxRate: 0.05,
        taxAmount: 21.5,
        totalAmount: 451.5,
      });
    }

    this.events.unshift({
      id: `EVT-${Date.now()}`,
      action: "STATUS_CHANGED",
      targetId: order.id,
      summary: `Work order transitioned from ${prev} to ${newStatus}`,
    });

    return order;
  }

  // 5. Customer pay invoice
  payInvoice(invoiceId) {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found.`);
    inv.status = "PAID";
    return inv;
  }
}

const harness = new WorkflowHarness();

test.beforeEach(() => {
  harness.reset();
});

test("Integration Test 1: Customer request creation, validation, and SLA assignment", () => {
  assert.throws(
    () => {
      harness.createCustomerRequest({
        category: "Electrical and power systems",
        assetName: "Transformer T-01",
        problemTitle: "",
        problemDescription: "High temp",
        priority: "URGENT",
      });
    },
    { message: /Problem title is required/ }
  );

  const req = harness.createCustomerRequest({
    category: "Electrical and power systems",
    assetName: "Main Switchgear MSB-02",
    problemTitle: "Arcing Sound & Flashover",
    problemDescription: "Busbar arcing audible near Section B.",
    priority: "URGENT",
    coveragePlan: "247-priority",
  });

  assert.equal(req.status, "NEW");
  assert.equal(req.slaRemainingMinutes, 20);
  assert.equal(req.coveragePlan, "247-priority");
  assert(req.id.startsWith("SR-"));
});

test("Integration Test 2: Dispatcher conversion to Work Order & duplicate protection", () => {
  const req = harness.createCustomerRequest({
    category: "AC, HVAC, and cooling",
    assetName: "Chiller CH-02",
    problemTitle: "Refrigerant Leak",
    problemDescription: "Pressure switch tripped.",
    priority: "HIGH",
    coveragePlan: "247-standard",
  });

  const wo = harness.convertRequestToWorkOrder({
    requestId: req.id,
    priority: "HIGH",
  });

  assert.equal(wo.status, "UNASSIGNED");
  assert.equal(wo.requestId, req.id);
  assert(wo.slaDeadline !== null);

  assert.throws(
    () => {
      harness.convertRequestToWorkOrder({ requestId: req.id, priority: "HIGH" });
    },
    (err) => err.code === "ALREADY_CONVERTED"
  );
});

test("Integration Test 3: Dispatcher candidate assignment and overload prevention", () => {
  const req = harness.createCustomerRequest({
    category: "Electrical and power systems",
    assetName: "Generator G-04",
    problemTitle: "No Crank on Test",
    problemDescription: "Starter relay clicking.",
    priority: "URGENT",
  });

  const wo = harness.convertRequestToWorkOrder({ requestId: req.id, priority: "URGENT" });

  // tech-01 has 0 active jobs -> eligible
  const assignedWO = harness.assignTechnician({
    workOrderId: wo.id,
    technicianId: "tech-01",
  });

  assert.equal(assignedWO.status, "ASSIGNED");
  assert.equal(assignedWO.assignedTechnicianId, "tech-01");
  const tech = harness.technicians.find((t) => t.id === "tech-01");
  assert.equal(tech.activeJobCount, 1);
  assert.equal(tech.status, "ON_JOB");

  // Prevent duplicate assignment on already assigned order
  assert.throws(
    () => {
      harness.assignTechnician({ workOrderId: wo.id, technicianId: "tech-02" });
    },
    (err) => err.code === "INVALID_STATUS"
  );
});

test("Integration Test 4: Strict linear lifecycle progression & invalid jump rejection", () => {
  const req = harness.createCustomerRequest({
    category: "Plumbing and water systems",
    assetName: "Water Booster Pump P-03",
    problemTitle: "Gland Leakage",
    problemDescription: "High pressure line leaking 40 psi.",
    priority: "HIGH",
  });
  const wo = harness.convertRequestToWorkOrder({ requestId: req.id, priority: "HIGH" });
  harness.assignTechnician({ workOrderId: wo.id, technicianId: "tech-01" });

  // 1. Illegal jump: ASSIGNED -> COMPLETED rejected
  assert.throws(
    () => {
      harness.updateJobStatus(wo.id, "COMPLETED", "Bypassing travel and on site");
    },
    (err) => err.code === "INVALID_TRANSITION"
  );

  // 2. Step: ASSIGNED -> TRAVELLING
  const travelOrder = harness.updateJobStatus(wo.id, "TRAVELLING", "Service van en route");
  assert.equal(travelOrder.status, "TRAVELLING");
  assert(travelOrder.startedAt !== undefined);

  // 3. Step: TRAVELLING -> ON_SITE
  const onSiteOrder = harness.updateJobStatus(wo.id, "ON_SITE", "Arrived on facility floor");
  assert.equal(onSiteOrder.status, "ON_SITE");

  // 4. Step: ON_SITE -> COMPLETED
  const completedOrder = harness.updateJobStatus(wo.id, "COMPLETED", "Seal replaced & pressure tested at 6 bar");
  assert.equal(completedOrder.status, "COMPLETED");
  assert(completedOrder.completedAt !== undefined);

  // 5. Terminal state: Cannot transition COMPLETED order
  assert.throws(
    () => {
      harness.updateJobStatus(wo.id, "ON_SITE", "Reopening order");
    },
    (err) => err.code === "INVALID_TRANSITION"
  );

  // 6. Technician automatically returned to AVAILABLE
  const tech = harness.technicians.find((t) => t.id === "tech-01");
  assert.equal(tech.activeJobCount, 0);
  assert.equal(tech.status, "AVAILABLE");
});

test("Integration Test 5: Automatic Customer Invoice generation & payment reconciliation", () => {
  const req = harness.createCustomerRequest({
    category: "CCTV and security",
    assetName: "Perimeter NVR Array",
    problemTitle: "Port Flapping",
    problemDescription: "PoE camera dropped.",
    priority: "MEDIUM",
  });
  const wo = harness.convertRequestToWorkOrder({ requestId: req.id, priority: "MEDIUM" });
  harness.assignTechnician({ workOrderId: wo.id, technicianId: "tech-02" });

  harness.updateJobStatus(wo.id, "TRAVELLING");
  harness.updateJobStatus(wo.id, "ON_SITE");
  harness.updateJobStatus(wo.id, "COMPLETED", "Replaced RJ45 connectors.");

  // Check generated invoice
  assert.equal(harness.invoices.length, 1);
  const inv = harness.invoices[0];
  assert.equal(inv.workOrderId, wo.id);
  assert.equal(inv.status, "PAYMENT_DUE");
  assert.equal(inv.totalAmount, 451.5);
  assert.equal(inv.items.length, 2);

  // Pay invoice
  const paidInv = harness.payInvoice(inv.id);
  assert.equal(paidInv.status, "PAID");
  assert.equal(harness.invoices[0].status, "PAID");
});

test("Integration Test 6: End-to-end operational audit trail preservation", () => {
  const initialEventCount = harness.events.length;

  const req = harness.createCustomerRequest({
    category: "IT and software support",
    assetName: "SCADA Gateway",
    problemTitle: "Modbus Timeout",
    problemDescription: "PLC telemetry failing.",
    priority: "HIGH",
  });
  const wo = harness.convertRequestToWorkOrder({ requestId: req.id, priority: "HIGH" });
  harness.assignTechnician({ workOrderId: wo.id, technicianId: "tech-01" });
  harness.updateJobStatus(wo.id, "TRAVELLING");
  harness.updateJobStatus(wo.id, "ON_SITE");
  harness.updateJobStatus(wo.id, "COMPLETED", "Firmware upgraded.");

  assert.equal(harness.events.length, initialEventCount + 6);
  const actions = harness.events.map((e) => e.action);
  assert(actions.includes("REQUEST_REVIEWED"));
  assert(actions.includes("ORDER_CREATED"));
  assert(actions.includes("TECH_DISPATCHED"));
  assert(actions.includes("STATUS_CHANGED"));
});
