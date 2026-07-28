import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';
import pool from '../config/db';

interface AuthUser {
  id?: number;
  username?: string;
  role?: string;
}

interface AuthRequest extends Request {
  user?: AuthUser | null;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as AuthRequest).user = payload;
    if (payload.id) {
      // Propager l'ID utilisateur à la session PostgreSQL pour le trigger d'audit
      pool.query(`SELECT set_config('app.current_user_id', $1, true)`, [String(payload.id)])
        .catch(err => console.warn('⚠️ Impossible de définir current_user_id:', err.message));
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};
