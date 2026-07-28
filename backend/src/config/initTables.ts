import pool from './db';
import { initDossierSelect } from '../controllers/dossierController';

/**
 * Initialise TOUTES les tables au démarrage.
 * Version avec historiques métier (arrivée, défavorable) et index optimisés pour la consultation.
 * Toutes les migrations sont automatisées sans intervention manuelle.
 *
 * ORDRE CRITIQUE : les migrations (ALTER TABLE, UPDATE) doivent se faire
 * AVANT la création du trigger d'audit, sinon elles polluent audit_log
 * avec des entrées "—" (colonnes techniques, user_id=NULL).
 */
export const initTables = async () => {
  try {
    console.log('🔧 Initialisation des tables (avec audit log)...');

    // ================================================================
    // TYPES ENUM
    // ================================================================
    try {
      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE dossier_status AS ENUM (
            'reception', 'en_attente', 'en_cours', 'defavorable',
            'defavorable_traite', 'livraison', 'registre_chrono',
            'annuaire', 'archive_annuaire', 'archive_arrivee',
            'historique_sortie', 'historique_arrivee',
            'historique_defavorable', 'duplicata'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      console.log('   ✓ type ENUM dossier_status');

      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE verdict_type AS ENUM ('aucun', 'favorable', 'defavorable');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      console.log('   ✓ type ENUM verdict_type');

      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE type_dossier_enum AS ENUM (
            'Création', 'Renouvellement', 'Duplicata', 'Arrêté'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      console.log('   ✓ type ENUM type_dossier_enum');
    } catch (err: any) {
      console.warn('   ⚠️ Création des ENUM :', err.message);
    }

    // ================================================================
    // 1. utilisateurs
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(50) DEFAULT 'agent',
        actif         BOOLEAN DEFAULT true,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ================================================================
    // 2. districts (table normalisée)
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS districts (
        id   SERIAL PRIMARY KEY,
        nom  VARCHAR(255) NOT NULL UNIQUE
      );
    `);

    // ================================================================
    // 3. associations (table normalisée)
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS associations (
        id            SERIAL PRIMARY KEY,
        nom           VARCHAR(255) NOT NULL,
        siege         TEXT NOT NULL DEFAULT '',
        district      VARCHAR(255) NOT NULL DEFAULT '',
        district_id   INTEGER REFERENCES districts(id) ON DELETE SET NULL,
        president     VARCHAR(255) NOT NULL DEFAULT '',
        abreviation   VARCHAR(100) NOT NULL DEFAULT '',
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(nom, district)
      );
    `);

    // ================================================================
    // 4. categories (table normalisée)
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id  SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE
      );
    `);

    await pool.query(`
      INSERT INTO categories (nom)
      SELECT unnest(ARRAY['Sport', 'Santé', 'Éducation', 'Culture', 'Social', 'Environnement', 'Autre'])
      WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);
    `);

    // ================================================================
    // 5. sous_types (table normalisée)
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sous_types (
        id   SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        label VARCHAR(100) NOT NULL DEFAULT '',
        type_dossier_parent VARCHAR(50) NOT NULL DEFAULT ''
      );
    `);
    await pool.query(`
      INSERT INTO sous_types (code, label, type_dossier_parent)
      SELECT * FROM (VALUES
        ('duplicata_pur', 'Duplicata pur', 'Duplicata'),
        ('renouvellement_normal', 'Renouvellement normal', 'Renouvellement'),
        ('arret_creation', 'Arrêté création', 'Arrêté'),
        ('arret_renouvellement', 'Arrêté renouvellement', 'Arrêté')
      ) AS v(code, label, type_dossier_parent)
      WHERE NOT EXISTS (SELECT 1 FROM sous_types LIMIT 1);
    `);

    // ================================================================
    // 6. dossiers (TABLE PRINCIPALE)
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dossiers (
        id               SERIAL PRIMARY KEY,
        num_chrono       VARCHAR(255) DEFAULT '',
        nom_association  VARCHAR(255) NOT NULL DEFAULT '',
        siege            TEXT NOT NULL DEFAULT '',
        district         VARCHAR(255) DEFAULT '',
        president        VARCHAR(255) NOT NULL DEFAULT '',
        abreviation      VARCHAR(100) NOT NULL DEFAULT '',
        type_dossier     type_dossier_enum,
        sous_type        VARCHAR(50) DEFAULT '',
        sous_type_id     INTEGER REFERENCES sous_types(id) ON DELETE SET NULL,
        emplacement      VARCHAR(255) DEFAULT '',
        objet            TEXT DEFAULT '',
        arn              VARCHAR(255) DEFAULT '',
        recu_fr          VARCHAR(255) DEFAULT '',
        recu_mg          VARCHAR(255) DEFAULT '',
        heure_depot      TIME DEFAULT '00:00:00',
        date_depot       DATE NOT NULL DEFAULT CURRENT_DATE,
        status           dossier_status DEFAULT 'reception',
        verdict          verdict_type DEFAULT 'aucun',
        association_id   INTEGER REFERENCES associations(id) ON DELETE SET NULL,
        created_by       INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
        district_id      INTEGER REFERENCES districts(id) ON DELETE SET NULL,
        date_creation    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ================================================================
    // 7. annuaire_groupes
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS annuaire_groupes (
        id            SERIAL PRIMARY KEY,
        periode       VARCHAR(255) UNIQUE,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ================================================================
    // 8. historique_arrivee_groupes (avec contrainte UNIQUE)
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historique_arrivee_groupes (
        id            SERIAL PRIMARY KEY,
        periode       VARCHAR(255) UNIQUE,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      const check = await pool.query(`
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_historique_arrivee_groupes_periode'
          AND conrelid = 'historique_arrivee_groupes'::regclass
      `);
      if (check.rows.length === 0) {
        await pool.query(`
          ALTER TABLE historique_arrivee_groupes 
          ADD CONSTRAINT unique_historique_arrivee_groupes_periode 
          UNIQUE (periode)
        `);
        console.log('   ✅ contrainte UNIQUE ajoutée sur historique_arrivee_groupes.periode');
      }
    } catch (err: any) {
      console.warn('   ⚠️ contrainte UNIQUE sur historique_arrivee_groupes:', err.message);
    }

    // ================================================================
    // 9. annuaire_entries
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS annuaire_entries (
        id             SERIAL PRIMARY KEY,
        dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        groupe_id      INTEGER NOT NULL REFERENCES annuaire_groupes(id) ON DELETE CASCADE,
        date_archivage TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(dossier_id)
      );
    `);

    // ================================================================
    // 10. sorties
    // ================================================================
    await pool.query(`
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
    // 11. dossier_categories (table pivot N:N)
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dossier_categories (
        dossier_id   INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
        categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        PRIMARY KEY (dossier_id, categorie_id)
      );
    `);

    // ================================================================
    // 12. historique_arrivee
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historique_arrivee (
        id              SERIAL PRIMARY KEY,
        groupe_id       INTEGER REFERENCES historique_arrivee_groupes(id) ON DELETE CASCADE,
        dossier_id      INTEGER REFERENCES dossiers(id) ON DELETE CASCADE,
        num_chrono      VARCHAR(255) DEFAULT '',
        nom_association VARCHAR(255) NOT NULL DEFAULT '',
        siege           TEXT NOT NULL DEFAULT '',
        district        VARCHAR(255) DEFAULT '',
        president       VARCHAR(255) NOT NULL DEFAULT '',
        abreviation     VARCHAR(100) NOT NULL DEFAULT '',
        type_dossier    type_dossier_enum,
        date_arrivee    DATE,
        heure_depot     TIME DEFAULT '00:00:00',
        date_creation   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ================================================================
    // 13. historique_defavorable
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historique_defavorable (
        id                 SERIAL PRIMARY KEY,
        dossier_id         INTEGER REFERENCES dossiers(id) ON DELETE CASCADE,
        num_chrono         VARCHAR(255) DEFAULT '',
        nom_association    VARCHAR(255) NOT NULL DEFAULT '',
        siege              TEXT NOT NULL DEFAULT '',
        district           VARCHAR(255) DEFAULT '',
        president          VARCHAR(255) NOT NULL DEFAULT '',
        abreviation        VARCHAR(100) NOT NULL DEFAULT '',
        type_dossier       type_dossier_enum,
        date_arrivee       DATE,
        heure_depot        TIME DEFAULT '00:00:00',
        personne_correction VARCHAR(255) DEFAULT 'Agent',
        date_prise         DATE,
        heure_prise        TIME DEFAULT '00:00:00',
        date_creation      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ================================================================
    // 14. audit_log (avec colonnes dénormalisées pour l'affichage)
    // ================================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id              SERIAL PRIMARY KEY,
        table_name      VARCHAR(100) NOT NULL,
        record_id       INTEGER NOT NULL,
        action          VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
        old_data        JSONB,
        new_data        JSONB,
        user_id         INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS num_chrono VARCHAR(255);`);
    await pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS nom_association VARCHAR(255);`);

    // ── Colonnes enrichies pour l'affichage enrichi ──
    await pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS type_dossier VARCHAR(50) DEFAULT '';`);
    await pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS verdict VARCHAR(20) DEFAULT '';`);
    await pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS status_dossier VARCHAR(30) DEFAULT '';`);
    console.log('   ✓ colonnes enrichies ajoutées à audit_log');

    console.log('   ✓ table audit_log créée/mise à jour');

    // ================================================================
    // INDEX pour audit_log
    // ================================================================
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_nom ON audit_log(nom_association);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_num ON audit_log(num_chrono);`);
    console.log('   + index audit_log');

    // ================================================================
    // FONCTION TRIGGER (date_modification) — nécessaire AVANT les triggers
    // ================================================================
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION set_date_modification()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.date_modification = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      console.log('   ✓ function set_date_modification()');
    } catch (err: any) {
      console.warn('   ⚠️ function set_date_modification:', err.message);
    }

    // ================================================================
    // TRIGGERS date_modification (avant les migrations pour les UPDATE)
    // ================================================================
    const createModifTrigger = async (triggerName: string, tableName: string) => {
      try {
        await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName}`);
        await pool.query(`
          CREATE TRIGGER ${triggerName}
            BEFORE UPDATE ON ${tableName}
            FOR EACH ROW
            EXECUTE FUNCTION set_date_modification()
        `);
        console.log(`   ✓ trigger ${triggerName}`);
      } catch (err: any) {
        console.warn(`   ⚠️ trigger ${triggerName}:`, err.message);
      }
    };
    await createModifTrigger('trg_dossiers_modification', 'dossiers');
    await createModifTrigger('trg_histo_arrivee_modification', 'historique_arrivee');
    await createModifTrigger('trg_histo_defavorable_modification', 'historique_defavorable');

    // ================================================================
    // MIGRATIONS AUTOMATISÉES (AVANT le trigger d'audit)
    // ================================================================

    // 1. date_depot NOT NULL
    try {
      await pool.query(`UPDATE dossiers SET date_depot = CURRENT_DATE WHERE date_depot IS NULL`);
      await pool.query(`ALTER TABLE dossiers ALTER COLUMN date_depot SET NOT NULL`);
      console.log('   → migration: dossiers.date_depot NOT NULL');
    } catch (err: any) {
      if (!err.message?.includes('already exists')) console.warn('   ⚠️ migration dossiers.date_depot NOT NULL:', err.message);
    }

    // 2. Supprimer les anciennes contraintes CHECK
    try {
      await pool.query(`ALTER TABLE dossiers DROP CONSTRAINT IF EXISTS chk_dossiers_status`);
      await pool.query(`ALTER TABLE dossiers DROP CONSTRAINT IF EXISTS chk_dossiers_verdict`);
      console.log('   → anciennes contraintes CHECK supprimées');
    } catch (err: any) {
      console.warn('   ⚠️ suppression des contraintes CHECK :', err.message);
    }

    // 3. Conversion ENUM (si besoin)
    try {
      const check = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'dossiers' 
          AND column_name = 'status'
          AND data_type = 'character varying'
      `);
      if (check.rows.length > 0) {
        console.log('   → migration: conversion des statuts vers ENUM...');
        await pool.query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS status_enum dossier_status`);
        await pool.query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS verdict_enum verdict_type`);
        await pool.query(`UPDATE dossiers SET status_enum = status::dossier_status, verdict_enum = verdict::verdict_type WHERE status IS NOT NULL`);
        await pool.query(`ALTER TABLE dossiers DROP COLUMN IF EXISTS status CASCADE, DROP COLUMN IF EXISTS verdict CASCADE`);
        await pool.query(`ALTER TABLE dossiers ADD COLUMN status dossier_status DEFAULT 'reception', ADD COLUMN verdict verdict_type DEFAULT 'aucun'`);
        await pool.query(`UPDATE dossiers SET status = status_enum, verdict = verdict_enum WHERE status_enum IS NOT NULL`);
        await pool.query(`ALTER TABLE dossiers DROP COLUMN IF EXISTS status_enum, DROP COLUMN IF EXISTS verdict_enum`);
        console.log('   ✅ Migration ENUM terminée');
      } else {
        console.log('   → Les colonnes sont déjà en ENUM');
      }
    } catch (err: any) {
      console.warn('   ⚠️ Migration ENUM :', err.message);
    }

    // 4. Contrainte UNIQUE sur num_chrono
    try {
      await pool.query(`ALTER TABLE dossiers DROP CONSTRAINT IF EXISTS dossiers_num_chrono_unique`);
      await pool.query(`DELETE FROM dossiers a USING dossiers b WHERE a.id > b.id AND a.num_chrono = b.num_chrono AND a.num_chrono != ''`);
      await pool.query(`ALTER TABLE dossiers ADD CONSTRAINT dossiers_num_chrono_unique UNIQUE (num_chrono)`);
      console.log('   → contrainte UNIQUE sur dossiers.num_chrono');
    } catch (err: any) {
      if (err.constraint === 'dossiers_num_chrono_unique') {
        console.log('   → contrainte UNIQUE déjà présente sur dossiers.num_chrono');
      } else {
        console.warn('   ⚠️ contrainte UNIQUE dossiers.num_chrono:', err.message);
      }
    }

    // 5. Normalisation des districts
    try {
      const colCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'district_id'`);
      if (colCheck.rows.length === 0) {
        await pool.query(`ALTER TABLE dossiers ADD COLUMN district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL`);
        console.log('   → colonne district_id ajoutée à dossiers');
      }
      await pool.query(`INSERT INTO districts (nom) SELECT DISTINCT district FROM dossiers WHERE district IS NOT NULL AND district != '' ON CONFLICT (nom) DO NOTHING`);
      await pool.query(`UPDATE dossiers d SET district_id = dist.id FROM districts dist WHERE d.district = dist.nom AND d.district_id IS NULL`);
      console.log('   → districts normalisés');
    } catch (err: any) {
      console.warn('   ⚠️ migration districts:', err.message);
    }

    // 6. Colonnes supplémentaires (compatibilité)
    try {
      await pool.query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL`);
      console.log('   → migration: dossiers.created_by');
    } catch (err: any) { if (!err.message?.includes('already exists')) console.warn('   ⚠️ migration dossiers.created_by:', err.message); }

    try {
      await pool.query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS sous_type_id INTEGER REFERENCES sous_types(id) ON DELETE SET NULL`);
      console.log('   → migration: dossiers.sous_type_id');
    } catch (err: any) { if (!err.message?.includes('already exists')) console.warn('   ⚠️ migration dossiers.sous_type_id:', err.message); }

    try {
      await pool.query(`UPDATE dossiers d SET sous_type_id = st.id FROM sous_types st WHERE d.sous_type = st.code AND d.sous_type_id IS NULL AND d.sous_type != ''`);
      console.log('   → migration: sous_type_id peuplé depuis sous_type texte');
    } catch (err: any) { console.warn('   ⚠️ migration sous_type_id seed:', err.message); }

    try {
      await pool.query(`ALTER TABLE associations ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL`);
      console.log('   → migration: associations.district_id');
    } catch (err: any) { if (!err.message?.includes('already exists')) console.warn('   ⚠️ migration associations.district_id:', err.message); }

    // 7. Migrations pour les historiques
    try {
      await pool.query(`ALTER TABLE historique_arrivee ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      await pool.query(`ALTER TABLE historique_arrivee ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      await pool.query(`ALTER TABLE historique_arrivee ADD COLUMN IF NOT EXISTS abreviation VARCHAR(100) DEFAULT ''`);
      await pool.query(`ALTER TABLE historique_arrivee ALTER COLUMN type_dossier TYPE type_dossier_enum USING type_dossier::type_dossier_enum`);
      console.log('   → migration: historique_arrivee enrichie');
    } catch (err: any) { if (!err.message?.includes('already exists')) console.warn('   ⚠️', err.message); }

    try {
      await pool.query(`ALTER TABLE historique_defavorable ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      await pool.query(`ALTER TABLE historique_defavorable ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      await pool.query(`ALTER TABLE historique_defavorable ADD COLUMN IF NOT EXISTS abreviation VARCHAR(100) DEFAULT ''`);
      await pool.query(`ALTER TABLE historique_defavorable ALTER COLUMN type_dossier TYPE type_dossier_enum USING type_dossier::type_dossier_enum`);
      console.log('   → migration: historique_defavorable enrichie');
    } catch (err: any) { if (!err.message?.includes('already exists')) console.warn('   ⚠️', err.message); }

    // 8. Nettoyage des colonnes redondantes
    try {
      await pool.query(`ALTER TABLE dossiers DROP COLUMN IF EXISTS categorie`);
      await pool.query(`ALTER TABLE dossiers DROP COLUMN IF EXISTS numero_sortie`);
      await pool.query(`ALTER TABLE dossiers DROP COLUMN IF EXISTS personne_sortie`);
      await pool.query(`ALTER TABLE historique_arrivee DROP COLUMN IF EXISTS categorie`);
      await pool.query(`ALTER TABLE historique_defavorable DROP COLUMN IF EXISTS categorie`);
      console.log('   → colonnes redondantes supprimées');
    } catch (err: any) { console.warn('   ⚠️ nettoyage colonnes:', err.message); }

    // ================================================================
    // MIGRATIONS AUDIT : Nettoyage des éventuels logs parasites existants
    // (cela gère le cas où des logs parasites existent d'un démmarrage précédent)
    // ================================================================
    const migrateAuditNulls = await pool.query(`
      UPDATE audit_log al
      SET 
        num_chrono = CASE
          WHEN al.table_name = 'dossiers' THEN COALESCE(
            (SELECT COALESCE(d.num_chrono, '') FROM dossiers d WHERE d.id = al.record_id),
            ''
          )
          WHEN al.table_name = 'annuaire_entries' THEN COALESCE(
            (SELECT COALESCE(d.num_chrono, '') FROM dossiers d 
             JOIN annuaire_entries ae ON ae.dossier_id = d.id WHERE ae.id = al.record_id),
            ''
          )
          ELSE ''
        END,
        nom_association = CASE
          WHEN al.table_name = 'dossiers' THEN COALESCE(
            (SELECT COALESCE(d.nom_association, '') FROM dossiers d WHERE d.id = al.record_id),
            ''
          )
          WHEN al.table_name = 'annuaire_entries' THEN COALESCE(
            (SELECT COALESCE(d.nom_association, '') FROM dossiers d 
             JOIN annuaire_entries ae ON ae.dossier_id = d.id WHERE ae.id = al.record_id),
            ''
          )
          ELSE ''
        END
      WHERE al.num_chrono IS NULL OR al.nom_association IS NULL
    `);
    if (migrateAuditNulls.rowCount && migrateAuditNulls.rowCount > 0) {
      console.log(`   → migration: ${migrateAuditNulls.rowCount} ligne(s) NULL remplies dans audit_log`);
    }

    // ── Migration : remplir les nouvelles colonnes enrichies pour les logs existants ──
    const migrateAuditEnrich = await pool.query(`
      UPDATE audit_log al
      SET
        type_dossier = CASE
          WHEN al.table_name = 'dossiers' AND al.new_data IS NOT NULL THEN COALESCE(al.new_data->>'type_dossier', '')
          WHEN al.table_name = 'dossiers' AND al.old_data IS NOT NULL THEN COALESCE(al.old_data->>'type_dossier', '')
          ELSE ''
        END,
        verdict = CASE
          WHEN al.table_name = 'dossiers' AND al.new_data IS NOT NULL THEN COALESCE(al.new_data->>'verdict', '')
          WHEN al.table_name = 'dossiers' AND al.old_data IS NOT NULL THEN COALESCE(al.old_data->>'verdict', '')
          ELSE ''
        END,
        status_dossier = CASE
          WHEN al.table_name = 'dossiers' AND al.new_data IS NOT NULL THEN COALESCE(al.new_data->>'status', '')
          WHEN al.table_name = 'dossiers' AND al.old_data IS NOT NULL THEN COALESCE(al.old_data->>'status', '')
          ELSE ''
        END
      WHERE al.table_name = 'dossiers'
        AND (al.type_dossier IS NULL OR al.type_dossier = '')
    `);
    if (migrateAuditEnrich.rowCount && migrateAuditEnrich.rowCount > 0) {
      console.log(`   → migration: ${migrateAuditEnrich.rowCount} ligne(s) enrichies dans audit_log (type_dossier, verdict, status)`);
    }

    // NETTOYAGE : supprimer les logs des tables autres que dossiers + UPDATE techniques
    const cleanParasites = await pool.query(`
      DELETE FROM audit_log
      WHERE table_name IN ('associations', 'annuaire_entries')
         OR (table_name = 'dossiers' AND action = 'UPDATE'
             AND new_data->>'association_id' IS NOT NULL
             AND (to_jsonb(new_data) - 'association_id' - 'date_modification' - 'district_id' - 'created_by' - 'sous_type_id') =
                 (to_jsonb(old_data) - 'association_id' - 'date_modification' - 'district_id' - 'created_by' - 'sous_type_id'))
    `);
    if (cleanParasites.rowCount && cleanParasites.rowCount > 0) {
      console.log(`   → nettoyage: ${cleanParasites.rowCount} ligne(s) parasite(s) supprimée(s) de audit_log`);
    }

    // ================================================================
    // NETTOYAGE : supprimer l'ANCIEN trigger/fonction d'audit obsolète
    // (sans la gestion d'exception pour current_setting)
    // ================================================================
    try {
      await pool.query(`DROP TRIGGER IF EXISTS audit_trigger ON dossiers`);
      console.log('   → ancien trigger audit_trigger supprimé');
    } catch (err: any) {
      console.warn('   ⚠️ suppression ancien trigger audit_trigger:', err.message);
    }
    try {
      await pool.query(`DROP FUNCTION IF EXISTS audit_trigger() CASCADE`);
      console.log('   → ancienne fonction audit_trigger() supprimée');
    } catch (err: any) {
      console.warn('   ⚠️ suppression ancienne fonction audit_trigger:', err.message);
    }

    // ================================================================
    // CRÉATION DU TRIGGER D'AUDIT (APRÈS toutes les migrations)
    // ================================================================
    await pool.query(`
      CREATE OR REPLACE FUNCTION audit_trigger_function()
      RETURNS TRIGGER AS $$
      DECLARE
        v_user_id INTEGER;
      BEGIN
        -- N'AUDITER QUE LA TABLE dossiers
        IF TG_TABLE_NAME != 'dossiers' THEN
          RETURN NULL;
        END IF;

        -- Ignorer les UPDATE purement techniques (migrations, mise à jour relation)
        -- Colonnes considérées comme « techniques » : association_id, date_modification,
        -- district_id, created_by, sous_type_id. Si seules ces colonnes changent,
        -- l'UPDATE n'est pas un changement métier et ne doit pas être journalisé.
        IF TG_OP = 'UPDATE' THEN
          IF (to_jsonb(OLD) - 'association_id' - 'date_modification' - 'district_id' - 'created_by' - 'sous_type_id') =
             (to_jsonb(NEW) - 'association_id' - 'date_modification' - 'district_id' - 'created_by' - 'sous_type_id') THEN
            RETURN NULL;
          END IF;
        END IF;

        BEGIN
          v_user_id := current_setting('app.current_user_id')::INTEGER;
        EXCEPTION
          WHEN OTHERS THEN
            v_user_id := NULL;
        END;

        IF TG_OP = 'INSERT' THEN
          INSERT INTO audit_log(table_name, record_id, action, new_data, user_id,
            num_chrono, nom_association, type_dossier, verdict, status_dossier)
          VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), v_user_id,
            COALESCE(NEW.num_chrono, ''),
            COALESCE(NEW.nom_association, ''),
            COALESCE(NEW.type_dossier::text, ''),
            COALESCE(NEW.verdict::text, ''),
            COALESCE(NEW.status::text, ''));
        ELSIF TG_OP = 'UPDATE' THEN
          INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, user_id,
            num_chrono, nom_association, type_dossier, verdict, status_dossier)
          VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id,
            COALESCE(NEW.num_chrono, ''),
            COALESCE(NEW.nom_association, ''),
            COALESCE(NEW.type_dossier::text, ''),
            COALESCE(NEW.verdict::text, ''),
            COALESCE(NEW.status::text, ''));
        ELSIF TG_OP = 'DELETE' THEN
          INSERT INTO audit_log(table_name, record_id, action, old_data, user_id,
            num_chrono, nom_association, type_dossier, verdict, status_dossier)
          VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), v_user_id,
            COALESCE(OLD.num_chrono, ''),
            COALESCE(OLD.nom_association, ''),
            COALESCE(OLD.type_dossier::text, ''),
            COALESCE(OLD.verdict::text, ''),
            COALESCE(OLD.status::text, ''));
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ function audit_trigger_function() créée/mise à jour (avec colonnes enrichies)');

    // APPLIQUER LE TRIGGER D'AUDIT
    await pool.query(`DROP TRIGGER IF EXISTS audit_dossiers ON dossiers`);
    await pool.query(`
      CREATE TRIGGER audit_dossiers
      AFTER INSERT OR UPDATE OR DELETE ON dossiers
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()
    `);
    console.log('   ✓ trigger d\'audit créé sur dossiers');

    // ================================================================
    // EXTENSION pg_trgm
    // ================================================================
    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
      console.log('   ✓ extension pg_trgm');
    } catch (err: any) {
      console.warn('   ⚠️ pg_trgm non disponible (pas critique):', err.message);
    }

    // ================================================================
    // INDEX (optimisés pour 700K+ enregistrements)
    // ================================================================
    const addIndex = async (name: string, table: string, cols: string, options?: { using?: string; where?: string }) => {
      try {
        const exists = await pool.query("SELECT 1 FROM pg_indexes WHERE indexname = $1", [name]);
        if (exists.rows.length === 0) {
          let sql = `CREATE INDEX IF NOT EXISTS ${name} ON ${table}`;
          if (options?.using) sql += ` ${options.using}`;
          sql += ` (${cols})`;
          if (options?.where) sql += ` WHERE ${options.where}`;
          await pool.query(sql);
          console.log(`   + index ${name}`);
        }
      } catch (err) {
        console.warn(`   ⚠️ index ${name}:`, err);
      }
    };

    // --- dossiers ---
    await addIndex('idx_dossiers_status_date', 'dossiers', 'status, date_depot DESC');
    await addIndex('idx_dossiers_status_id', 'dossiers', 'status, id');
    await addIndex('idx_dossiers_num_chrono', 'dossiers', 'num_chrono');
    await addIndex('idx_dossiers_nom', 'dossiers', 'nom_association');
    await addIndex('idx_dossiers_actifs', 'dossiers', 'status, date_depot DESC', { where: "status IN ('reception','en_attente','en_cours','defavorable','livraison','duplicata')" });
    await addIndex('idx_dossiers_archives', 'dossiers', 'status, date_depot DESC', { where: "status IN ('registre_chrono','annuaire','archive_annuaire','archive_arrivee','historique_sortie','defavorable_traite')" });
    await addIndex('idx_dossiers_num_chrono_trgm', 'dossiers', 'num_chrono gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_dossiers_nom_trgm', 'dossiers', 'nom_association gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_dossiers_siege_trgm', 'dossiers', 'siege gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_dossiers_district_trgm', 'dossiers', 'district gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_dossiers_association', 'dossiers', 'association_id');
    await addIndex('idx_dossiers_created_by', 'dossiers', 'created_by');
    await addIndex('idx_dossiers_sous_type_id', 'dossiers', 'sous_type_id');
    await addIndex('idx_dossiers_type_dossier', 'dossiers', 'type_dossier');

    // --- dossier_categories ---
    await addIndex('idx_dossier_categories_dossier', 'dossier_categories', 'dossier_id');
    await addIndex('idx_dossier_categories_cat', 'dossier_categories', 'categorie_id');

    // --- sorties ---
    await addIndex('idx_sorties_dossier', 'sorties', 'dossier_id');
    await addIndex('idx_sorties_date', 'sorties', 'date_sortie DESC');
    await addIndex('idx_sorties_dossier_date', 'sorties', 'dossier_id, date_sortie DESC');
    await addIndex('idx_sorties_personne', 'sorties', 'personne_sortie');

    // --- annuaire_entries ---
    await addIndex('idx_annuaire_entries_groupe', 'annuaire_entries', 'groupe_id');

    // --- historiques ---
    await addIndex('idx_histo_arrivee_groupe_date', 'historique_arrivee', 'groupe_id, date_arrivee DESC');
    await addIndex('idx_histo_arrivee_dossier', 'historique_arrivee', 'dossier_id');
    await addIndex('idx_histo_defavorable_dossier_date', 'historique_defavorable', 'dossier_id, date_arrivee DESC');
    await addIndex('idx_histo_arrivee_nom_trgm', 'historique_arrivee', 'nom_association gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_histo_defavorable_nom_trgm', 'historique_defavorable', 'nom_association gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_histo_arrivee_abreviation_trgm', 'historique_arrivee', 'abreviation gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_histo_defavorable_abreviation_trgm', 'historique_defavorable', 'abreviation gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_histo_arrivee_siege_trgm', 'historique_arrivee', 'siege gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_histo_defavorable_siege_trgm', 'historique_defavorable', 'siege gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_histo_arrivee_date', 'historique_arrivee', 'date_arrivee DESC');
    await addIndex('idx_histo_arrivee_groupe_date_nom', 'historique_arrivee', 'groupe_id, date_arrivee DESC, nom_association');
    await addIndex('idx_histo_arrivee_num_chrono_trgm', 'historique_arrivee', 'num_chrono gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_histo_defavorable_num_chrono_trgm', 'historique_defavorable', 'num_chrono gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_histo_defavorable_date_nom', 'historique_defavorable', 'date_arrivee DESC, nom_association');

    // --- associations ---
    await addIndex('idx_associations_nom', 'associations', 'nom');
    await addIndex('idx_associations_district', 'associations', 'district');
    await addIndex('idx_associations_nom_trgm', 'associations', 'nom gin_trgm_ops', { using: 'USING gin' });
    await addIndex('idx_associations_nom_district', 'associations', 'nom, district');

    // ================================================================
    // VUE MATÉRIALISÉE : dashboard_stats
    // ================================================================
    try {
      await pool.query(`DROP MATERIALIZED VIEW IF EXISTS dashboard_stats CASCADE`);
      console.log('   → ancienne vue dashboard_stats supprimée');
      await pool.query(`
        CREATE MATERIALIZED VIEW dashboard_stats AS
        WITH
          total AS (
            SELECT COUNT(*) AS total FROM dossiers
          ),
          par_statut AS (
            SELECT status, COUNT(*) AS count
            FROM dossiers
            GROUP BY status
          ),
          par_mois AS (
            SELECT TO_CHAR(date_depot, 'YYYY-MM') AS mois, COUNT(*) AS count
            FROM dossiers
            WHERE date_depot >= (CURRENT_DATE - INTERVAL '12 months')
            GROUP BY mois
            ORDER BY mois
          ),
          par_district AS (
            SELECT COALESCE(a.district, 'Non renseigné') AS district, COUNT(*) AS count
            FROM dossiers d
            LEFT JOIN associations a ON a.id = d.association_id
            GROUP BY a.district
            ORDER BY count DESC
            LIMIT 10
          ),
          par_categorie AS (
            SELECT c.nom AS categorie, COUNT(*) AS count
            FROM dossiers d
            JOIN dossier_categories dc ON dc.dossier_id = d.id
            JOIN categories c ON c.id = dc.categorie_id
            GROUP BY c.nom
            ORDER BY count DESC
          ),
          par_categorie_detail AS (
            SELECT c.nom AS categorie, d.status, COUNT(*) AS count
            FROM dossiers d
            JOIN dossier_categories dc ON dc.dossier_id = d.id
            JOIN categories c ON c.id = dc.categorie_id
            GROUP BY c.nom, d.status
            ORDER BY c.nom, d.status
          ),
          total_par_annee AS (
            SELECT EXTRACT(YEAR FROM date_depot) AS annee, COUNT(*) AS count
            FROM dossiers
            GROUP BY annee
            ORDER BY annee DESC
          ),
          pipeline AS (
            SELECT
              COUNT(*) FILTER (WHERE status = 'reception') AS reception,
              COUNT(*) FILTER (WHERE status = 'en_attente' OR (status = 'reception' AND verdict = 'favorable')) AS en_attente,
              COUNT(*) FILTER (WHERE status = 'en_cours') AS en_cours,
              COUNT(*) FILTER (WHERE status = 'livraison') AS livraison,
              COUNT(*) FILTER (WHERE status = 'defavorable') AS defavorable,
              COUNT(*) FILTER (WHERE status IN ('registre_chrono', 'archive_arrivee', 'historique_sortie', 'defavorable_traite')) AS registre_chrono,
              COUNT(*) FILTER (WHERE status = 'historique_sortie') AS historique_sortie,
              COUNT(*) FILTER (WHERE status = 'duplicata') AS duplicata,
              COUNT(*) FILTER (WHERE status = 'defavorable_traite') AS defavorable_traite,
              COUNT(*) FILTER (WHERE status = 'archive_arrivee') AS archive_arrivee,
              (SELECT COUNT(*) FROM dossiers d JOIN annuaire_entries ae ON ae.dossier_id = d.id) AS annuaire,
              (SELECT COUNT(*) FROM historique_arrivee) AS historique_arrivee,
              (SELECT COUNT(*) FROM historique_defavorable) AS historique_defavorable
            FROM dossiers
          ),
          annuaire_par_categorie AS (
            SELECT c.nom AS categorie, COUNT(*) AS count
            FROM dossiers d
            JOIN annuaire_entries ae ON ae.dossier_id = d.id
            JOIN dossier_categories dc ON dc.dossier_id = d.id
            JOIN categories c ON c.id = dc.categorie_id
            GROUP BY c.nom
            ORDER BY count DESC
          ),
          par_type_dossier AS (
            SELECT type_dossier, COUNT(*) AS count
            FROM dossiers
            WHERE type_dossier IS NOT NULL AND type_dossier != ''
            GROUP BY type_dossier
            ORDER BY count DESC
          )
        SELECT
          (SELECT total FROM total) AS total,
          (SELECT json_agg(row_to_json(par_statut.*)) FROM par_statut) AS par_statut,
          (SELECT json_agg(row_to_json(par_mois.*)) FROM par_mois) AS par_mois,
          (SELECT json_agg(row_to_json(par_district.*)) FROM par_district) AS par_district,
          (SELECT json_agg(row_to_json(par_categorie.*)) FROM par_categorie) AS par_categorie,
          (SELECT json_agg(row_to_json(par_categorie_detail.*)) FROM par_categorie_detail) AS par_categorie_detail,
          (SELECT json_agg(row_to_json(total_par_annee.*)) FROM total_par_annee) AS total_par_annee,
          (SELECT row_to_json(pipeline.*) FROM pipeline) AS pipeline,
          (SELECT json_agg(row_to_json(annuaire_par_categorie.*)) FROM annuaire_par_categorie) AS annuaire_par_categorie,
          (SELECT json_agg(row_to_json(par_type_dossier.*)) FROM par_type_dossier) AS par_type_dossier
      `);
      console.log('   ✅ Vue matérialisée dashboard_stats recréée');
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_id ON dashboard_stats (total)`);
      console.log('   + index idx_dashboard_stats_id');
      await pool.query(`REFRESH MATERIALIZED VIEW dashboard_stats`);
      console.log('   ✅ Vue dashboard_stats rafraîchie');
    } catch (err: any) {
      console.warn('   ⚠️ Création de la vue matérialisée :', err.message);
    }

    // Initialiser le DOSSIER_SELECT
    await initDossierSelect();

    console.log('✅ Tables initialisées avec succès (audit log inclus) !');
  } catch (err) {
    console.error('❌ Erreur lors de l\'initialisation des tables:', err);
  }
};
