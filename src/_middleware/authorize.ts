import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../_helpers/db';

const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export function authorize(roles: string[] = []) {
  return [
    // Authenticate via JWT
    (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        (req as any).user = decoded;
        next();
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    },
    // Authorize based on role
    async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;

      // Check if account still exists
      const account = await db.Account.findByPk(user.id);
      if (!account) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check authorization
      if (roles.length && !roles.includes(account.role)) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Attach account info to request
      (req as any).user.role = account.role;
      (req as any).user.ownsToken = (token: any) => {
        return async () => {
          const tokens = await db.RefreshToken.findAll({ where: { accountId: account.id } });
          return tokens.some((t: any) => t.token === token);
        };
      };

      next();
    }
  ];
}

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}