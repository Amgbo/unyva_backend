import { Router } from 'express';
import { createMulter } from '../config/multer.js';
import {
  registerStep1,
  completeRegistration,
  verifyEmail,
  loginStudent,
  getStudentProfile,
  getStudentProfileById,
  updateStudentProfile,
  deleteAccount,
} from '../controllers/studentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { DealController } from '../controllers/dealController.js';
import { SellerReviewController } from '../controllers/sellerReviewController.js';
import { FollowController } from '../controllers/followController.js';
import { ThroneController } from '../controllers/throneController.js';

const router = Router();

// Create conditional multer instance: profile_picture -> profiles, id_card -> idcards
const upload = createMulter({ profile_picture: 'profiles', id_card: 'idcards' }, 'profiles');

// Step 1: Basic registration
router.post('/register-step1', registerStep1);

// Complete registration: Single step with all data
router.post('/complete-registration', upload.fields([
  { name: 'profile_picture', maxCount: 1 },
  { name: 'id_card', maxCount: 1 },
]), completeRegistration);

// Email verification
router.get('/verify-email', verifyEmail);

// Login
router.post('/login', loginStudent);

// Get logged-in student profile (protected)
router.get('/profile', authMiddleware, getStudentProfile);

// Get student profile by ID (public, but limited info)
router.get('/profile/:studentId', getStudentProfileById);

// Update student profile (protected)
router.put('/profile', authMiddleware, upload.any(), updateStudentProfile);

// Delete account (protected)
router.delete('/delete-account', authMiddleware, deleteAccount);
// Follow routes
router.post('/follow', authMiddleware, FollowController.followUser);
router.post('/unfollow', authMiddleware, FollowController.unfollowUser);
router.get('/:userId/following', FollowController.getFollowing);
router.get('/:userId/followers', FollowController.getFollowers);
router.get('/:userId/follow-stats', authMiddleware, FollowController.getFollowStats);
router.get('/:userId/is-following', authMiddleware, FollowController.isFollowing);
router.get('/mutual-follows', authMiddleware, FollowController.getMutualFollows);
router.get('/leaderboard/most-followed', FollowController.getMostFollowedLeaderboard);
router.get('/leaderboard/top-sellers', FollowController.getTopSellersLeaderboard);
router.get('/leaderboard/highest-rated', FollowController.getHighestRatedLeaderboard);

// Seller review routes
router.post('/reviews', authMiddleware, SellerReviewController.createReview);
router.get('/:sellerId/reviews', SellerReviewController.getSellerReviews);
router.put('/reviews/:id', authMiddleware, SellerReviewController.updateReview);
router.delete('/reviews/:id', authMiddleware, SellerReviewController.deleteReview);
router.get('/deals/:dealId/can-review', authMiddleware, SellerReviewController.canUserReviewDeal);

export { router as studentRouter };
