import { Router } from 'express';
import { bookingRoutes } from './bookingRoutes.js';
import { guideRoutes } from './guideRoutes.js';
import { reviewRoutes } from './reviewRoutes.js';
import { messagesRoutes } from './messagesRoutes.js';

export const companionRoutes = Router();

// Mount sub-routers at root because this router is already mounted at /api/companion.
companionRoutes.use('/', guideRoutes);
companionRoutes.use('/', bookingRoutes);
companionRoutes.use('/', reviewRoutes);
companionRoutes.use('/', messagesRoutes);





