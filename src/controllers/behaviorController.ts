// behaviorController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import {
  trackProductView,
  trackServiceView,
  trackSearchQuery,
  trackUserInteraction,
  getUserViewHistory,
  getUserSearchHistory,
  getUserPurchaseHistory,
  getUserInteractions,
  UserInteraction,
  getTrendingItems
} from '../models/userBehaviorModel.js';

export const trackView = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { itemId, itemType, viewDurationSeconds, sessionId, deviceInfo } = req.body;

    // Validate required fields
    if (!itemId || !itemType) {
      return res.status(400).json({
        success: false,
        message: 'itemId and itemType are required'
      });
    }

    // Validate itemType
    if (!['product', 'service'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'itemType must be either "product" or "service"'
      });
    }

    let viewData;
    if (itemType === 'product') {
      viewData = await trackProductView(
        studentId as string,
        parseInt(itemId),
        viewDurationSeconds || 0,
        sessionId,
        deviceInfo
      );
    } else {
      viewData = await trackServiceView(
        studentId as string,
        parseInt(itemId),
        viewDurationSeconds || 0,
        sessionId,
        deviceInfo
      );
    }

    res.status(201).json({
      success: true,
      message: 'View tracked successfully',
      data: viewData
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view'
    });
  }
};

export const trackSearch = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { searchQuery, filters, resultCount, sessionId, deviceInfo } = req.body;

    // Validate required fields
    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'searchQuery is required'
      });
    }

    const searchData = await trackSearchQuery(
      searchQuery,
      studentId as string,
      filters,
      resultCount || 0,
      sessionId,
      deviceInfo
    );

    res.status(201).json({
      success: true,
      message: 'Search tracked successfully',
      data: searchData
    });
  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track search'
    });
  }
};

export const trackInteraction = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { itemId, itemType, interactionType, metadata } = req.body;

    // Validate required fields
    if (!itemId || !itemType || !interactionType) {
      return res.status(400).json({
        success: false,
        message: 'itemId, itemType, and interactionType are required'
      });
    }

    // Validate interaction type
    const validInteractions = ['like', 'favorite', 'cart_add', 'cart_remove', 'purchase', 'share', 'report'];
    if (!validInteractions.includes(interactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interaction type'
      });
    }

    let productId: number | undefined;
    let serviceId: number | undefined;

    if (itemType === 'product') {
      productId = parseInt(itemId);
    } else if (itemType === 'service') {
      serviceId = parseInt(itemId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'itemType must be either "product" or "service"'
      });
    }

    const interactionData = await trackUserInteraction(
      studentId as string,
      interactionType as UserInteraction['interaction_type'],
      productId,
      serviceId,
      metadata
    );

    res.status(201).json({
      success: true,
      message: 'Interaction tracked successfully',
      data: interactionData
    });
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track interaction'
    });
  }
};

export const getViewHistory = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    const history = await getUserViewHistory(
      studentId as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: history.length === parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error getting view history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get view history'
    });
  }
};

export const getSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

    const history = await getUserSearchHistory(
      studentId as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: history.length === parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error getting search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search history'
    });
  }
};

export const getPurchaseHistory = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    const history = await getUserPurchaseHistory(
      studentId as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: history.length === parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error getting purchase history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get purchase history'
    });
  }
};

export const getInteractions = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { interactionType, limit = 50, offset = 0 } = req.query;

    const interactions = await getUserInteractions(
      studentId as string,
      interactionType as UserInteraction['interaction_type'],
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      success: true,
      data: interactions,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: interactions.length === parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error getting interactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get interactions'
    });
  }
};
