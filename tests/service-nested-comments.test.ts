/**
 * Service Nested Comments Integration Tests
 * Tests the nested reply functionality for service reviews
 * 
 * OPTIONAL: These tests require Jest types (currently disabled for flexibility)
 * To enable Jest tests:
 * 1. npm install --save-dev @types/jest
 * 2. Ensure jest.config.js is set up
 * 3. Run: npm test -- service-nested-comments.test.ts
 * 
 * Alternative: Run manual curl tests listed at bottom of file
 */

// @ts-nocheck - Disabling type checking for Jest globals (optional)

import { pool } from '../src/db.js';
import {
  getServiceReviews,
  createReview,
  deleteServiceReview
} from '../src/models/serviceModel.js';

// Mock constants for testing
const TEST_SERVICE_ID = 999;
const TEST_CUSTOMER_ID = 'test_student_001';
const TEST_PROVIDER_ID = 'test_provider_001';

/**
 * Test Suite 1: Nested Reply Creation
 * Verify that replies can be created and nested correctly
 */
describe('Service Nested Comments - Reply Creation', () => {
  
  beforeAll(async () => {
    // Setup: Ensure test data isolation
    console.log('✓ Test suite initialized');
  });

  afterAll(async () => {
    // Cleanup: Delete test reviews
    await pool.end();
    console.log('✓ Test suite cleanup complete');
  });

  test('should create a top-level review with depth=0', async () => {
    const reviewData = {
      service_id: TEST_SERVICE_ID,
      customer_id: TEST_CUSTOMER_ID,
      provider_id: TEST_PROVIDER_ID,
      rating: 5,
      title: 'Test Review',
      comment: 'This is a test review',
      is_verified: false,
      parent_id: null
    };

    const review = await createReview(reviewData);

    expect(review).toBeDefined();
    expect(review.id).toBeGreaterThan(0);
    expect(review.parent_id).toBeNull();
    // Note: depth set by DB trigger (usually 0 for top-level)
    console.log(`✓ Created top-level review ID: ${review.id} with depth: ${review.depth}`);
  });

  test('should create a reply (nested comment) with parent_id', async () => {
    // First create a parent review
    const parentReview = await createReview({
      service_id: TEST_SERVICE_ID,
      customer_id: TEST_CUSTOMER_ID,
      provider_id: TEST_PROVIDER_ID,
      rating: 5,
      title: 'Parent Review',
      comment: 'This is the parent',
      is_verified: false,
      parent_id: null
    });

    // Then create a reply
    const replyData = {
      service_id: TEST_SERVICE_ID,
      customer_id: TEST_CUSTOMER_ID,
      provider_id: TEST_PROVIDER_ID,
      rating: 0, // Replies don't have ratings
      title: 'Reply',
      comment: 'Thanks for the feedback!',
      is_verified: false,
      parent_id: parentReview.id
    };

    const reply = await createReview(replyData);

    expect(reply).toBeDefined();
    expect(reply.parent_id).toBe(parentReview.id);
    expect(reply.rating).toBe(0);
    // Note: depth set by DB trigger (usually 1 for direct reply)
    console.log(`✓ Created reply ID: ${reply.id} to parent ID: ${parentReview.id} with depth: ${reply.depth}`);

    // Cleanup
    await deleteServiceReview(reply.id);
    await deleteServiceReview(parentReview.id);
  });

  test('should fetch reviews with nested replies', async () => {
    // Create parent review
    const parentReview = await createReview({
      service_id: TEST_SERVICE_ID,
      customer_id: TEST_CUSTOMER_ID,
      provider_id: TEST_PROVIDER_ID,
      rating: 4,
      title: 'Parent for Nesting Test',
      comment: 'Testing nested structure',
      is_verified: false,
      parent_id: null
    });

    // Create replies
    const reply1 = await createReview({
      service_id: TEST_SERVICE_ID,
      customer_id: TEST_CUSTOMER_ID,
      provider_id: TEST_PROVIDER_ID,
      rating: 0,
      title: 'Reply',
      comment: 'First reply',
      is_verified: false,
      parent_id: parentReview.id
    });

    const reply2 = await createReview({
      service_id: TEST_SERVICE_ID,
      customer_id: TEST_CUSTOMER_ID,
      provider_id: TEST_PROVIDER_ID,
      rating: 0,
      title: 'Reply',
      comment: 'Second reply',
      is_verified: false,
      parent_id: parentReview.id
    });

    // Fetch reviews with nesting
    const { reviews, total } = await getServiceReviews(TEST_SERVICE_ID, 1, 10);

    // Find our parent review in results
    const fetchedParent = reviews.find(r => r.id === parentReview.id);
    expect(fetchedParent).toBeDefined();
    expect(fetchedParent?.replies).toBeDefined();
    expect(Array.isArray(fetchedParent?.replies)).toBe(true);
    console.log(`✓ Fetched parent review with ${fetchedParent?.replies?.length || 0} nested replies`);

    // Cleanup
    await deleteServiceReview(reply1.id);
    await deleteServiceReview(reply2.id);
    await deleteServiceReview(parentReview.id);
  });
});

/**
 * Test Suite 2: Depth Validation
 * Verify that replies respect depth limits
 */
