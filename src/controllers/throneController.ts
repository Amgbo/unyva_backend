import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { ThroneModel } from '../models/throneModel.js';

export class ThroneController {
  // Calculate thrones for current week (admin endpoint)
  static async calculateWeeklyThrones(req: AuthRequest, res: Response) {
    try {
      // Get the start of current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);

      // Check if already calculated
      const alreadyCalculated = await ThroneModel.areThronesCalculatedForWeek(weekStart);
      if (alreadyCalculated) {
        return res.status(400).json({ error: 'Thrones already calculated for this week' });
      }

      const thrones = await ThroneModel.calculateWeeklyThrones(weekStart);
      res.json({ thrones, weekStart });
    } catch (error) {
      console.error('Error calculating weekly thrones:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get current throne holders
  static async getCurrentThroneHolders(req: AuthRequest, res: Response) {
    try {
      const throneHolders = await ThroneModel.getCurrentThroneHolders();
      res.json({ throneHolders });
    } catch (error) {
      console.error('Error fetching current throne holders:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get throne holders for a specific week
  static async getThroneHoldersForWeek(req: AuthRequest, res: Response) {
    try {
      const weekStart = new Date(req.params.weekStart);
      const throneHolders = await ThroneModel.getThroneHoldersForWeek(weekStart);
      res.json({ throneHolders });
    } catch (error) {
      console.error('Error fetching throne holders for week:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get user's throne history
  static async getUserThroneHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 10;

      const history = await ThroneModel.getUserThroneHistory(userId, limit);
      res.json({ history });
    } catch (error) {
      console.error('Error fetching user throne history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get throne statistics
  static async getThroneStats(req: AuthRequest, res: Response) {
    try {
      const throneType = req.query.throneType as string;
      const stats = await ThroneModel.getThroneStats(throneType);
      res.json({ stats });
    } catch (error) {
      console.error('Error fetching throne stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get throne types
  static async getThroneTypes(req: AuthRequest, res: Response) {
    try {
      const throneTypes = ThroneModel.getThroneTypes();
      res.json({ throneTypes });
    } catch (error) {
      console.error('Error fetching throne types:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
