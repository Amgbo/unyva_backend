// universityHallController.ts
import { Request, Response } from 'express';
import { getAllHalls } from '../models/universityHallModel.js';
import { handleControllerError } from '../utils/apiError.js';

export const getHalls = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received request to fetch halls');
    const halls = await getAllHalls();

    console.log(`Sending ${halls.length} halls to client`);
    // Return just the array of halls as expected by the frontend
    res.json(halls);
  } catch (error: any) {
    console.error('Error fetching halls:', error);
    handleControllerError(res, error, {
      statusCode: 500,
      publicError: 'Failed to fetch halls',
      context: 'universityHall/getHalls',
    });
  }
};
