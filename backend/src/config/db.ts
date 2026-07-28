import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration SSL en fonction de l'environnement
const isProduction = process.env.NODE_ENV === 'production';
const sslConfig = isProduction
  ? { rejectUnauthorized: true }
  : process.env.PGSSLMODE === 'require'
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  // Timeout d'attente d'une connexion du pool (10 secondes)
  connectionTimeoutMillis: 10000,
  // Timeout d'inactivité d'une connexion (30 minutes)
  idleTimeoutMillis: 300000,
  // Nombre max de clients dans le pool
  max: 20,
});

// ── FIX : Forcer les colonnes DATE (OID 1082) à retourner une chaîne ──────
// node-postgres convertit par défaut les DATE en objets Date JavaScript à
// minuit UTC. Lors de la sérialisation JSON, cela décale la date d'un jour
// en arrière pour les fuseaux horaires à l'est de UTC (ex : UTC+3 → -1 jour).
// En retournant la chaîne YYYY-MM-DD brute, on préserve la valeur exacte
// stockée en base.
import { types } from 'pg';
types.setTypeParser(types.builtins.DATE, (val: string) => val);

// Petit test de connexion au démarrage
pool.on('connect', () => {
  console.log('🐘 PostgreSQL : Connexion établie avec succès !');
});

pool.on('error', (err) => {
  console.error('❌ Erreur inattendue sur PostgreSQL', err);
});

export default pool;
