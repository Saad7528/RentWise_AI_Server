import { Request, Response, NextFunction } from 'express';
import { Session } from '../models/Session';
import { User, IUser } from '../models/User';

// Extend Express Request interface to include the user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = '';

    // 1. Try to read token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Try to read token from cookies
    if (!token && req.headers.cookie) {
      // Parse cookies manually
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map((cookie) => {
          const parts = cookie.split('=');
          return [parts[0].trim(), parts[1] ? parts[1].trim() : ''];
        })
      );
      token = cookies['better-auth.session_token'];
    }

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Find session in database
    const session = await Session.findOne({ token });
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized: Invalid session' });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      return res.status(401).json({ message: 'Unauthorized: Session expired' });
    }

    // Find the user associated with this session
    // Better Auth uses user ID as string which matches userSchema's fields
    const user = await User.findOne({
      $or: [
        { _id: session.userId },
        { id: session.userId } // In some adapters, id is a string field
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Forbidden: Your account has been blocked' });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Admin validation middleware
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};
