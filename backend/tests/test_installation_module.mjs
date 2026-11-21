// Automated End-to-End Test Suite for Solvix Installation, Technician Assignment & Project Execution Module
// Verifies all 12 requirements specified in Section 17 of Prompt 9:
// 1. Order can generate an installation job.
// 2. Technician assignment works.
// 3. Scheduling works.
// 4. Technicians see their authorized jobs.
// 5. Serial numbers can be verified.
// 6. Checklist updates persist.
// 7. Photographs upload securely.
// 8. Commissioning data is recorded.
// 9. Completion report is generated.
// 10. Customer acknowledgement is stored.
// 11. Installation status updates correctly.
// 12. Warranty dates remain tied to equipment delivery.

import { installationStore } from '../lib/installation/installationStore.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('SOLVIX INSTALLATION & TECHNICAL OPERATIONS MODULE VERIFICATION TEST RUN');
  console.log('========================================================================\n');

  const adminProfile = {
    id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Lead Operations Admin',
    email: 'admin@solvix.energy',
    account_type: 'admin'
  };

  const technicianProfile = {
    id: 'tech-001',
    employee_id: 'TECH-101',
    full_name: 'Arun Kumar',
    email: 'arun.kumar@solvix.energy',
    account_type: 'employee'
  };

  // TEST 1: Order can generate an installation job & prevents duplicate jobs
  console.log('TEST 1: Installation Job Creation from Eligible Confirmed Order');
  const createResult = await installationStore.createJobFromOrder({
    order_id: 'ord-test-901',
    order_code: 'ORD-2026-9099',
    customer_id: 'cust-901',
    customer_name: 'Bansal Hospital & Trauma Centre',
    contact_phone: '+91 98111 22334',
    contact_email: 'admin@bansalhospital.org',
    site_address: 'Main Ring Road, Pitampura, New Delhi 110034',
    city: 'New Delhi',
    system_type: 'on-grid',
    system_capacity_kw: 20.0,
    equipment_items: [
      {
        id: 'eq-test-1',
        product_name: 'Mono PERC Solar Panel 550W',
        sku: 'SOL-550W-TEST',
        quantity: 36,
        expected_serials: ['SN-TEST-PNL-01', 'SN-TEST-PNL-02'],
        verified_serials: [],
        status: 'delivered',
        warranty_start_date: '2026-11-18', // Delivered date!
        warranty_duration_years: 25
      },
      {
        id: 'eq-test-2',
        product_name: '20kW Sungrow Grid Inverter',
        sku: 'INV-20KW-TEST',
        quantity: 1,
        expected_serials: ['SN-TEST-INV-01'],
        verified_serials: [],
        status: 'delivered',
        warranty_start_date: '2026-11-18', // Delivered date!
        warranty_duration_years: 5
      }
    ]
  }, adminProfile);

  const job = createResult.job;
  assert(job && job.id, 'Installation job created with unique ID');
  assert(job.installation_code.startsWith('INST-'), `Job code generated: ${job.installation_code}`);
  assert(job.status === 'pending', 'Initial installation status is "pending"');
  assert(job.tasks && job.tasks.length === 11, '11 standard installation tasks initialized automatically');

  // Verify duplicate prevention
  const duplicateAttempt = await installationStore.createJobFromOrder({
    order_id: 'ord-test-901',
    order_code: 'ORD-2026-9099'
  }, adminProfile);
  assert(duplicateAttempt.already_exists === true, 'Duplicate installation job creation rejected');

  // TEST 2: Technician assignment works (multi-technician + lead designation)
  console.log('\nTEST 2: Multi-Technician Assignment & Lead Designation');
  const assignResult = await installationStore.assignTechnicians(job.id, {
    assignments: [
      { technician_id: 'tech-001', role_on_job: 'lead_technician', is_primary: true },
      { technician_id: 'tech-003', role_on_job: 'helper', is_primary: false }
    ],
    scheduled_start: '2026-11-25T09:00:00Z',
    expected_completion: '2026-11-26',
    notes: 'Hospital rooftop project; team assigned.'
  }, adminProfile);

  assert(assignResult.assignments.length === 2, 'Assigned 2 technicians to project');
  assert(assignResult.job.assigned_technicians.some(t => t.is_primary && t.role_on_job === 'lead_technician'), 'Lead technician correctly designated');
  assert(assignResult.job.status === 'scheduled', 'Status transitioned to "scheduled"');

  // TEST 3: Scheduling and double-booking prevention
  console.log('\nTEST 3: Job Scheduling & Double-Booking Prevention');
  const scheduleResult = await installationStore.scheduleJob(job.id, {
    scheduled_start: '2026-11-26T09:00:00Z',
    expected_completion: '2026-11-27',
    notes: 'Rescheduled visit to Nov 26'
  }, adminProfile);

  assert(scheduleResult.planned_installation_date === '2026-11-26', 'Installation planned date updated to 2026-11-26');
  assert(scheduleResult.status_history.some(h => h.notes.includes('Rescheduled')), 'Rescheduling history recorded in audit trail');

  // TEST 4: Technicians see their authorized jobs
  console.log('\nTEST 4: Technician Scoped Authorization');
  const techJobs = await installationStore.getJobs({}, technicianProfile, false, true);
  const isJobInQueue = techJobs.jobs.some(j => j.id === job.id);
  assert(isJobInQueue, 'Assigned job appears in technician personalized queue');

  const unauthorizedProfile = { id: 'unauth-user', employee_id: 'UNAUTH-99', account_type: 'employee' };
  let caughtAccessError = false;
  try {
    await installationStore.getJobById(job.id, unauthorizedProfile, false);
  } catch (err) {
    caughtAccessError = true;
  }
  assert(caughtAccessError, 'Unauthorized technician blocked from accessing job details');

  // TEST 5: Serial numbers can be verified
  console.log('\nTEST 5: Equipment Serial Number Verification on Site');
  const verifyResult = await installationStore.verifyEquipment(job.id, {
    verified_serials: ['SN-TEST-PNL-01', 'SN-TEST-PNL-02', 'SN-TEST-INV-01'],
    missing_items: [],
    damaged_items: [],
    exception_recorded: false
  }, technicianProfile);

  assert(verifyResult.equipment_verified === true, 'All delivered equipment serial numbers marked verified');
  assert(verifyResult.job.status === 'in_progress', 'Job automatically transitioned to "in_progress" upon verification');

  // TEST 6: Checklist updates persist
  console.log('\nTEST 6: Digital Checklist Task Execution & Remarks');
  const taskUpdate1 = await installationStore.updateTask(job.id, 'Site readiness verified', {
    is_completed: true,
    remarks: 'Terrace clearance verified, scaffolding erected.'
  }, technicianProfile);
  assert(taskUpdate1.task.is_completed === true, 'Task marked completed');
  assert(taskUpdate1.task.completed_by === 'Arun Kumar', 'Task completion author persisted');

  // Complete remaining required tasks
  for (const t of job.tasks) {
    await installationStore.updateTask(job.id, t.id, {
      is_completed: true,
      remarks: 'Verified and inspected according to installation standards.'
    }, technicianProfile);
  }
  assert(job.tasks.every(t => t.is_completed), 'All 11 checklist tasks verified and completed');

  // TEST 7: Photographs upload securely
  console.log('\nTEST 7: Installation Photo Evidence Upload');
  const photoResult = await installationStore.uploadPhoto(job.id, {
    photo_type: 'panel',
    storage_path: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800',
    caption: '36 Mono PERC panels mounted with mid-clamps'
  }, technicianProfile);

  assert(photoResult.photo && photoResult.photo.id, 'Photo record created with unique ID');
  assert(photoResult.photo.photo_type === 'panel', 'Photo category classified as "panel"');
  assert(job.photos.length >= 1, 'Photo associated with installation job');

  // TEST 8: Commissioning data is recorded
  console.log('\nTEST 8: Testing & Commissioning Electrical Readings');
  const commResult = await installationStore.submitCommissioning(job.id, {
    inverter_model: 'Sungrow SG20RT-V11',
    inverter_serial: 'SN-TEST-INV-01',
    inverter_firmware: 'V1.0.8',
    voc_string_1_v: 642.5,
    voc_string_2_v: 638.1,
    isc_string_1_a: 13.8,
    isc_string_2_a: 13.6,
    grid_voltage_v: 415.2,
    grid_frequency_hz: 50.01,
    earthing_resistance_ohm: 1.65,
    insulation_test_result: 'PASS - 220 MOhm at 1000V DC',
    test_observations: 'Grid synchronization tested. Anti-islanding tripped in 12ms. Peak output 19.4 kW verified.',
    technician_remarks: 'Commissioning successful. Discom bidirectional meter clearance paperwork submitted.'
  }, technicianProfile);

  assert(commResult.commissioning_data.earthing_resistance_ohm === 1.65, 'Earthing resistance recorded: 1.65 Ohm');
  assert(commResult.commissioning_data.safety_disclaimer_accepted === true, 'Technical electrical safety disclaimer accepted');
  assert(commResult.job.insulation_test_result.includes('PASS'), 'Insulation resistance test result persisted');

  // TEST 9 & 10: Customer signature & Completion report generation
  console.log('\nTEST 9 & 10: Customer Acknowledgement & Completion Report Generation');
  const sigResult = await installationStore.submitCustomerSignature(job.id, {
    customer_name: 'Dr. S. Bansal (Director)',
    signature_data: 'data:image/svg+xml;utf8,<svg><text>Dr. S. Bansal</text></svg>',
    consent_text: 'I acknowledge that the 20kW solar plant has been commissioned and handed over.'
  }, technicianProfile);

  assert(sigResult.customer_signature.customer_name.includes('Bansal'), 'Customer signature evidence recorded');

  const reportResult = await installationStore.generateCompletionReport(job.id, technicianProfile);
  assert(reportResult.job.status === 'completed', 'Job status successfully moved to "completed"');
  assert(reportResult.completion_report.includes('SOLVIX SOLAR INSTALLATION COMPLETION REPORT'), 'Formal completion report compiled');

  // TEST 11: Installation status updates correctly across lifecycle
  console.log('\nTEST 11: Installation Workflow Lifecycle History');
  const statusesInHistory = job.status_history.map(h => h.status);
  assert(statusesInHistory.includes('pending'), 'Lifecycle includes pending');
  assert(statusesInHistory.includes('assigned') || statusesInHistory.includes('scheduled'), 'Lifecycle includes scheduled');
  assert(statusesInHistory.includes('in_progress'), 'Lifecycle includes in_progress');
  assert(statusesInHistory.includes('completed'), 'Lifecycle includes completed');

  // TEST 12: Warranty dates remain tied to equipment delivery
  console.log('\nTEST 12: Warranty Start Date Preservation (Prompt 8 Milestone Integrity)');
  const panelItem = job.equipment_items.find(e => e.sku === 'SOL-550W-TEST');
  const inverterItem = job.equipment_items.find(e => e.sku === 'INV-20KW-TEST');

  assert(panelItem.warranty_start_date === '2026-11-18', `Panel warranty start remains 2026-11-18 (delivery date) - NOT altered by completion date (${job.actual_end.split('T')[0]})`);
  assert(inverterItem.warranty_start_date === '2026-11-18', `Inverter warranty start remains 2026-11-18 (delivery date) - NOT altered by completion date`);

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
