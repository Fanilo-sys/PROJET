

import crypto from 'crypto';

// ✅ FIX C3 : Plus de fallback aléatoire – on exige une clé définie dans .env
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('FATAL: JWT_SECRET is not defined in .env');
}
export const JWT_SECRET = secret;