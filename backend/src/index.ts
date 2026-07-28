import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import path from 'path';
import http from 'http';
import fs from 'fs';
import cron from 'node-cron';
import pool from './config/db';
import { initTables } from './config/initTables';
import dossierRoutes from './routes/dossierRoutes';
import annuaireRoutes from './routes/annuaireRoutes';
import historiqueDefavorableRoutes from './routes/historiqueDefavorableRoutes';
import historiqueArriveeRoutes from './routes/historiqueArriveeRoutes';
import authRoutes from './routes/authRoutes';
import { authMiddleware } from './middleware/authMiddleware';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './socket';
import sortieRoutes from './routes/sortieRoutes';
import auditRoutes from './routes/auditRoutes';


dotenv.config();

const app = express();

// ============================================================
// SÉCURITÉ GLOBALE
// ============================================================
app.use(helmet({ contentSecurityPolicy: false }));

app.use('/api/sorties', authMiddleware, sortieRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);

// CORS restreint à l'origine frontend (défini dans .env)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Trust proxy pour les reverse proxies (nécessaire pour rate limiting)
app.set('trust proxy', 1);

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
});
app.use(globalLimiter);

// Rate limiting strict pour /api/auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion.' },
});

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'UNDO_PASSWORD_HASH'];
let missingEnvVars = false;
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ FATAL: ${varName} is not defined in .env`);
    missingEnvVars = true;
  }
}
if (missingEnvVars) {
  console.error('❌ Le serveur ne peut pas démarrer : variables d\'environnement manquantes.');
  process.exit(1);
}
app.use(express.json({ limit: '10mb' }));

// ============================================================
// SERVIR LE BUILD FRONTEND (fichiers statiques)
// ============================================================
const possiblePaths = [
  path.join(__dirname, '../../frontend/build'),     // depuis backend/dist/
  path.join(__dirname, '../frontend/build'),         // depuis backend/src/
  path.join(__dirname, '../../../frontend/build'),   // depuis backend/src/sous-dossier
];
let frontendBuildPath = possiblePaths[0];
for (const p of possiblePaths) {
  try {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      frontendBuildPath = p;
      break;
    }
  } catch (_) {}
}
console.log(`Frontend build path: ${frontendBuildPath}`);
app.use(express.static(frontendBuildPath));

// ============================================================
// ROUTE PUBLIQUE (authentification) – sans middleware
// ============================================================
app.use('/api/auth', authLimiter, authRoutes);

// ============================================================
// MIDDLEWARE D'AUTHENTIFICATION (protège toutes les routes suivantes)
// ============================================================
app.use('/api/dossiers', authMiddleware, dossierRoutes);
app.use('/api/annuaire', authMiddleware, annuaireRoutes);
app.use('/api/historique-defavorable', authMiddleware, historiqueDefavorableRoutes);
app.use('/api/historique-arrivee', authMiddleware, historiqueArriveeRoutes);

// ============================================================
// MOT DE PASSE UNDO (hashé via bcrypt)
// ============================================================
const UNDO_PASSWORD_HASH = process.env.UNDO_PASSWORD_HASH;
if (!UNDO_PASSWORD_HASH) {
  console.warn('⚠️ UNDO_PASSWORD_HASH non défini dans .env — la réinitialisation et la vérification de mot de passe seront désactivées.');
}

// Route pour vérifier le mot de passe (évite d'avoir le mdp en clair côté frontend)
app.post('/api/verify-password', authMiddleware, async (req: Request, res: Response) => {
  if (!UNDO_PASSWORD_HASH) {
    return res.status(503).json({ valid: false, error: 'Fonctionnalité désactivée (UNDO_PASSWORD_HASH non configuré)' });
  }
  const { password } = req.body;

  // ✅ Comparaison via bcrypt (temps constant)
  const valid = await bcrypt.compare(password, UNDO_PASSWORD_HASH);

  if (valid) {
    return res.json({ valid: true });
  }
  return res.status(403).json({ valid: false, error: 'Mot de passe incorrect' });
});

// Route de reset protégée – nécessite le mot de passe de confirmation
app.post('/api/reset', authMiddleware, async (req: Request, res: Response) => {
  if (!UNDO_PASSWORD_HASH) {
    return res.status(503).json({ error: 'Fonctionnalité désactivée (UNDO_PASSWORD_HASH non configuré)' });
  }
  const { confirmPassword } = req.body;

  // ✅ Comparaison via bcrypt
  const valid = await bcrypt.compare(confirmPassword, UNDO_PASSWORD_HASH);

  if (!valid) {
    return res.status(403).json({ error: 'Mot de passe de confirmation incorrect.' });
  }

  try {
    await pool.query('BEGIN');
   await pool.query(
  'TRUNCATE TABLE dossiers, annuaire_entries, annuaire_groupes, historique_defavorable, historique_arrivee, historique_arrivee_groupes, audit_log RESTART IDENTITY CASCADE'
);
    await pool.query('COMMIT');
    res.json({ message: '✅ Toutes les données ont été effacées.' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Erreur reset :', err);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// Route de test (publique) pour diagnostic
app.get('/api/auth/test', (_req, res) => {
  res.json({ message: 'Auth test OK' });
});

// ============================================================
// SERVIR LE FRONTEND POUR TOUTES LES AUTRES ROUTES (SPA)
// ============================================================
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route API introuvable' });
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// ============================================================
// MIDDLEWARE D'ERREUR GLOBAL (doit être le dernier middleware)
// ============================================================
app.use(errorHandler);

// ============================================================
// LANCEMENT DU SERVEUR + Socket.IO
// ============================================================
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, async () => {
  console.log(`-----------------------------------------------`);
  console.log(`✅ Serveur lancé sur : http://localhost:${PORT}`);

  try {
    // Initialisation des tables via le fichier dédié
    await initTables();

    // Initialisation des utilisateurs depuis .env
    const usersString = process.env.INIT_USERS;
    if (usersString) {
      const userPairs = usersString.split(',').map((pair) => pair.trim());
      for (const pair of userPairs) {
        const [username, password] = pair.split(':');
        if (!username || !password) continue;
        const hash = await bcrypt.hash(password.trim(), 10);
        await pool.query(
          `INSERT INTO utilisateurs (username, password_hash, role)
           VALUES ($1, $2, 'agent')
           ON CONFLICT (username)
           DO UPDATE SET password_hash = EXCLUDED.password_hash`,
          [username.trim(), hash]
        );
      }
      console.log('✅ Utilisateurs initialisés depuis le .env');
    } else {
      console.log('⚠️ Aucun utilisateur défini dans INIT_USERS');
    }

    console.log(`-----------------------------------------------`);
  } catch (err) {
    console.error('❌ Erreur lors de l\'initialisation :', err);
    console.log(`-----------------------------------------------`);
  }
});

