import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { DealModel, CreateDealData, UpdateDealConfirmation } from '../models/dealModel.js';

export class DealController {
  // Create a new deal (buyer initiates transaction)
  static async createDeal(req: AuthRequest, res: Response) {
    try {
      const { product_id, seller_id }: CreateDealData = req.body;
      const buyer_id = req.user?.student_id;

      if (!buyer_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const deal = await DealModel.createDeal({
        product_id,
        buyer_id,
        seller_id
      });

      res.status(201).json({ deal });
    } catch (error) {
      console.error('Error creating deal:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Get user's deals
  static async getUserDeals(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.student_id;
      const userType = req.query.userType as 'buyer' | 'seller' || 'buyer';

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const deals = await DealModel.getUserDeals(userId, userType);
      res.json({ deals });
    } catch (error) {
      console.error('Error fetching user deals:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get deal by ID
  static async getDealById(req: AuthRequest, res: Response) {
    try {
      const dealId = parseInt(req.params.id);
      const userId = req.user?.student_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const deal = await DealModel.getDealById(dealId);

      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Check if user is part of this deal
      if (deal.buyer_id !== userId && deal.seller_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this deal' });
      }

      res.json({ deal });
    } catch (error) {
      console.error('Error fetching deal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Confirm deal (buyer or seller confirms)
  static async confirmDeal(req: AuthRequest, res: Response) {
    try {
      const deal_id = parseInt(req.params.id);
      const { confirmed }: { confirmed: boolean } = req.body;
      const user_id = req.user?.student_id;

      if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Determine user type
      const deal = await DealModel.getDealById(deal_id);
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      let user_type: 'buyer' | 'seller';
      if (deal.buyer_id === user_id) {
        user_type = 'buyer';
      } else if (deal.seller_id === user_id) {
        user_type = 'seller';
      } else {
        return res.status(403).json({ error: 'Unauthorized to confirm this deal' });
      }

      const updatedDeal = await DealModel.confirmDeal({
        deal_id,
        user_id,
        user_type,
        confirmed
      });

      res.json({ deal: updatedDeal });
    } catch (error) {
      console.error('Error confirming deal:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Delete deal (if not completed)
  static async deleteDeal(req: AuthRequest, res: Response) {
    try {
      const dealId = parseInt(req.params.id);
      const userId = req.user?.student_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const success = await DealModel.deleteDeal(dealId, userId);

      if (!success) {
        return res.status(404).json({ error: 'Deal not found or cannot be deleted' });
      }

      res.json({ message: 'Deal deleted successfully' });
    } catch (error) {
      console.error('Error deleting deal:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
