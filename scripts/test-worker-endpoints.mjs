/**
 * Verification test for Cloudflare Worker backend API endpoints
 */
import worker from '../src/worker.ts';

const mockEnv = {
  JWT_SECRET: "test-secret",
  ENVIRONMENT: "test"
};

const mockCtx = {
  waitUntil: () => {},
  passThroughOnException: () => {}
};

async function testEndpoint(method, path, body = null, headers = {}) {
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }

  const req = new Request(`https://fmoh-inventory.test/api${path}`, init);
  const res = await worker.fetch(req, mockEnv, mockCtx);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}

async function run() {
  console.log("Starting backend route verification...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // 1. Health check
  const health = await testEndpoint("GET", "/health");
  assert(health.status === 200 && health.json?.status === "ok", "GET /api/health");

  // 2. Master Data (Aggregate)
  const masterData = await testEndpoint("GET", "/master-data");
  assert(
    masterData.status === 200 &&
    Array.isArray(masterData.json?.categories) &&
    Array.isArray(masterData.json?.departments) &&
    Array.isArray(masterData.json?.unitsOfMeasure) &&
    Array.isArray(masterData.json?.fundingSources) &&
    Array.isArray(masterData.json?.stores) &&
    Array.isArray(masterData.json?.storageLocations) &&
    Array.isArray(masterData.json?.suppliers) &&
    Array.isArray(masterData.json?.disposalReasons),
    "GET /api/master-data"
  );

  // 3. Admin Master-Data endpoints
  const models = [
    "unitOfMeasure",
    "category",
    "fundingSource",
    "storeLocation",
    "department",
    "supplierDonor",
    "disposalReason"
  ];

  for (const model of models) {
    // GET /api/admin/master-data/:model
    const listRes = await testEndpoint("GET", `/admin/master-data/${model}`);
    assert(
      listRes.status === 200 && Array.isArray(listRes.json) && listRes.json.length > 0,
      `GET /api/admin/master-data/${model} returns 200 and array`,
      `Status: ${listRes.status}, Body: ${listRes.text}`
    );

    // POST /api/admin/master-data/:model
    const createRes = await testEndpoint("POST", `/admin/master-data/${model}`, {
      name: `Test ${model} 1`,
      description: "Test description",
      code: "TEST",
      symbol: "tst"
    });
    assert(
      createRes.status === 201 && createRes.json?.name === `Test ${model} 1`,
      `POST /api/admin/master-data/${model} returns 201`,
      `Status: ${createRes.status}, Body: ${createRes.text}`
    );

    const createdId = createRes.json?.id;

    // PATCH /api/admin/master-data/:model/:id
    const updateRes = await testEndpoint("PATCH", `/admin/master-data/${model}/${createdId}`, {
      active: false
    });
    assert(
      updateRes.status === 200 && updateRes.json?.active === 0,
      `PATCH /api/admin/master-data/${model}/${createdId} returns 200`,
      `Status: ${updateRes.status}`
    );

    // DELETE /api/admin/master-data/:model
    const deleteRes = await testEndpoint("DELETE", `/admin/master-data/${model}`, {
      ids: [createdId]
    });
    assert(
      deleteRes.status === 200 && deleteRes.json?.deletedCount === 1,
      `DELETE /api/admin/master-data/${model} returns 200 with deletedCount: 1`,
      `Status: ${deleteRes.status}, Body: ${deleteRes.text}`
    );
  }

  // 4. Admin Users
  const usersList = await testEndpoint("GET", "/admin/users");
  assert(usersList.status === 200 && Array.isArray(usersList.json), "GET /api/admin/users");

  const userActive = await testEndpoint("PATCH", "/admin/users/usr-admin/active", { active: true });
  assert(userActive.status === 200 && userActive.json?.id === "usr-admin", "PATCH /api/admin/users/:id/active");

  // 5. Items
  const itemsList = await testEndpoint("GET", "/items");
  assert(itemsList.status === 200 && Array.isArray(itemsList.json?.items), "GET /api/items");

  const itemDetail = await testEndpoint("GET", "/items/item-amox");
  assert(itemDetail.status === 200 && itemDetail.json?.id === "item-amox", "GET /api/items/:id");

  // 6. Reports
  const reportJson = await testEndpoint("GET", "/reports/valuation");
  assert(reportJson.status === 200 && Array.isArray(reportJson.json), "GET /api/reports/valuation (JSON array)");

  const reportXlsx = await testEndpoint("GET", "/reports/valuation.xlsx");
  assert(reportXlsx.status === 200, "GET /api/reports/valuation.xlsx (XLSX/CSV stream)");

  // 7. Queues
  const appQueue = await testEndpoint("GET", "/approver/queue");
  assert(appQueue.status === 200 && Array.isArray(appQueue.json?.pendingIssues), "GET /api/approver/queue");

  const inspQueue = await testEndpoint("GET", "/inspector/queue");
  assert(inspQueue.status === 200 && Array.isArray(inspQueue.json?.pendingGrns), "GET /api/inspector/queue");

  // 8. Storage Locations
  const storageLocs = await testEndpoint("GET", "/storage-locations");
  assert(storageLocs.status === 200 && Array.isArray(storageLocs.json), "GET /api/storage-locations");

  // 9. Stock Batches & Balances
  const batches = await testEndpoint("GET", "/stock-batches");
  assert(batches.status === 200 && Array.isArray(batches.json), "GET /api/stock-batches");

  const balances = await testEndpoint("GET", "/location-balances");
  assert(balances.status === 200 && Array.isArray(balances.json), "GET /api/location-balances");

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
