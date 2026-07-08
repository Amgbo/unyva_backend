import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getPublicConfig,
  getCampuses,
  getCampusByCode,
  getBuildingsByCampus,
  getFloorsByBuilding,
  getRoomsByFloor,
  getCarriers,
  submitMeasurements,
  getMeasurements,
  submitSpeedTest,
  getBuildingCoverage,
  getRoomCoverage,
  getHeatmapTiles,
  getBuildingAnalytics,
  getNearbyCoverageSummaries
} from '../controllers/hotspotController.js';
import { debugNearby } from '../controllers/hotspotDebugController.js';

const router = Router();

// ==================== PUBLIC ENDPOINTS ====================

// Configuration (public)
router.get('/config', getPublicConfig);

// Campuses (public)
router.get('/campuses', getCampuses);
router.get('/campuses/:code', getCampusByCode);

// Buildings by campus (public)
router.get('/campuses/:campusCode/buildings', getBuildingsByCampus);

// Floors by building (public)
router.get('/buildings/:buildingId/floors', getFloorsByBuilding);

// Rooms by floor (public)
router.get('/floors/:floorId/rooms', getRoomsByFloor);

// Carriers (public)
router.get('/carriers', getCarriers);

// Coverage (public - aggregated data)
router.get('/coverage/buildings/:buildingId', getBuildingCoverage);
router.get('/coverage/rooms/:roomId', getRoomCoverage);

// Heatmap tiles (public - aggregated data)
router.get('/heatmap', getHeatmapTiles);

// Analytics (public - aggregated data)
router.get('/analytics/building/:buildingId', getBuildingAnalytics);

// Nearby aggregated coverage summaries by real GPS location (public - aggregated data)
router.get('/nearby', getNearbyCoverageSummaries);

// Debug: validate data availability around a given GPS (public)
router.get('/debug/nearby', debugNearby);


// ==================== AUTHENTICATED ENDPOINTS ====================

// All routes below require authentication
router.use(authMiddleware);

// Measurements (authenticated)
router.post('/measurements', submitMeasurements);
router.get('/measurements', getMeasurements);

// Speed tests (authenticated)
router.post('/speed-tests', submitSpeedTest);

export default router;