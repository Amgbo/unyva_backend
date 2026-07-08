import { pool } from '../db.js';

export interface University {
  id: number;
  name: string;
  short_name: string;
  email_domain: string;
  is_active: boolean;
}

/**
 * Get all active universities
 */
export const getAllUniversities = async (): Promise<University[]> => {
  try {
    const result = await pool.query(
      'SELECT id, name, short_name, email_domain, is_active FROM universities WHERE is_active = true ORDER BY name'
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching universities:', error);
    throw error;
  }
};

/**
 * Get university by ID
 */
export const getUniversityById = async (id: number): Promise<University | null> => {
  try {
    const result = await pool.query(
      'SELECT id, name, short_name, email_domain, is_active FROM universities WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching university by ID:', error);
    throw error;
  }
};

/**
 * Get university by name
 */
export const getUniversityByName = async (name: string): Promise<University | null> => {
  try {
    const result = await pool.query(
      'SELECT id, name, short_name, email_domain, is_active FROM universities WHERE name = $1 AND is_active = true',
      [name]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching university by name:', error);
    throw error;
  }
};

/**
 * Validate if email domain matches university
 */
export const isValidUniversityEmail = async (email: string, universityName: string): Promise<boolean> => {
  try {
    const university = await getUniversityByName(universityName);
    if (!university) {
      console.log(`University not found: ${universityName}`);
      return false;
    }

    const emailDomain = email.toLowerCase().split('@')[1];
    const universityDomain = university.email_domain.toLowerCase();

    const isValid = emailDomain === universityDomain;
    console.log(`Email validation: ${email} -> domain: ${emailDomain}, university domain: ${universityDomain}, valid: ${isValid}`);

    return isValid;
  } catch (error) {
    console.error('Error validating university email:', error);
    return false;
  }
};

/**
 * Get university by email domain
 */
export const getUniversityByEmailDomain = async (emailDomain: string): Promise<University | null> => {
  try {
    const result = await pool.query(
      'SELECT id, name, short_name, email_domain, is_active FROM universities WHERE email_domain = $1 AND is_active = true',
      [emailDomain.toLowerCase()]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching university by email domain:', error);
    throw error;
  }
};
