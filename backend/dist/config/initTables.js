"use strict";
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
exports.initTables = void 0;
const db_1 = __importDefault(require("./db"));
const dossierController_1 = require("../controllers/dossierController");
/**
 * Initialise les nouvelles tables normalisées au démarrage.
 * Compatible avec le schéma existant (anciennes colonnes conservées).
 */
const initTables = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔧 Initialisation des tables...');
        // ================================================================
        // TABLE associations
        // ================================================================
        yield db_1.default.query(`
      CREATE TABLE IF NOT EXISTS associations (
        id            SERIAL PRIMARY KEY,
        nom           VARCHAR(255) NOT NULL,
        siege         TEXT NOT NULL DEFAULT '',
        district      VARCHAR(255) NOT NULL DEFAULT '',
        president     VARCHAR(255) NOT NULL DEFAULT '',
        abreviation   VARCHAR(100) NOT NULL DEFAULT '',
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(nom, district)
      );
    `);
        // ================================================================
        // TABLE categories
        // ================================================================
        yield db_1.default.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id   SERIAL PRIMARY KEY,
        nom  VARCHAR(100) NOT NULL UNIQUE
      );
    `);
        // Catégories par défaut (insérées une seule fois)
        yield db_1.default.query(`
      INSERT INTO categories (nom)
      SELECT unnest(ARRAY['Sport', 'Santé', 'Éducation', 'Culture', 'Social', 'Environnement', 'Autre'])
      WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);
    `);
        // ================================================================
        // TABLE dossier_categories (pivot)
        // ================================================================
        yield db_1.default.query(`
      CREATE TABLE IF NOT EXISTS dossier_categories (
        dossier_id   INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        PRIMARY KEY (dossier_id, categorie_id)
      );
    `);
        // ================================================================
        // TABLE sorties (traçabilité des sorties)
        // ================================================================
        yield db_1.default.query(`
      CREATE TABLE IF NOT EXISTS sorties (
        id             SERIAL PRIMARY KEY,
        dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        numero_sortie  VARCHAR(255) NOT NULL DEFAULT '',
        personne_sortie VARCHAR(255) NOT NULL DEFAULT '',
        motif          TEXT NOT NULL DEFAULT '',
        date_sortie    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // ================================================================
        // TABLE annuaire_entries (relie dossier → groupe annuaire)
        // ================================================================
        yield db_1.default.query(`
      CREATE TABLE IF NOT EXISTS annuaire_entries (
        id             SERIAL PRIMARY KEY,
        dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        groupe_id      INTEGER NOT NULL REFERENCES annuaire_groupes(id) ON DELETE CASCADE,
        date_archivage TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(dossier_id)
      );
    `);
        // ================================================================
        // Colonnes manquantes dans dossiers
        // ================================================================
        const addCol = (table, col, def) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield db_1.default.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
                console.log(`   + ${table}.${col}`);
            }
            catch (err) {
                if (err.code !== '42701')
                    throw err; // 42701 = already exists
            }
        });
        yield addCol('dossiers', 'association_id', 'INTEGER REFERENCES associations(id)');
        // anciennes colonnes déjà existantes - on garde la compatibilité
        // ================================================================
        // INDEX (CREATE INDEX IF NOT EXISTS n'existe pas, on utilise un test)
        // ================================================================
        const addIndex = (name, table, cols) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // Vérifier si l'index existe déjà
                const exists = yield db_1.default.query("SELECT 1 FROM pg_indexes WHERE indexname = $1", [name]);
                if (exists.rows.length === 0) {
                    yield db_1.default.query(`CREATE INDEX ${name} ON ${table} (${cols})`);
                    console.log(`   + index ${name}`);
                }
            }
            catch (err) {
                console.warn(`   ⚠️ index ${name}: ${err}`);
            }
        });
        yield addIndex('idx_dossiers_status', 'dossiers', 'status');
        yield addIndex('idx_dossiers_association', 'dossiers', 'association_id');
        yield addIndex('idx_dossiers_date_depot', 'dossiers', 'date_depot');
        yield addIndex('idx_dossiers_num_chrono', 'dossiers', 'num_chrono');
        yield addIndex('idx_dossier_categories_cat', 'dossier_categories', 'categorie_id');
        yield addIndex('idx_sorties_dossier', 'sorties', 'dossier_id');
        yield addIndex('idx_sorties_date', 'sorties', 'date_sortie');
        yield addIndex('idx_annuaire_entries_groupe', 'annuaire_entries', 'groupe_id');
        // ================================================================
        // TABLES EXISTANTES (gardées pour compatibilité)
        // ================================================================
        yield db_1.default.query(`
      CREATE TABLE IF NOT EXISTS annuaire_groupes (
        id SERIAL PRIMARY KEY,
        periode VARCHAR(255) UNIQUE,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        yield db_1.default.query(`
      CREATE TABLE IF NOT EXISTS historique_arrivee_groupes (
        id SERIAL PRIMARY KEY,
        periode VARCHAR(255) UNIQUE,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Ajout de dossier_id dans les historiques si pas déjà fait
        yield addCol('historique_arrivee', 'dossier_id', 'INTEGER REFERENCES dossiers(id) ON DELETE CASCADE');
        yield addCol('historique_defavorable', 'dossier_id', 'INTEGER REFERENCES dossiers(id) ON DELETE CASCADE');
        yield addIndex('idx_histo_arrivee_dossier', 'historique_arrivee', 'dossier_id');
        yield addIndex('idx_histo_defavorable_dossier', 'historique_defavorable', 'dossier_id');
        // Tables existantes (inchangées)
        yield db_1.default.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'agent',
        actif BOOLEAN DEFAULT true,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Initialiser le DOSSIER_SELECT (détecte si association_id existe)
        yield (0, dossierController_1.initDossierSelect)();
        console.log('✅ Tables initialisées avec succès!');
    }
    catch (err) {
        console.error('❌ Erreur lors de l\'initialisation des tables:', err);
    }
});
exports.initTables = initTables;
