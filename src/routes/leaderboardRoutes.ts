import { Router } from 'express';
import { FollowController } from '../controllers/followController.js';

const router = Router();

// Top sellers leaderboard
router.get('/sellers', FollowController.getTopSellersLeaderboard);

// Service providers leaderboard
router.get('/service-providers', FollowController.getServiceProvidersLeaderboard);

// Most followed leaderboard
router.get('/most-followed', FollowController.getMostFollowedLeaderboard);

// Highest rated sellers leaderboard
router.get('/highest-rated', FollowController.getHighestRatedLeaderboard);

export default router;
