/**
 * School Domains Configuration - Test Suite
 *
 * Tests for the multi-campus school domain mapping functionality
 * This validates the school-to-email-domain mapping and utility functions
 *
 * Usage:
 * - Run individual tests: testSchoolDomainsMapping(), testGetSchoolFromEmail(), etc.
 * - Run all tests: runCompleteSchoolDomainsTests()
 *
 * @jest-environment node (if using Jest)
 */

// Import the functions to test
import {
  SCHOOL_DOMAINS,
  getSchoolFromEmail,
  isValidSchoolEmail,
  getSupportedDomains,
  getSupportedSchools,
  getDomainFromSchool
} from '../src/config/schoolDomains.js';

// ===== TEST FUNCTIONS =====

/**
 * Test 1: SCHOOL_DOMAINS mapping contains all expected schools
 */
export function testSchoolDomainsMapping() {
  console.log('\n=== Test 1: SCHOOL_DOMAINS Mapping ===');

  const expectedMappings = {
    "st.ug.edu.gh": "University of Ghana",
    "knust.edu.gh": "KNUST",
    "upsamail.edu.gh": "UPSA",
    "ucc.edu.gh": "University of Cape Coast",
    "gimpa.edu.gh": "GIMPA",
    "atu.edu.gh": "Accra Technical University",
    "ashesi.edu.gh": "Ashesi University"
  };

  let passed = 0;
  let failed = 0;

  for (const [domain, expectedSchool] of Object.entries(expectedMappings)) {
    const actualSchool = SCHOOL_DOMAINS[domain];
    if (actualSchool === expectedSchool) {
      console.log(`✅ ${domain} → ${actualSchool}`);
      passed++;
    } else {
      console.log(`❌ ${domain} → Expected: ${expectedSchool}, Got: ${actualSchool}`);
      failed++;
    }
  }

  // Check total count
  const totalDomains = Object.keys(SCHOOL_DOMAINS).length;
  if (totalDomains === 19) {
    console.log(`✅ Total domains: ${totalDomains} (expected 19)`);
    passed++;
  } else {
    console.log(`❌ Total domains: ${totalDomains} (expected 19)`);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test 2: getSchoolFromEmail function
 */
export function testGetSchoolFromEmail() {
  console.log('\n=== Test 2: getSchoolFromEmail Function ===');

  const testCases = [
    // Valid emails
    { email: 'student@st.ug.edu.gh', expected: 'University of Ghana' },
    { email: 'user@knust.edu.gh', expected: 'KNUST' },
    { email: 'test@upsamail.edu.gh', expected: 'UPSA' },
    { email: 'student@ucc.edu.gh', expected: 'University of Cape Coast' },
    { email: 'user@gimpa.edu.gh', expected: 'GIMPA' },
    { email: 'student@ashesi.edu.gh', expected: 'Ashesi University' },

    // Invalid emails
    { email: 'student@gmail.com', expected: null },
    { email: 'user@yahoo.com', expected: null },
    { email: '', expected: null },
    { email: 'invalid', expected: null },
    { email: '@domain.com', expected: null },
    { email: 'user@', expected: null },
  ];

  let passed = 0;
  let failed = 0;

  for (const { email, expected } of testCases) {
    const result = getSchoolFromEmail(email);
    if (result === expected) {
      console.log(`✅ "${email}" → ${result}`);
      passed++;
    } else {
      console.log(`❌ "${email}" → Expected: ${expected}, Got: ${result}`);
      failed++;
    }
  }

  // Test case insensitivity
  const caseInsensitiveResult = getSchoolFromEmail('student@ST.UG.EDU.GH');
  if (caseInsensitiveResult === 'University of Ghana') {
    console.log(`✅ Case insensitive: "student@ST.UG.EDU.GH" → ${caseInsensitiveResult}`);
    passed++;
  } else {
    console.log(`❌ Case insensitive failed: Expected "University of Ghana", Got: ${caseInsensitiveResult}`);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test 3: isValidSchoolEmail function
 */
export function testIsValidSchoolEmail() {
  console.log('\n=== Test 3: isValidSchoolEmail Function ===');

  const testCases = [
    { email: 'student@st.ug.edu.gh', expected: true },
    { email: 'user@knust.edu.gh', expected: true },
    { email: 'test@upsamail.edu.gh', expected: true },
    { email: 'student@gmail.com', expected: false },
    { email: 'user@yahoo.com', expected: false },
    { email: '', expected: false },
  ];

  let passed = 0;
  let failed = 0;

  for (const { email, expected } of testCases) {
    const result = isValidSchoolEmail(email);
    if (result === expected) {
      console.log(`✅ "${email}" → ${result}`);
      passed++;
    } else {
      console.log(`❌ "${email}" → Expected: ${expected}, Got: ${result}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test 4: getSupportedDomains function
 */
export function testGetSupportedDomains() {
  console.log('\n=== Test 4: getSupportedDomains Function ===');

  const domains = getSupportedDomains();

  if (Array.isArray(domains)) {
    console.log(`✅ Returns array: ${domains.length} domains`);
  } else {
    console.log(`❌ Expected array, got: ${typeof domains}`);
    return false;
  }

  if (domains.length === 19) {
    console.log(`✅ Correct count: ${domains.length}`);
  } else {
    console.log(`❌ Wrong count: ${domains.length} (expected 19)`);
    return false;
  }

  const expectedDomains = ['st.ug.edu.gh', 'knust.edu.gh', 'upsamail.edu.gh'];
  for (const domain of expectedDomains) {
    if (domains.includes(domain)) {
      console.log(`✅ Contains: ${domain}`);
    } else {
      console.log(`❌ Missing: ${domain}`);
      return false;
    }
  }

  return true;
}

/**
 * Test 5: getSupportedSchools function
 */
export function testGetSupportedSchools() {
  console.log('\n=== Test 5: getSupportedSchools Function ===');

  const schools = getSupportedSchools();

  if (Array.isArray(schools)) {
    console.log(`✅ Returns array: ${schools.length} schools`);
  } else {
    console.log(`❌ Expected array, got: ${typeof schools}`);
    return false;
  }

  if (schools.length === 19) {
    console.log(`✅ Correct count: ${schools.length}`);
  } else {
    console.log(`❌ Wrong count: ${schools.length} (expected 19)`);
    return false;
  }

  const expectedSchools = ['University of Ghana', 'KNUST', 'UPSA'];
  for (const school of expectedSchools) {
    if (schools.includes(school)) {
      console.log(`✅ Contains: ${school}`);
    } else {
      console.log(`❌ Missing: ${school}`);
      return false;
    }
  }

  return true;
}

/**
 * Test 6: getDomainFromSchool function
 */
export function testGetDomainFromSchool() {
  console.log('\n=== Test 6: getDomainFromSchool Function ===');

  const testCases = [
    { school: 'University of Ghana', expected: 'st.ug.edu.gh' },
    { school: 'KNUST', expected: 'knust.edu.gh' },
    { school: 'UPSA', expected: 'upsamail.edu.gh' },
    { school: 'Unknown University', expected: null },
    { school: '', expected: null },
  ];

  let passed = 0;
  let failed = 0;

  for (const { school, expected } of testCases) {
    const result = getDomainFromSchool(school);
    if (result === expected) {
      console.log(`✅ "${school}" → ${result}`);
      passed++;
    } else {
      console.log(`❌ "${school}" → Expected: ${expected}, Got: ${result}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test 7: Integration test - round trip validation
 */
export function testRoundTripValidation() {
  console.log('\n=== Test 7: Round Trip Validation ===');

  const testEmails = [
    'student@st.ug.edu.gh',
    'user@knust.edu.gh',
    'test@upsamail.edu.gh',
    'student@ucc.edu.gh',
    'user@gimpa.edu.gh',
    'student@ashesi.edu.gh'
  ];

  let passed = 0;
  let failed = 0;

  for (const email of testEmails) {
    // Extract school from email
    const school = getSchoolFromEmail(email);
    if (!school) {
      console.log(`❌ Failed to extract school from: ${email}`);
      failed++;
      continue;
    }

    // Get domain back from school
    const domain = getDomainFromSchool(school);
    if (!domain) {
      console.log(`❌ Failed to get domain from school: ${school}`);
      failed++;
      continue;
    }

    // Verify email ends with the domain
    if (email.endsWith(`@${domain}`)) {
      console.log(`✅ Round trip: ${email} ↔ ${school} ↔ ${domain}`);
      passed++;
    } else {
      console.log(`❌ Round trip failed: ${email} → ${school} → ${domain}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Complete test suite
 */
export async function runCompleteSchoolDomainsTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  School Domains Configuration - Test Suite║');
  console.log('╚════════════════════════════════════════════╝');

  const tests = [
    { name: 'SCHOOL_DOMAINS Mapping', func: testSchoolDomainsMapping },
    { name: 'getSchoolFromEmail', func: testGetSchoolFromEmail },
    { name: 'isValidSchoolEmail', func: testIsValidSchoolEmail },
    { name: 'getSupportedDomains', func: testGetSupportedDomains },
    { name: 'getSupportedSchools', func: testGetSupportedSchools },
    { name: 'getDomainFromSchool', func: testGetDomainFromSchool },
    { name: 'Round Trip Validation', func: testRoundTripValidation },
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const test of tests) {
    console.log(`\n🔍 Running: ${test.name}`);
    try {
      const result = test.func();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        totalPassed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        totalFailed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error}`);
      totalFailed++;
    }
  }

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║                FINAL RESULTS               ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed! School domains configuration is working correctly.');
  } else {
    console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review the configuration.`);
  }

  return totalFailed === 0;
}

// ===== USAGE EXAMPLES =====

/**
 * Example usage of the school domains functions
 */
export function demonstrateUsage() {
  console.log('\n=== Usage Examples ===');

  // Example 1: Validate email during registration
  const email = 'student@st.ug.edu.gh';
  if (isValidSchoolEmail(email)) {
    const school = getSchoolFromEmail(email);
    console.log(`✅ Valid email: ${email} → ${school}`);
  } else {
    console.log(`❌ Invalid email: ${email}`);
  }

  // Example 2: Get all supported schools
  const schools = getSupportedSchools();
  console.log(`\nSupported schools (${schools.length}):`);
  schools.forEach((school, index) => {
    console.log(`  ${index + 1}. ${school}`);
  });

  // Example 3: Get domain for a school
  const domain = getDomainFromSchool('KNUST');
  console.log(`\nDomain for KNUST: ${domain}`);
}

// Export individual test functions for manual testing
export default {
  runCompleteSchoolDomainsTests,
  testSchoolDomainsMapping,
  testGetSchoolFromEmail,
  testIsValidSchoolEmail,
  testGetSupportedDomains,
  testGetSupportedSchools,
  testGetDomainFromSchool,
  testRoundTripValidation,
  demonstrateUsage,
};
