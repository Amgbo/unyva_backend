import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
   res: Response,
    next: NextFunction): Promise<void> => {
  console.log('authMiddleware called for path:', req.path, 'method:', req.method);
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No token provided');
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    // Get the user from the database using student_id
    const { pool } = await import('../db.js');
    const userQuery = await pool.query('SELECT student_id FROM students WHERE student_id = $1', [decoded.student_id]);

    if (userQuery.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      ...decoded,
      id: decoded.student_id // Use student_id as the id since it's the primary key
    };

    console.log('Token decoded successfully, user:', req.user);
    next();
  } catch (err) {
    console.log('Token verification failed:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ message: 'No token provided' });
    return; // ✅ return early, no Response returned to Express
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Invalid token format' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).student = decoded;
    (req as any).user = decoded; // ensure controllers can read req.user as well
    next(); // ✅ let request continue
  } catch (err) {
    res.status(403).json({ message: 'Token is invalid or expired' });
    return;
  }
};