// ============================================================
// TÂCHES PLANIFIÉES (CRON)
// ============================================================

// 1. Rafraîchir la vue matérialisée toutes les heures
cron.schedule('0 * * * *', async () => {
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats');
    console.log('🔄 Vue matérialisée dashboard_stats rafraîchie (cron horaire)');
  } catch (err) {
    console.error('❌ Erreur refresh vue matérialisée :', err);
  }
});

// 2. Nettoyer les historiques de plus de 2 ans (tous les 1er du mois à 2h du matin)
cron.schedule('0 2 1 * *', async () => {
  try {
    const resultArrivee = await pool.query(
      `DELETE FROM historique_arrivee WHERE date_arrivee < NOW() - INTERVAL '2 years'`
    );
    const resultDefavorable = await pool.query(
      `DELETE FROM historique_defavorable WHERE date_arrivee < NOW() - INTERVAL '2 years'`
    );

    console.log(`🧹 Historiques nettoyés :`);
    console.log(`   - historique_arrivee : ${resultArrivee.rowCount} ligne(s) supprimée(s)`);
    console.log(`   - historique_defavorable : ${resultDefavorable.rowCount} ligne(s) supprimée(s)`);
  } catch (err) {
    console.error('❌ Erreur lors du nettoyage des historiques :', err);
  }
});

// ============================================================
// FIN
// ============================================================
console.log('🕒 Tâches planifiées activées :');
console.log('   - Refresh dashboard_stats : toutes les heures');
console.log('   - Nettoyage historiques (> 2 ans) : tous les 1er du mois à 02h00');