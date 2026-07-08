/**
 * Nested Comments System - API Test Suite
 * 
 * ⚠️ NOTE: This is a Node.js test file (not a browser file)
 * 
 * It requires:
 * - @types/node to be installed in backend package.json
 * - Process object from Node.js environment
 * 
 * This file is meant to be run with:
 * - npm test -- nested-comments.test.ts
 * - Or Node.js test runners (Jest, Mocha, etc.)
 * 
 * The "process" errors below are expected if viewing in IDE browser context.
 * They will resolve when running in Node.js environment.
 * 
 * Tests for the enhanced nested comments functionality
 * This demonstrates how to use the API with different nesting levels
 * 
 * Usage:
 * npm test -- nested-comments.test.ts
 * 
 * Or manually run test functions:
 * - testCreateReview()
 * - testReplyToReview()
 * - testMaxDepthValidation()
 * 
 * @jest-environment node
 */

// @ts-ignore - process is available in Node.js environment
const API_URL: string = process.env.API_URL || 'http://localhost:3000';
// @ts-ignore
const TOKEN: string = process.env.TEST_TOKEN || 'your-bearer-token-here';

// ===== HELPER FUNCTIONS =====

async function makeRequest(
  method: 'GET' | 'POST' | 'DELETE' | 'PUT',
  endpoint: string,
  data?: any,
  token?: string
): Promise<any> {
  const url: string = `${API_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(data && { body: JSON.stringify(data) }),
  };

  const response = await fetch(url, options);
  const result = await response.json();
  return { status: response.status, data: result };
}

// ===== TESTS =====

/**
 * Test 1: Create a top-level review
 */
export async function testCreateReview(productId: number, token: string) {
  console.log('\n=== Test 1: Create Top-Level Review ===');

  const reviewData = {
    product_id: productId,
    rating: 5,
    title: 'Excellent quality product!',
    comment: 'This product exceeded my expectations. Fast delivery and great packaging.',
  };

  try {
    const { status, data } = await makeRequest(
      'POST',
      '/api/reviews',
      reviewData,
      token
    );

    if (status === 201) {
      console.log('✅ Review created successfully');
      console.log('Review ID:', data.review.id);
      console.log('Depth:', data.review.depth);
      console.log('Parent ID:', data.review.parent_id);
      return data.review.id;
    } else {
      console.error('❌ Failed to create review:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

/**
 * Test 2: Reply to a review (Level 1 nesting)
 */
export async function testReplyToReview(
  productId: number,
  parentReviewId: number,
  token: string
) {
  console.log('\n=== Test 2: Reply to Review (Depth 1) ===');

  const replyData = {
    product_id: productId,
    comment: 'Thank you for your feedback! We appreciate your business.',
    parent_id: parentReviewId,
  };

  try {
    const { status, data } = await makeRequest(
      'POST',
      '/api/reviews',
      replyData,
      token
    );

    if (status === 201) {
      console.log('✅ Reply created successfully');
      console.log('Reply ID:', data.review.id);
      console.log('Depth:', data.review.depth);
      console.log('Parent ID:', data.review.parent_id);
      return data.review.id;
    } else {
      console.error('❌ Failed to create reply:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

/**
 * Test 3: Reply to a reply (Level 2 nesting)
 */
export async function testReplyToReply(
  productId: number,
  parentReplyId: number,
  token: string
) {
  console.log('\n=== Test 3: Reply to Reply (Depth 2) ===');

  const nestedReplyData = {
    product_id: productId,
    comment: 'Great response! We look forward to working with you again.',
    parent_id: parentReplyId,
  };

  try {
    const { status, data } = await makeRequest(
      'POST',
      '/api/reviews',
      nestedReplyData,
      token
    );

    if (status === 201) {
      console.log('✅ Nested reply created successfully');
      console.log('Nested Reply ID:', data.review.id);
      console.log('Depth:', data.review.depth);
      console.log('Parent ID:', data.review.parent_id);
      return data.review.id;
    } else {
      console.error('❌ Failed to create nested reply:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

/**
 * Test 4: Try to exceed max depth (should fail)
 */
export async function testExceedMaxDepth(
  productId: number,
  parentAtMaxDepthId: number,
  token: string
) {
  console.log('\n=== Test 4: Attempt to Exceed Max Depth (Should Fail) ===');

  const excessiveNestData = {
    product_id: productId,
    comment: 'This should fail because we exceed max nesting level',
    parent_id: parentAtMaxDepthId,
  };

  try {
    const { status, data } = await makeRequest(
      'POST',
      '/api/reviews',
      excessiveNestData,
      token
    );

    if (status >= 400) {
      console.log('✅ Correctly rejected excessive nesting');
      console.log('Error message:', data.error);
      return true;
    } else {
      console.error(
        '❌ ERROR: Should have rejected this request! Depth validation failed.',
        data
      );
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

/**
 * Test 5: Fetch all reviews with nested structure
 */
export async function testFetchReviewsWithNesting(productId: number, token?: string) {
  console.log('\n=== Test 5: Fetch Reviews with Nested Structure ===');

  try {
    const { status, data } = await makeRequest(
      'GET',
      `/api/reviews/${productId}`,
      undefined,
      token
    );

    if (status === 200) {
      console.log('✅ Reviews fetched successfully');
      console.log(`Total reviews: ${data.total}`);
      console.log(`Has more: ${data.hasMore}`);

      // Log the structure
      data.reviews.forEach((review: any, index: number) => {
        console.log(`\nReview ${index + 1}:`);
        console.log(`  ID: ${review.id}`);
        console.log(`  Depth: ${review.depth}`);
        console.log(`  Author: ${review.student_name}`);
        console.log(`  Rating: ${review.rating}`);
        console.log(`  Comment: "${review.comment.substring(0, 50)}..."`);

        if (review.replies && review.replies.length > 0) {
          console.log(`  Replies (${review.replies.length}):`);

          review.replies.forEach((reply: any, replyIndex: number) => {
            console.log(`    ${replyIndex + 1}. [Depth ${reply.depth}] ${reply.student_name}: "${reply.comment.substring(0, 40)}..."`);

            if (reply.replies && reply.replies.length > 0) {
              console.log(`       Nested replies (${reply.replies.length}):`);
              reply.replies.forEach((nestedReply: any, nestedIndex: number) => {
                console.log(`         ${nestedIndex + 1}. [Depth ${nestedReply.depth}] ${nestedReply.student_name}: "${nestedReply.comment.substring(0, 30)}..."`);
              });
            }
          });
        }
      });

      return data.reviews;
    } else {
      console.error('❌ Failed to fetch reviews:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

/**
 * Test 6: Delete a review with nested replies
 */
export async function testDeleteReviewWithReplies(
  reviewId: number,
  token: string
) {
  console.log('\n=== Test 6: Delete Review (with cascading replies) ===');

  try {
    const { status, data } = await makeRequest(
      'DELETE',
      `/api/reviews/${reviewId}`,
      undefined,
      token
    );

    if (status === 200) {
      console.log('✅ Review deleted successfully');
      console.log('Response:', data);
      return true;
    } else {
      console.error('❌ Failed to delete review:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

/**
 * Test 7: Check max depth validation
 */
export async function testMaxDepthValidation(productId: number, token: string) {
  console.log('\n=== Test 7: Max Depth Validation ===');

  // Create review -> reply -> nested reply
  const step1 = await testCreateReview(productId, token);
  if (!step1) return false;

  const step2 = await testReplyToReview(productId, step1, token);
  if (!step2) return false;

  const step3 = await testReplyToReply(productId, step2, token);
  if (!step3) return false;

  // Try to exceed
  const shouldFail = await testExceedMaxDepth(productId, step3, token);
  
  return shouldFail === true;
}

/**
 * Complete test suite
 */
export async function runCompleteNestedCommentsTests(
  productId: number,
  token: string
) {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Nested Comments System - Test Suite      ║');
  console.log('╚════════════════════════════════════════════╝');

  try {
    // Test 1: Create review
    const reviewId = await testCreateReview(productId, token);
    if (!reviewId) return;

    // Test 2: Reply to review
    const replyId = await testReplyToReview(productId, reviewId, token);
    if (!replyId) return;

    // Test 3: Nested reply
    const nestedReplyId = await testReplyToReply(productId, replyId, token);
    if (!nestedReplyId) return;

    // Test 4: Max depth validation
    await testExceedMaxDepth(productId, nestedReplyId, token);

    // Test 5: Fetch with structure
    const reviews = await testFetchReviewsWithNesting(productId, token);

    // Test 6: Depth validation comprehensive
    const validationPassed = await testMaxDepthValidation(productId, token);

    // Test 7: Display final structure
    if (reviews) {
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║  Final Review Structure                   ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log(JSON.stringify(reviews, null, 2));
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// ===== EXPECTED RESPONSE STRUCTURE =====

/**
 * Example of a fully nested review thread
 */
export const EXAMPLE_NESTED_RESPONSE = {
  success: true,
  reviews: [
    {
      id: 1,
      product_id: 5,
      student_id: 'STU001',
      rating: 5,
      title: 'Excellent quality product!',
      comment: 'This product exceeded my expectations. Fast delivery and great packaging.',
      is_verified_purchase: true,
      depth: 0,
      created_at: '2024-01-15T10:00:00Z',
      student_name: 'John Doe',
      student_avatar: 'https://...',
      replies: [
        {
          id: 2,
          product_id: 5,
          student_id: 'STU002',
          rating: 0,
          title: null,
          comment: 'Thank you for your feedback! We appreciate your business.',
          is_verified_purchase: false,
          depth: 1,
          parent_id: 1,
          created_at: '2024-01-15T11:00:00Z',
          student_name: 'Jane Smith (Seller)',
          student_avatar: 'https://...',
          replies: [
            {
              id: 3,
              product_id: 5,
              student_id: 'STU001',
              rating: 0,
              title: null,
              comment: 'Great response! Looking forward to working with you again.',
              is_verified_purchase: false,
              depth: 2,
              parent_id: 2,
              created_at: '2024-01-15T12:00:00Z',
              student_name: 'John Doe',
              student_avatar: 'https://...',
              replies: [],
            },
          ],
        },
        {
          id: 4,
          product_id: 5,
          student_id: 'STU003',
          rating: 0,
          title: null,
          comment: 'I agree! Excellent service and product quality.',
          is_verified_purchase: false,
          depth: 1,
          parent_id: 1,
          created_at: '2024-01-15T11:30:00Z',
          student_name: 'Alice Johnson',
          student_avatar: 'https://...',
          replies: [],
        },
      ],
    },
  ],
  total: 1,
  hasMore: false,
};

export default {
  runCompleteNestedCommentsTests,
  testCreateReview,
  testReplyToReview,
  testReplyToReply,
  testExceedMaxDepth,
  testFetchReviewsWithNesting,
  testDeleteReviewWithReplies,
  testMaxDepthValidation,
};
