import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (
  req: AuthRequest,
   res: Response,
    next: NextFunction): void => {
  console.log('authMiddleware called for path:', req.path, 'method:', req.method);
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No token provided');
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded; // store decoded data for controllers
    console.log('Token decoded successfully, user:', decoded);
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
