// universityHallRoutes.ts

import express from 'express';
import { getHalls } from '../controllers/universityHallController.js';

const router = express.Router();

router.get('/halls', getHalls);

export default router;
