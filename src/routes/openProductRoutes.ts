import { Router } from 'express';
import { openProduct } from '../controllers/openProductController.js';

const router = Router();

// Public route for opening products via deep links
router.get('/open-product', openProduct);

export default router;
