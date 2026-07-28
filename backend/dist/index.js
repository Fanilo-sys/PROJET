"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv = __importStar(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const db_1 = __importDefault(require("./config/db"));
const initTables_1 = require("./config/initTables");
const dossierRoutes_1 = __importDefault(require("./routes/dossierRoutes"));
const annuaireRoutes_1 = __importDefault(require("./routes/annuaireRoutes"));
const historiqueDefavorableRoutes_1 = __importDefault(require("./routes/historiqueDefavorableRoutes"));
const historiqueArriveeRoutes_1 = __importDefault(require("./routes/historiqueArriveeRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const errorHandler_1 = require("./middleware/errorHandler");
const socket_1 = require("./socket");
dotenv.config();
const app = (0, express_1.default)();
// ============================================================
// SÉCURITÉ GLOBALE
// ============================================================
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)());
// Rate limiting global
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
});
app.use(globalLimiter);
// Rate limiting strict pour /api/auth
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives de connexion.' },
});
app.use(express_1.default.json({ limit: '10mb' }));
// ============================================================
// SERVIR LE BUILD FRONTEND (fichiers statiques)
// ============================================================
const possiblePaths = [
    path_1.default.join(__dirname, '../../frontend/build'), // depuis backend/dist/
    path_1.default.join(__dirname, '../frontend/build'), // depuis backend/src/
    path_1.default.join(__dirname, '../../../frontend/build'), // depuis backend/src/sous-dossier
];
let frontendBuildPath = possiblePaths[0];
for (const p of possiblePaths) {
    try {
        if (fs_1.default.existsSync(path_1.default.join(p, 'index.html'))) {
            frontendBuildPath = p;
            break;
        }
    }
    catch (_) { }
}
console.log(`Frontend build path: ${frontendBuildPath}`);
app.use(express_1.default.static(frontendBuildPath));
// ============================================================
// ROUTE PUBLIQUE (authentification) – sans middleware
// ============================================================
app.use('/api/auth', authLimiter, authRoutes_1.default);
// ============================================================
// MIDDLEWARE D'AUTHENTIFICATION (protège toutes les routes suivantes)
// ============================================================
app.use('/api/dossiers', authMiddleware_1.authMiddleware, dossierRoutes_1.default);
app.use('/api/annuaire', authMiddleware_1.authMiddleware, annuaireRoutes_1.default);
app.use('/api/historique-defavorable', authMiddleware_1.authMiddleware, historiqueDefavorableRoutes_1.default);
app.use('/api/historique-arrivee', authMiddleware_1.authMiddleware, historiqueArriveeRoutes_1.default);
// Le mot de passe UNDO vient UNIQUEMENT du .env — pas de fallback en dur
const UNDO_PASSWORD = process.env.UNDO_PASSWORD;
if (!UNDO_PASSWORD) {
    console.warn('⚠️ UNDO_PASSWORD non défini dans .env — la réinitialisation et la vérification de mot de passe seront désactivées.');
}
// Route pour vérifier le mot de passe (évite d'avoir le mdp en clair côté frontend)
app.post('/api/verify-password', authMiddleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!UNDO_PASSWORD) {
        return res.status(503).json({ valid: false, error: 'Fonctionnalité désactivée (UNDO_PASSWORD non configuré)' });
    }
    const { password } = req.body;
    if (password === UNDO_PASSWORD) {
        return res.json({ valid: true });
    }
    return res.status(403).json({ valid: false, error: 'Mot de passe incorrect' });
}));
// Route de reset protégée – nécessite le mot de passe de confirmation
app.post('/api/reset', authMiddleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!UNDO_PASSWORD) {
        return res.status(503).json({ error: 'Fonctionnalité désactivée (UNDO_PASSWORD non configuré)' });
    }
    const { confirmPassword } = req.body;
    if (confirmPassword !== UNDO_PASSWORD) {
        return res.status(403).json({ error: 'Mot de passe de confirmation requis.' });
    }
    try {
        yield db_1.default.query('BEGIN');
        yield db_1.default.query('TRUNCATE TABLE dossiers, annuaire, annuaire_groupes, historique_defavorable, historique_arrivee, historique_arrivee_groupes RESTART IDENTITY CASCADE');
        yield db_1.default.query('COMMIT');
        res.json({ message: '✅ Toutes les données ont été effacées.' });
    }
    catch (err) {
        yield db_1.default.query('ROLLBACK');
        console.error('❌ Erreur reset :', err);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
}));
// Route de test (publique) pour diagnostic
app.get('/api/auth/test', (_req, res) => {
    res.json({ message: 'Auth test OK' });
});
// ============================================================
// SERVIR LE FRONTEND POUR TOUTES LES AUTRES ROUTES (SPA)
// Express 5 ne supporte plus '*' comme wildcard. On utilise un
// middleware de fallback avec vérification des routes API.
// ============================================================
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Route API introuvable' });
    }
    res.sendFile(path_1.default.join(frontendBuildPath, 'index.html'));
});
// ============================================================
// MIDDLEWARE D'ERREUR GLOBAL (doit être le dernier middleware)
// ============================================================
app.use(errorHandler_1.errorHandler);
// ============================================================
// LANCEMENT DU SERVEUR + Socket.IO
// ============================================================
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app);
(0, socket_1.initSocket)(server);
server.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`-----------------------------------------------`);
    console.log(`✅ Serveur lancé sur : http://localhost:${PORT}`);
    try {
        // Initialisation des tables via le fichier dédié
        yield (0, initTables_1.initTables)();
        // Initialisation des utilisateurs depuis .env
        const usersString = process.env.INIT_USERS;
        if (usersString) {
            const userPairs = usersString.split(',').map(pair => pair.trim());
            for (const pair of userPairs) {
                const [username, password] = pair.split(':');
                if (!username || !password)
                    continue;
                const hash = yield bcrypt_1.default.hash(password.trim(), 10);
                yield db_1.default.query(`INSERT INTO utilisateurs (username, password_hash, role)
           VALUES ($1, $2, 'agent')
           ON CONFLICT (username)
           DO UPDATE SET password_hash = EXCLUDED.password_hash`, [username.trim(), hash]);
            }
            console.log('✅ Utilisateurs initialisés depuis le .env');
        }
        else {
            console.log('⚠️ Aucun utilisateur défini dans INIT_USERS');
        }
        console.log(`-----------------------------------------------`);
    }
    catch (err) {
        console.error('❌ Erreur lors de l\'initialisation :', err);
        console.log(`-----------------------------------------------`);
    }
}));
