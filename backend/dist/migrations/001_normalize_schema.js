"use strict";
/**
 * Migration 001 — Normalisation du schéma
 *
 * Transforme les tables actuelles (avec données dupliquées) vers le nouveau schéma
 * normalisé : associations, categories, dossier_categories, sorties.
 *
 * Exécution : npx ts-node src/migrations/001_normalize_schema.ts
 * Rollback   : impossible une fois les anciennes tables supprimées (faire un pg_dump avant)
 */
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
const db_1 = __importDefault(require("../config/db"));
function migrate() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield db_1.default.connect();
        try {
            console.log('🚀 Début de la migration 001 — Normalisation du schéma');
            console.log('');
            yield client.query('BEGIN');
            // ================================================================
            // ÉTAPE 1 : Création de la table associations
            // ================================================================
            console.log('📋 Étape 1 : Création de la table associations...');
            yield client.query(`
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
            // ÉTAPE 2 : Extraction des associations depuis toutes les tables
            // ================================================================
            console.log('📋 Étape 2 : Extraction des associations...');
            yield client.query(`
      INSERT INTO associations (nom, siege, district, president, abreviation)
      SELECT DISTINCT
        COALESCE(NULLIF(TRIM(nom_association), ''), 'INCONNU'),
        COALESCE(NULLIF(TRIM(siege), ''), ''),
        COALESCE(NULLIF(TRIM(district), ''), ''),
        COALESCE(NULLIF(TRIM(president), ''), ''),
        COALESCE(NULLIF(TRIM(abreviation), ''), '')
      FROM (
        SELECT TRIM(nom_association) AS nom_association, TRIM(siege) AS siege,
               TRIM(district) AS district, TRIM(president) AS president,
               TRIM(abreviation) AS abreviation FROM dossiers
        UNION
        SELECT TRIM(nom_association), TRIM(siege), TRIM(district), TRIM(president), TRIM(abreviation) FROM annuaire
        UNION
        SELECT TRIM(nom_association), TRIM(siege), TRIM(district), TRIM(president), '' FROM historique_arrivee
        UNION
        SELECT TRIM(nom_association), TRIM(siege), TRIM(district), TRIM(president), '' FROM historique_defavorable
      ) AS all_entries
      WHERE COALESCE(NULLIF(nom_association, ''), '') != ''
      ON CONFLICT (nom, district) DO NOTHING;
    `);
            const assocCount = yield client.query('SELECT COUNT(*) FROM associations');
            console.log(`   → ${assocCount.rows[0].count} associations créées`);
            yield client.query('CREATE INDEX IF NOT EXISTS idx_assoc_lookup ON associations (nom, district)');
            // ================================================================
            // ÉTAPE 3 : Création de la table categories
            // ================================================================
            console.log('📋 Étape 3 : Création de la table categories...');
            yield client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id   SERIAL PRIMARY KEY,
        nom  VARCHAR(100) NOT NULL UNIQUE
      );
    `);
            yield client.query(`
      INSERT INTO categories (nom)
      SELECT unnest(ARRAY['Sport', 'Santé', 'Éducation', 'Culture', 'Social', 'Environnement', 'Autre'])
      WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);
    `);
            // Extraire catégories existantes depuis le CSV
            console.log('   → Extraction des catégories depuis les données CSV...');
            yield client.query(`
      INSERT INTO categories (nom)
      SELECT DISTINCT TRIM(unnest(string_to_array(categorie, ',')))
      FROM (
        SELECT categorie FROM dossiers WHERE categorie IS NOT NULL AND categorie != ''
        UNION
        SELECT categorie FROM annuaire WHERE categorie IS NOT NULL AND categorie != ''
        UNION
        SELECT categorie FROM historique_arrivee WHERE categorie IS NOT NULL AND categorie != ''
        UNION
        SELECT categorie FROM historique_defavorable WHERE categorie IS NOT NULL AND categorie != ''
      ) AS all_cats
      WHERE TRIM(unnest(string_to_array(categorie, ','))) != ''
      ON CONFLICT (nom) DO NOTHING;
    `);
            const catCount = yield client.query('SELECT COUNT(*) FROM categories');
            console.log(`   → ${catCount.rows[0].count} catégories trouvées`);
            // ================================================================
            // ÉTAPE 4 : Ajout de association_id dans dossiers
            // ================================================================
            console.log('📋 Étape 4 : Ajout de association_id dans dossiers...');
            try {
                yield client.query('ALTER TABLE dossiers ADD COLUMN association_id INTEGER');
                console.log('   → Colonne association_id ajoutée');
            }
            catch (err) {
                if (err.code === '42701')
                    console.log('   → association_id existe déjà');
                else
                    throw err;
            }
            yield client.query(`
      UPDATE dossiers d
      SET association_id = a.id
      FROM associations a
      WHERE a.nom = COALESCE(NULLIF(TRIM(d.nom_association), ''), 'INCONNU')
        AND a.district = COALESCE(NULLIF(TRIM(d.district), ''), '');
    `);
            const missingAssoc = yield client.query('SELECT COUNT(*) FROM dossiers WHERE association_id IS NULL');
            if (parseInt(missingAssoc.rows[0].count) > 0) {
                console.warn(`   ⚠️ ${missingAssoc.rows[0].count} dossiers sans association (seront reliés à une association "INCONNU")`);
                yield client.query(`
        UPDATE dossiers SET association_id = (SELECT id FROM associations WHERE nom = 'INCONNU' AND district = '' LIMIT 1)
        WHERE association_id IS NULL;
      `);
            }
            // ================================================================
            // ÉTAPE 5 : Création de la table dossier_categories (pivot)
            // ================================================================
            console.log('📋 Étape 5 : Création de la table dossier_categories...');
            yield client.query(`
      CREATE TABLE IF NOT EXISTS dossier_categories (
        dossier_id   INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        PRIMARY KEY (dossier_id, categorie_id)
      );
    `);
            // Remplir la pivot depuis les catégories CSV des dossiers
            console.log('   → Migration des catégories dossier...');
            yield client.query(`
      INSERT INTO dossier_categories (dossier_id, categorie_id)
      SELECT d.id, c.id
      FROM dossiers d
      JOIN LATERAL (SELECT TRIM(unnest(string_to_array(d.categorie, ','))) AS cat_name) AS cats ON true
      JOIN categories c ON c.nom = cats.cat_name
      WHERE cats.cat_name != ''
      ON CONFLICT DO NOTHING;
    `);
            // ================================================================
            // ÉTAPE 6 : Ajout de dossier_id dans historique_arrivee + nettoyage
            // ================================================================
            console.log('📋 Étape 6 : Ajout de dossier_id dans historique_arrivee...');
            try {
                yield client.query('ALTER TABLE historique_arrivee ADD COLUMN dossier_id INTEGER REFERENCES dossiers(id) ON DELETE CASCADE');
                console.log('   → Colonne dossier_id ajoutée');
            }
            catch (err) {
                if (err.code === '42701')
                    console.log('   → dossier_id existe déjà');
                else
                    throw err;
            }
            yield client.query(`
      UPDATE historique_arrivee ha
      SET dossier_id = d.id
      FROM dossiers d
      WHERE d.num_chrono = ha.num_chrono;
    `);
            // ================================================================
            // ÉTAPE 7 : Ajout de dossier_id dans historique_defavorable
            // ================================================================
            console.log('📋 Étape 7 : Ajout de dossier_id dans historique_defavorable...');
            try {
                yield client.query('ALTER TABLE historique_defavorable ADD COLUMN dossier_id INTEGER REFERENCES dossiers(id) ON DELETE CASCADE');
                console.log('   → Colonne dossier_id ajoutée');
            }
            catch (err) {
                if (err.code === '42701')
                    console.log('   → dossier_id existe déjà');
                else
                    throw err;
            }
            yield client.query(`
      UPDATE historique_defavorable hd
      SET dossier_id = d.id
      FROM dossiers d
      WHERE d.num_chrono = hd.num_chrono;
    `);
            // ================================================================
            // ÉTAPE 8 : Création de la table sorties
            // ================================================================
            console.log('📋 Étape 8 : Création de la table sorties...');
            yield client.query(`
      CREATE TABLE IF NOT EXISTS sorties (
        id             SERIAL PRIMARY KEY,
        dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        numero_sortie  VARCHAR(255) NOT NULL DEFAULT '',
        personne_sortie VARCHAR(255) NOT NULL DEFAULT '',
        motif          TEXT NOT NULL DEFAULT '',
        date_sortie    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
            // Migrer les sorties existantes depuis dossiers
            console.log('   → Migration des données de sortie existantes...');
            yield client.query(`
      INSERT INTO sorties (dossier_id, numero_sortie, personne_sortie, motif, date_sortie)
      SELECT id,
        COALESCE(numero_sortie, ''),
        COALESCE(personne_sortie, ''),
        'Migration depuis historique_sortie',
        date_modification
      FROM dossiers
      WHERE status IN ('historique_sortie', 'registre_chrono', 'annuaire', 'archive_annuaire')
        AND (COALESCE(numero_sortie, '') != '' OR COALESCE(personne_sortie, '') != '');
    `);
            // ================================================================
            // ÉTAPE 9 : Création de annuaire_entries
            // ================================================================
            console.log('📋 Étape 9 : Création de annuaire_entries...');
            yield client.query(`
      CREATE TABLE IF NOT EXISTS annuaire_entries (
        id             SERIAL PRIMARY KEY,
        dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        groupe_id      INTEGER NOT NULL REFERENCES annuaire_groupes(id) ON DELETE CASCADE,
        date_archivage TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(dossier_id)
      );
    `);
            // Migrer depuis annuaire (qui a nom_association/siege etc)
            // On doit joiner sur num_chrono pour trouver le dossier_id
            console.log('   → Migration des entrées annuaire...');
            yield client.query(`
      INSERT INTO annuaire_entries (dossier_id, groupe_id, date_archivage)
      SELECT DISTINCT d.id, a.groupe_id, a.date_creation
      FROM annuaire a
      JOIN dossiers d ON d.num_chrono = a.num_chrono
      WHERE d.id IS NOT NULL
      ON CONFLICT (dossier_id) DO NOTHING;
    `);
            // ================================================================
            // ÉTAPE 10 : Ajout des index
            // ================================================================
            console.log('📋 Étape 10 : Ajout des index de performance...');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_dossiers_status ON dossiers(status)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_dossiers_association ON dossiers(association_id)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_dossiers_date_depot ON dossiers(date_depot)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_dossiers_num_chrono ON dossiers(num_chrono)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_dossier_categories_cat ON dossier_categories(categorie_id)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_histo_arrivee_dossier ON historique_arrivee(dossier_id)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_histo_defavorable_dossier ON historique_defavorable(dossier_id)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_sorties_dossier ON sorties(dossier_id)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_sorties_date ON sorties(date_sortie)');
            yield client.query('CREATE INDEX IF NOT EXISTS idx_annuaire_entries_groupe ON annuaire_entries(groupe_id)');
            console.log('   → 10 index créés');
            // ================================================================
            // ÉTAPE 11 : Nettoyage des colonnes devenues redondantes
            // Note : on ne supprime PAS les anciennes colonnes pour éviter de casser
            // le code qui lit encore l'ancien format. On les marque comme "à supprimer
            // après avoir mis à jour le code".
            // ================================================================
            console.log('📋 Étape 11 : Marquer les colonnes obsolètes (conservées pour compatibilité temporaire)');
            console.log('   → Les colonnes nom_association, siege, district, president, abreviation, categorie');
            console.log('     sont conservées dans dossiers jusqu\'à ce que le code soit mis à jour.');
            console.log('   → Les tables annuaire, historique_arrivee, historique_defavorable gardent');
            console.log('     leurs colonnes d\'origine (inchangées).');
            yield client.query('COMMIT');
            console.log('');
            console.log('✅ Migration 001 terminée avec succès !');
            console.log('');
            console.log('📌 Prochaines étapes :');
            console.log('   1. Mettre à jour le code backend (controllers)');
            console.log('   2. Mettre à jour les types frontend');
            console.log('   3. Une fois le code mis à jour, exécuter cleanup.sql');
            console.log('      pour supprimer les colonnes redondantes');
        }
        catch (err) {
            yield client.query('ROLLBACK');
            console.error('❌ Migration échouée :', err);
            process.exit(1);
        }
        finally {
            client.release();
            yield db_1.default.end();
        }
    });
}
migrate();
