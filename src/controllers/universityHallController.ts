// universityHallController.ts
import { Request, Response } from 'express';
import { getAllHalls } from '../models/universityHallModel.js';

export const getHalls = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received request to fetch halls');
    const halls = await getAllHalls();

    console.log(`Sending ${halls.length} halls to client`);
    // Return just the array of halls as expected by the frontend
    res.json(halls);
  } catch (error: any) {
    console.error('Error fetching halls:', error);

    // More specific error messages
    if (error.code === '42P01') { // Table doesn't exist
      res.status(500).json({
        error: 'Database table not found',
        details: 'The university_halls table does not exist in the database'
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(500).json({
        error: 'Database connection failed',
        details: 'Unable to connect to the database server'
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch halls',
        details: error.message
      });
    }
  }
};
