import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { JWT_SECRET } from '../config/jwt';

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM utilisateurs WHERE username = $1 AND actif = true',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('❌ Erreur login', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};