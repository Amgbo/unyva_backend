// universityHallModel.ts
import { pool } from '../db.js';

export interface UniversityHall {
  id: number;
  full_name: string;
  short_name?: string;
  location_zone?: string;
  is_active?: boolean;
}

export const getAllHalls = async (): Promise<UniversityHall[]> => {
  try {
    console.log('Executing query to fetch halls...');
    const query = `
      SELECT id, full_name, short_name, location_zone, is_active 
      FROM university_halls 
      WHERE is_active = TRUE 
      ORDER BY full_name ASC
    `;
    
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} halls`);
    return result.rows;
  } catch (error) {
    console.error('Database error in getAllHalls:', error);
    throw error;
  }
};