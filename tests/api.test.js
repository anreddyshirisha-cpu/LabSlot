// Comprehensive API Integration & Business Rule Verification Test Suite
const assert = require('assert');
const http = require('http');
const app = require('../server/app');
const db = require('../server/db/dbAdapter');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch (e) {
            json = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING LABORATORY SYSTEM VERIFICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      process.stdout.write(`• Testing: ${name}... `);
      await fn();
      console.log('PASSED [OK]');
      passed++;
    } catch (err) {
      console.log('FAILED [X]');
      console.error('  Error:', err.message);
      failed++;
    }
  };

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  try {
    let studentToken = null;
    let operatorToken = null;
    let adminToken = null;

    // 1. Health check
    await test('GET /api/health returns ONLINE', async () => {
      const res = await request('GET', '/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ONLINE');
    });

    // 2. Authentication: Student Login
    await test('POST /api/auth/login authenticates student', async () => {
      const res = await request('POST', '/api/auth/login', {
        email: 'student@labhub.edu',
        password: 'Password123!'
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.token);
      assert.strictEqual(res.body.user.role, 'student');
      studentToken = res.body.token;
    });

    // 3. Authentication: Operator & Admin Login
    await test('POST /api/auth/login authenticates operator and admin', async () => {
      const opRes = await request('POST', '/api/auth/login', {
        email: 'operator@labhub.edu',
        password: 'Password123!'
      });
      assert.strictEqual(opRes.status, 200);
      operatorToken = opRes.body.token;

      const admRes = await request('POST', '/api/auth/login', {
        email: 'admin@labhub.edu',
        password: 'Password123!'
      });
      assert.strictEqual(admRes.status, 200);
      adminToken = admRes.body.token;
    });

    // 4. Equipment Catalogue Listing & Filter
    let hplcId = null;
    let xrdId = null;
    await test('GET /api/equipment lists instruments and applies filters', async () => {
      const res = await request('GET', '/api/equipment');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length >= 6);

      const hplc = res.body.data.find((e) => e.code.includes('HPLC'));
      assert.ok(hplc);
      hplcId = hplc.id;

      const xrd = res.body.data.find((e) => e.code.includes('XRD'));
      assert.ok(xrd);
      xrdId = xrd.id;

      // Filter by category
      const catRes = await request('GET', '/api/equipment?category=Chromatography');
      assert.strictEqual(catRes.status, 200);
      assert.ok(catRes.body.data.every((e) => e.category === 'Chromatography'));
    });

    // 5. Booking Open Equipment (Agilent HPLC)
    let confirmedBookingId = null;
    const tomorrowStart = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrowStart.setHours(10, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 2 * 3600 * 1000); // 2 hours

    await test('POST /api/bookings creates confirmed booking for open equipment', async () => {
      const res = await request(
        'POST',
        '/api/bookings',
        {
          equipment_id: hplcId,
          title: 'Polypeptide Fractionation Run',
          research_purpose: 'Purifying synthetic antimicrobial peptides',
          start_time: tomorrowStart.toISOString(),
          end_time: tomorrowEnd.toISOString()
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.status, 'confirmed');
      confirmedBookingId = res.body.data.id;
    });

    // 6. Overlap Prevention: Attempt colliding slot
    await test('POST /api/bookings BLOCKS overlapping slot (Double-Booking Conflict)', async () => {
      // Overlap by 1 hour (11:00 to 13:00)
      const overlapStart = new Date(tomorrowStart.getTime() + 1 * 3600 * 1000);
      const overlapEnd = new Date(tomorrowStart.getTime() + 3 * 3600 * 1000);

      const res = await request(
        'POST',
        '/api/bookings',
        {
          equipment_id: hplcId,
          title: 'Colliding Chromatographic Run',
          research_purpose: 'Testing conflict detection',
          start_time: overlapStart.toISOString(),
          end_time: overlapEnd.toISOString()
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.strictEqual(res.status, 409); // Conflict HTTP 409
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.includes('Conflict Detected'));
    });

    // 7. Restricted Equipment Booking & Operator Approval Workflow
    let restrictedBookingId = null;
    let approvalId = null;
    const restrictedStart = new Date(Date.now() + 5 * 24 * 3600 * 1000);
    restrictedStart.setHours(14, 0, 0, 0);
    const restrictedEnd = new Date(restrictedStart.getTime() + 3 * 3600 * 1000);

    await test('POST /api/bookings puts restricted instrument into pending_approval', async () => {
      const res = await request(
        'POST',
        '/api/bookings',
        {
          equipment_id: xrdId,
          title: 'Superconductor Thin Film Phase Mapping',
          research_purpose: 'Goniometer high resolution scan',
          start_time: restrictedStart.toISOString(),
          end_time: restrictedEnd.toISOString()
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.status, 'pending_approval');
      assert.ok(res.body.approval);
      restrictedBookingId = res.body.data.id;
      approvalId = res.body.approval.id;
    });

    // 8. Operator Reviews & Approves Restricted Request
    await test('POST /api/approvals/:id/review approves booking into confirmed state', async () => {
      const res = await request(
        'POST',
        `/api/approvals/${approvalId}/review`,
        {
          decision: 'approved',
          notes: 'Laser safety credentials and radiation badge verified. Approved.'
        },
        { Authorization: `Bearer ${operatorToken}` }
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'approved');
      assert.strictEqual(res.body.bookingStatus, 'confirmed');

      // Check booking is now confirmed
      const bRes = await request('GET', `/api/bookings/${restrictedBookingId}`, null, {
        Authorization: `Bearer ${studentToken}`
      });
      assert.strictEqual(bRes.body.data.status, 'confirmed');
    });

    // 9. Handover Checklists (Issue & Return Flow)
    await test('Checklist Issue (Pre-run) transitions booking to checked_in', async () => {
      const res = await request(
        'POST',
        `/api/checklists/booking/${confirmedBookingId}`,
        {
          checklist_type: 'issue',
          cleanliness_ok: true,
          calibration_verified: true,
          consumables_replenished: true,
          safety_hazards_cleared: true,
          data_transferred: true,
          physical_condition_rating: 5,
          notes: 'All optical lines and pressure sensors verified prior to run.'
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.bookingStatus, 'checked_in');
      assert.strictEqual(res.body.equipmentStatus, 'in_use');
    });

    await test('Checklist Return (Post-run) transitions booking to completed and frees instrument', async () => {
      const res = await request(
        'POST',
        `/api/checklists/booking/${confirmedBookingId}`,
        {
          checklist_type: 'return',
          cleanliness_ok: true,
          calibration_verified: true,
          consumables_replenished: true,
          safety_hazards_cleared: true,
          data_transferred: true,
          physical_condition_rating: 5,
          notes: 'Samples removed, detector capped, mobile phase flushed.'
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.bookingStatus, 'completed');
      assert.strictEqual(res.body.equipmentStatus, 'available');
    });

    // 10. Maintenance Block Scheduling & Overlap Lockout
    const maintStart = new Date(Date.now() + 72 * 3600 * 1000);
    maintStart.setHours(9, 0, 0, 0);
    const maintEnd = new Date(maintStart.getTime() + 6 * 3600 * 1000);

    await test('POST /api/maintenance schedules maintenance block and prevents bookings', async () => {
      // 1. Operator schedules maintenance
      const maintRes = await request(
        'POST',
        '/api/maintenance',
        {
          equipment_id: hplcId,
          maintenance_type: 'routine',
          technician_name: 'Agilent Field Engineer',
          start_time: maintStart.toISOString(),
          end_time: maintEnd.toISOString(),
          notes: 'Annual piston seal replacement and pressure transducer calibration.'
        },
        { Authorization: `Bearer ${operatorToken}` }
      );

      assert.strictEqual(maintRes.status, 201);

      // 2. Student attempts booking inside the maintenance window
      const collidingBookingStart = new Date(maintStart.getTime() + 1 * 3600 * 1000);
      const collidingBookingEnd = new Date(maintStart.getTime() + 3 * 3600 * 1000);

      const bookRes = await request(
        'POST',
        '/api/bookings',
        {
          equipment_id: hplcId,
          title: 'Booking during maintenance',
          research_purpose: 'Should be rejected',
          start_time: collidingBookingStart.toISOString(),
          end_time: collidingBookingEnd.toISOString()
        },
        { Authorization: `Bearer ${studentToken}` }
      );

      assert.strictEqual(bookRes.status, 409);
      assert.strictEqual(bookRes.body.code, 'MAINTENANCE_LOCK');
    });

    // 11. Operational Metrics & Utilization Dashboard
    await test('GET /api/analytics/metrics computes utilization and conflict prevention stats', async () => {
      const res = await request('GET', '/api/analytics/metrics');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.summary);
      assert.ok(res.body.data.summary.conflicts_prevented >= 2);
      assert.ok(res.body.data.equipment_utilization.length >= 6);
    });

    // 12. Security Boundary: Student cannot schedule maintenance or review approvals
    await test('Security: Student is forbidden from operator endpoints (403 Forbidden)', async () => {
      const maintRes = await request(
        'POST',
        '/api/maintenance',
        {
          equipment_id: hplcId,
          maintenance_type: 'routine',
          technician_name: 'Unauthorized',
          start_time: maintStart.toISOString(),
          end_time: maintEnd.toISOString()
        },
        { Authorization: `Bearer ${studentToken}` }
      );
      assert.strictEqual(maintRes.status, 403);
    });

  } finally {
    server.close();
  }

  console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