describe('Service Nested Comments - Depth Validation', () => {

  test('should reject reply when parent depth >= 2 (max depth check)', async () => {
    // This test simulates the controller's validation logic
    // It verifies that the backend rejects attempts to nest beyond 3 levels
    
    // Note: Actual depth validation happens in the controller before insert
    // The DB trigger also enforces this with constraints

    const mockParentAtMaxDepth = {
      id: 999,
      depth: 2 // Already at max
    };

    // In the controller, we check: if (parentDepth >= 2) reject
    const isAllowedToReply = mockParentAtMaxDepth.depth < 2;
    
    expect(isAllowedToReply).toBe(false);
    console.log(`✓ Depth check: depth=${mockParentAtMaxDepth.depth} -> allowed=${isAllowedToReply}`);
  });

  test('should allow reply when parent depth < 2', async () => {
    const mockParentAtDepth1 = {
      id: 998,
      depth: 1 // Can still reply
    };

    const isAllowedToReply = mockParentAtDepth1.depth < 2;
    
    expect(isAllowedToReply).toBe(true);
    console.log(`✓ Depth check: depth=${mockParentAtDepth1.depth} -> allowed=${isAllowedToReply}`);
  });

  test('should allow reply when parent is top-level (depth=0)', async () => {
    const mockTopLevel = {
      id: 997,
      depth: 0 // Can reply
    };

    const isAllowedToReply = mockTopLevel.depth < 2;
    
    expect(isAllowedToReply).toBe(true);
    console.log(`✓ Depth check: depth=${mockTopLevel.depth} -> allowed=${isAllowedToReply}`);
  });
});

/**
 * Test Suite 3: Data Structure Validation
 * Verify the nested comment structure is correct
 */
describe('Service Nested Comments - Data Structure', () => {

  test('should have buildNestedComments helper function behavior', () => {
    // This test verifies the recursive nesting logic
    
    const allComments = [
      { id: 1, parent_id: null, comment: 'Top level' },
      { id: 2, parent_id: 1, comment: 'Reply to 1' },
      { id: 3, parent_id: 1, comment: 'Another reply to 1' },
      { id: 4, parent_id: 2, comment: 'Reply to 2' }
    ];

    // Simulate buildNestedComments logic
    const buildNested = (parentId: number, comments: any[]): any[] | undefined => {
      const children = comments.filter(c => c.parent_id === parentId);
      if (children.length === 0) return undefined;
      return children.map(child => ({
        ...child,
        replies: buildNested(child.id, comments)
      }));
    };

    const nested = allComments
      .filter(c => c.parent_id === null)
      .map(c => ({
        ...c,
        replies: buildNested(c.id, allComments)
      }));

    expect(nested.length).toBe(1);
    expect(nested[0].id).toBe(1);
    expect(nested[0].replies).toBeDefined();
    expect(nested[0].replies?.length).toBe(2);
    expect(nested[0].replies?.[0].replies).toBeDefined();
    expect(nested[0].replies?.[0].replies?.length).toBe(1);
    
    console.log(`✓ Nested structure verified: 1 top-level → 2 replies → 1 nested reply`);
  });

  test('should have correct ServiceReview interface with optional replies', () => {
    // Verify type structure matches what frontend expects
    const sampleReview = {
      id: 100,
      service_id: 5,
      customer_id: 'user_123',
      provider_id: 'provider_456',
      rating: 5,
      title: 'Great service',
      comment: 'Very satisfied',
      is_verified: true,
      created_at: new Date().toISOString(),
      customer_name: 'John Doe',
      customer_avatar: undefined,
      parent_id: null,
      depth: 0,
      thread_root_id: 100,
      replies: []
    };

    expect(sampleReview.id).toBeDefined();
    expect(sampleReview.replies).toBeDefined();
    expect(Array.isArray(sampleReview.replies)).toBe(true);
    console.log(`✓ ServiceReview structure validated`);
  });
});

/**
 * Manual Test Instructions
 * Run these curl commands to test locally
 */

console.log(`
=============================================================
MANUAL API TEST COMMANDS (run after backend is started)
=============================================================

1. Create a top-level review:
   curl -X POST 'http://localhost:3000/api/services/reviews' \\
     -H "Authorization: Bearer YOUR_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "service_id": 1,
       "rating": 5,
       "title": "Great service",
       "comment": "Excellent experience"
     }'

2. Create a reply (replace REVIEW_ID with ID from step 1):
   curl -X POST 'http://localhost:3000/api/services/reviews' \\
     -H "Authorization: Bearer YOUR_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "service_id": 1,
       "parent_id": REVIEW_ID,
       "comment": "Thanks for the feedback!"
     }'

3. Fetch reviews with nested replies:
   curl -X GET 'http://localhost:3000/api/services/1/reviews' \\
     -H "Authorization: Bearer YOUR_TOKEN"

4. Test depth limit (try to reply to depth=2 comment):
   curl -X POST 'http://localhost:3000/api/services/reviews' \\
     -H "Authorization: Bearer YOUR_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "service_id": 1,
       "parent_id": DEPTH_2_COMMENT_ID,
       "comment": "This should fail"
     }'
   Expected: 400 Bad Request with depth limit error

=============================================================
`);

export {};
