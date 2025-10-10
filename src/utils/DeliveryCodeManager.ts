import { pool } from '../db.js';

/**
 * Delivery Code Manager - Handles generation, validation, and tracking of delivery codes
 */
class DeliveryCodeManager {
  
  /**
   * Validate a delivery code and check if it's available
   */
  async validateCode(code: string): Promise<{ isValid: boolean; message: string }> {
    try {
      const result = await pool.query(
        `SELECT * FROM delivery_codes 
         WHERE code = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
        [code.toUpperCase().trim()]
      );

      if (result.rows.length === 0) {
        return { isValid: false, message: 'Invalid delivery code' };
      }

      const codeData = result.rows[0];
      
      if (codeData.is_used) {
        return { isValid: false, message: 'Delivery code already used' };
      }

      if (codeData.expires_at && new Date() > codeData.expires_at) {
        return { isValid: false, message: 'Delivery code has expired' };
      }

      return { isValid: true, message: 'Valid delivery code' };
    } catch (error) {
      console.error('Error validating delivery code:', error);
      return { isValid: false, message: 'Error validating code' };
    }
  }

  /**
   * Mark a delivery code as used by a specific student
   */
  async useCode(code: string, studentId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `UPDATE delivery_codes 
         SET is_used = TRUE, used_by_student_id = $2, used_at = NOW()
         WHERE code = $1 AND is_used = FALSE`,
        [code.toUpperCase().trim(), studentId]
      );

      // FIX: Handle possible null rowCount
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error using delivery code:', error);
      return false;
    }
  }

  /**
   * Generate new delivery codes (Admin function)
   */
  async generateCodes(count: number = 5, expiresInDays: number = 365): Promise<string[]> {
    const newCodes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    try {
      for (let i = 0; i < count; i++) {
        let code = '';
        for (let j = 0; j < 6; j++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        code = 'UNYVA-' + code; // Add prefix for identification

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        await pool.query(
          `INSERT INTO delivery_codes (code, expires_at)
           VALUES ($1, $2)
           ON CONFLICT (code) DO NOTHING`,
          [code, expiresAt]
        );

        newCodes.push(code);
      }
      return newCodes;
    } catch (error) {
      console.error('Error generating delivery codes:', error);
      throw new Error('Failed to generate delivery codes');
    }
  }

  /**
   * Get all delivery codes with their status
   */
  async getAllCodes(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT code, is_used, used_by_student_id, created_at, used_at, expires_at
        FROM delivery_codes
        ORDER BY created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching delivery codes:', error);
      return [];
    }
  }

  /**
   * Revoke a delivery code (Admin function)
   */
  async revokeCode(code: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `DELETE FROM delivery_codes WHERE code = $1`,
        [code.toUpperCase().trim()]
      );

      // FIX: Handle possible null rowCount
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error revoking delivery code:', error);
      return false;
    }
  }

  /**
   * Check if a student already used a delivery code
   */
  async hasDeliveryCode(studentId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT * FROM delivery_codes WHERE used_by_student_id = $1`,
        [studentId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking student delivery code:', error);
      return false;
    }
  }
}

// Export singleton instance
export const deliveryCodeManager = new DeliveryCodeManager();