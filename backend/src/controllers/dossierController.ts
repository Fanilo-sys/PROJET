import { Request, Response } from 'express';
import pool from '../config/db';
import { getIO } from '../socket';
import {
  getCache,
  setCache,
  invalidateStatsCache,
  statsCacheKey,
  getStatsFromView,
  invalidateCacheHistoriqueDefavorable,
  invalidateCacheHistoriqueArrivee,
  refreshDashboardStats,
} from '../utils/statsCache';
import { syncCategories } from '../services/categorieService';
import { setUserContextOnClient } from '../utils/userContext';

// ============================================================
// STATUTS PROTÉGÉS (non modifiables)
// ============================================================

// Export de syncCategories pour être utilisé par d'autres modules (annuaireController)


const STATUTS_PROTEGES = ['registre_chrono', 'annuaire', 'archive_annuaire', 'historique_sortie'];

const STATUTS_AUTORISES = [
  'reception', 'en_attente', 'en_cours', 'defavorable',
  'defavorable_traite', 'livraison', 'registre_chrono',
  'annuaire', 'archive_annuaire', 'archive_arrivee',
  'historique_sortie', 'historique_arrivee',
  'historique_defavorable', 'duplicata'
];

const estProtege = (status: string): boolean => {
  return STATUTS_PROTEGES.includes(status);
};

// ============================================================
// UTILITAIRES
// ============================================================

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const getOrCreateGroupeArrivee = async (dateDepot: string): Promise<number> => {
  const d = new Date(dateDepot + 'T12:00:00Z');
  const periode = `${MOIS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

  const result = await pool.query(
    `
    WITH ins AS (
      INSERT INTO historique_arrivee_groupes (periode)
      VALUES ($1)
      ON CONFLICT (periode) DO NOTHING
      RETURNING id
    )
    SELECT id FROM ins
    UNION ALL
    SELECT id FROM historique_arrivee_groupes WHERE periode = $1
    LIMIT 1
    `,
    [periode]
  );

  if (result.rows.length === 0) {
    throw new Error(`Impossible de créer/récupérer le groupe pour la période "${periode}"`);
  }

  return result.rows[0].id;
};

const normalizeStr = (s: string): string => {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
};

// ============================================================
// DOSSIER_SELECT
// ============================================================
let DOSSIER_SELECT = '';

const buildDossierSelect = (): string => {
  if (!DOSSIER_SELECT) return 'SELECT d.* FROM dossiers d';
  return DOSSIER_SELECT;
};

export const initDossierSelect = async () => {
  try {
    await pool.query('SELECT association_id FROM dossiers LIMIT 0');
    await pool.query('SELECT 1 FROM dossier_categories LIMIT 0');
    DOSSIER_SELECT = `
      SELECT d.*,
        COALESCE(NULLIF(a.nom, ''), d.nom_association, '') AS nom_association,
        COALESCE(NULLIF(a.siege, ''), d.siege, '') AS siege,
        TO_CHAR(d.date_depot, 'YYYY-MM-DD') AS date_depot,
        COALESCE(NULLIF(a.district, ''), d.district, '') AS district,
        COALESCE(NULLIF(a.president, ''), d.president, '') AS president,
        COALESCE(NULLIF(a.abreviation, ''), d.abreviation, '') AS abreviation,
        a.nom AS association_nom,
        a.siege AS association_siege,
        a.district AS association_district,
        a.president AS association_president,
        a.abreviation AS association_abreviation,
        (SELECT STRING_AGG(c2.nom, ', ' ORDER BY c2.nom)
         FROM dossier_categories dc2
         JOIN categories c2 ON c2.id = dc2.categorie_id
         WHERE dc2.dossier_id = d.id) AS categorie
      FROM dossiers d
      LEFT JOIN associations a ON a.id = d.association_id
    `;
    console.log('✅ DOSSIER_SELECT: mode normalisé + catégories via string_agg');
  } catch {
    try {
      await pool.query('SELECT association_id FROM dossiers LIMIT 0');
      DOSSIER_SELECT = `
        SELECT d.*,
          COALESCE(NULLIF(a.nom, ''), d.nom_association, '') AS nom_association,
          COALESCE(NULLIF(a.siege, ''), d.siege, '') AS siege,
          TO_CHAR(d.date_depot, 'YYYY-MM-DD') AS date_depot,
          COALESCE(NULLIF(a.district, ''), d.district, '') AS district,
          COALESCE(NULLIF(a.president, ''), d.president, '') AS president,
          COALESCE(NULLIF(a.abreviation, ''), d.abreviation, '') AS abreviation,
          a.nom AS association_nom,
          a.siege AS association_siege,
          a.district AS association_district,
          a.president AS association_president,
          a.abreviation AS association_abreviation
        FROM dossiers d
        LEFT JOIN associations a ON a.id = d.association_id
      `;
      console.log('✅ DOSSIER_SELECT: mode normalisé (sans catégories string_agg)');
    } catch {
      DOSSIER_SELECT = 'SELECT d.* FROM dossiers d';
      console.log('ℹ️ DOSSIER_SELECT: mode compatible (sans association_id)');
    }
  }
};

const queryDossiers = async (query: string, params: any[] = []): Promise<any[]> => {
  const result = await pool.query(query, params);
  return result.rows.map((r: any) => ({
    ...r,
    categorie: r.categorie || 'Autre',
  }));
};

const ensureAssociationId = async (client: any, dossierId: number, nom: string, district: string) => {
  if (!nom || nom.trim() === '') return;
  const cleanNom = normalizeStr(nom);
  const cleanDistrict = normalizeStr(district || '');

  const assoc = await client.query(
    `SELECT id FROM associations WHERE LOWER(REPLACE(TRIM(nom), '  ', ' ')) = LOWER(REPLACE(TRIM($1), '  ', ' ')) AND LOWER(REPLACE(TRIM(COALESCE(district, '')), '  ', ' ')) = LOWER(REPLACE(TRIM($2), '  ', ' ')) LIMIT 1`,
    [cleanNom, cleanDistrict]
  );

  let assocId: number;
  if (assoc.rows.length > 0) {
    assocId = assoc.rows[0].id;
  } else {
    const newAssoc = await client.query(
      `INSERT INTO associations (nom, district, siege, president)
       VALUES ($1, $2, '', '') RETURNING id`,
      [cleanNom, cleanDistrict]
    );
    assocId = newAssoc.rows[0].id;
  }

  await client.query('UPDATE dossiers SET association_id = $1 WHERE id = $2', [assocId, dossierId]);
};

const replaceCategories = async (client: any, dossierId: number, categorieCsv: string) => {
  await client.query('DELETE FROM dossier_categories WHERE dossier_id = $1', [dossierId]);
  if (categorieCsv && categorieCsv.trim()) {
    await syncCategories(client, dossierId, categorieCsv);
  }
};

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * Trouve ou crée l'association et retourne son ID (ou NULL).
 * N'affecte PAS la table dossiers – à utiliser AVANT l'INSERT
 * pour pouvoir inclure association_id directement.
 */
const findOrCreateAssociationId = async (
  client: any,
  nom: string | undefined,
  district: string | undefined
): Promise<number | null> => {
  if (!nom || nom.trim() === '') return null;

  const cleanNom = normalizeStr(nom);
  const cleanDistrict = normalizeStr(district || '');

  // Chercher l'association existante
  const assoc = await client.query(
    `SELECT id FROM associations
     WHERE LOWER(REPLACE(TRIM(nom), '  ', ' ')) = LOWER(REPLACE(TRIM($1), '  ', ' '))
       AND LOWER(REPLACE(TRIM(COALESCE(district, '')), '  ', ' ')) = LOWER(REPLACE(TRIM($2), '  ', ' '))
     LIMIT 1`,
    [cleanNom, cleanDistrict]
  );

  if (assoc.rows.length > 0) {
    return assoc.rows[0].id;
  }

  // Créer la nouvelle association
  const newAssoc = await client.query(
    `INSERT INTO associations (nom, district, siege, president)
     VALUES ($1, $2, '', '') RETURNING id`,
    [cleanNom, cleanDistrict]
  );
  return newAssoc.rows[0].id;
};

export const creerDossier = async (req: Request, res: Response) => {
  const { num_chrono, nom_association, siege, district, president, type_dossier, sous_type, categorie, emplacement, arn, recu_fr, recu_mg, heure_depot, objet, abreviation, date_depot, status } = req.body;

  console.log(`📦 Création dossier: num_chrono=${num_chrono}, date_depot=${date_depot}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // ✅ FIX AUDIT : propager user_id au client dédié (après BEGIN, car set_config est local à la transaction)
      await setUserContextOnClient(client, req);

    // Trouver/créer l'association AVANT l'INSERT pour inclure association_id directement
    const associationId = await findOrCreateAssociationId(client, nom_association, district);

    // ✅ FIX C1 : Insertion avec association_id directement (évite l'UPDATE post-INSERT)
    const result = await client.query(
      `INSERT INTO dossiers (num_chrono, nom_association, siege, district, president, type_dossier, sous_type, emplacement, arn, recu_fr, recu_mg, heure_depot, objet, abreviation, date_depot, status, association_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (num_chrono) DO NOTHING
       RETURNING id, num_chrono, nom_association`,
      [num_chrono, nom_association || '', siege || '', district || '', president || '', type_dossier || '', sous_type || '', emplacement || '', arn || '', recu_fr || '', recu_mg || '', heure_depot || '', objet || '', abreviation || '', date_depot || null, status || 'reception', associationId]
    );

    const dossier = result.rows[0];
    if (!dossier) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Ce numéro chrono existe déjà (contrainte UNIQUE en base).'
      });
    }

    await replaceCategories(client, dossier.id, categorie);

    // Création historique arrivée
    try {
      const dateArrivee = date_depot || null;
      if (dateArrivee && String(dateArrivee).trim() !== '') {
        const groupeId = await getOrCreateGroupeArrivee(dateArrivee);
        console.log(`📝 Insertion historique arrivée : groupeId=${groupeId}, dossierId=${dossier.id}, date=${dateArrivee}`);
        await client.query(
          `INSERT INTO historique_arrivee (groupe_id, dossier_id, num_chrono, nom_association, siege, district, president, type_dossier, date_arrivee, heure_depot)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [groupeId, dossier.id, dossier.num_chrono, nom_association || '', siege || '', district || '', president || '', type_dossier || '', dateArrivee, heure_depot ? String(heure_depot).slice(0, 5) + ':00' : null]
        );
        console.log(`✅ Historique arrivée inséré pour dossier ${dossier.id}`);
        // Invalider le cache HA pour ce groupe
        try {
          invalidateCacheHistoriqueArrivee(groupeId);
        } catch (cacheErr) {
          console.warn('⚠️ Erreur invalidation cache HA:', cacheErr);
        }
        try {
          const io = getIO();
          io.emit('historique-arrivee:changed', { groupeId, dossierId: dossier.id });
        } catch (socketErr) {
          console.warn('⚠️ Erreur emission socket:', socketErr);
        }
      } else {
        console.warn(`⚠️ Pas d'insertion historique arrivée : date_depot est vide`);
      }
    } catch (histErr) {
      console.error('⚠️ Erreur insertion historique arrivée:', histErr);
    }

    await client.query('COMMIT');

    // ✅ Rafraîchir la vue matérialisée
    await refreshDashboardStats();

    const select = buildDossierSelect();
    const fullDossier = await queryDossiers(`${select} WHERE d.id = $1`, [dossier.id]);
    try { getIO().emit('dossiers:created', { dossier: fullDossier[0] }); } catch (_) {}
    invalidateStatsCache();
    res.status(201).json(fullDossier[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint?.includes('num_chrono')) {
      return res.status(409).json({ error: 'Ce numéro chrono existe déjà (contrainte UNIQUE en base).' });
    }
    console.error('❌ Erreur création :', err);
    res.status(500).json({ error: "Erreur lors de la création du dossier" });
  } finally {
    client.release();
  }
};

export const listerDossiers = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const cursor = parseInt(req.query.cursor as string) || 0;
    const status = req.query.status as string | undefined;

    let query = `${buildDossierSelect()} WHERE d.id > $1`;
    const params: (string | number)[] = [cursor];

    if (status) {
      if (!STATUTS_AUTORISES.includes(status)) {
        return res.status(400).json({ error: `Statut "${status}" non autorisé` });
      }
      query += ' AND d.status = $2';
      params.push(status);
    }

    query += ' ORDER BY d.id ASC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await queryDossiers(query, params);
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Erreur listage :', err);
    res.status(500).json({ error: "Erreur lors de la récupération des dossiers" });
  }
};

export const rechercherDossiers = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const status = req.query.status as string | undefined;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Terme de recherche requis' });
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`;
    let query = `${buildDossierSelect()} WHERE (LOWER(d.num_chrono) LIKE $1 OR LOWER(COALESCE(a.nom, d.nom_association, '')) LIKE $1 OR LOWER(d.siege) LIKE $1 OR LOWER(d.district) LIKE $1 OR LOWER(d.abreviation) LIKE $1)`;
    const params: (string | number)[] = [searchTerm];

    if (status) {
      if (!STATUTS_AUTORISES.includes(status)) {
        return res.status(400).json({ error: `Statut "${status}" non autorisé` });
      }
      query += ` AND d.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY d.date_depot DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await queryDossiers(query, params);
    res.json(result);
  } catch (err) {
    console.error('❌ Erreur recherche :', err);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
};

export const modifierDossier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { verdict, status, emplacement } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ✅ FIX AUDIT : propager user_id au client dédié (après BEGIN)
    await setUserContextOnClient(client, req);

    const check = await client.query('SELECT status FROM dossiers WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Dossier introuvable" });
    }
    if (estProtege(check.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Ce dossier est archivé et ne peut plus être modifié." });
    }

    if (status && !STATUTS_AUTORISES.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Statut "${status}" non autorisé` });
    }

    await client.query(
      `UPDATE dossiers
       SET verdict = COALESCE($2, verdict),
           status  = COALESCE($3, status),
           emplacement = COALESCE($4, emplacement)
       WHERE id = $1`,
      [id, verdict, status, emplacement]
    );

    if (status === 'historique_sortie') {
      const existingSortie = await client.query(
        'SELECT id FROM sorties WHERE dossier_id = $1 LIMIT 1',
        [id]
      );
      if (existingSortie.rows.length === 0) {
        await client.query(
          `INSERT INTO sorties (dossier_id, numero_sortie, personne_sortie, motif)
           VALUES ($1, '', '', 'Sortie manuelle')`,
          [id]
        );
      }
    }

    await client.query('COMMIT');

    // ✅ Rafraîchir la vue matérialisée
    await refreshDashboardStats();

    const select = buildDossierSelect();
    const result = await queryDossiers(`${select} WHERE d.id = $1`, [id]);
    if (result.length === 0) return res.status(404).json({ error: "Dossier introuvable" });
    const dossier = result[0];

    try { getIO().emit('dossiers:updated', { dossier }); } catch (_) {}
    invalidateStatsCache();
    res.json(dossier);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur modification :', err);
    res.status(500).json({ error: "Erreur lors de la modification du dossier" });
  } finally {
    client.release();
  }
};

export const modifierDossierComplet = async (req: Request, res: Response) => {
  const { id } = req.params;
  let { num_chrono, nom_association, siege, district, president, type_dossier, sous_type, categorie, emplacement, objet, abreviation, date_depot, heure_depot, arn, recu_fr, recu_mg } = req.body;
  // Compatibilité avec les noms de champs frontend
  const dateDepot = date_depot || req.body.dateArrivee || undefined;
  const heureDepot = heure_depot || req.body.heureArrivee || undefined;
  arn = arn ?? req.body.arn ?? undefined;
  recu_fr = recu_fr ?? req.body.recuFr ?? req.body.recu_fr ?? undefined;
  recu_mg = recu_mg ?? req.body.recuMg ?? req.body.recu_mg ?? undefined;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ✅ FIX AUDIT : propager user_id au client dédié (après BEGIN)
    await setUserContextOnClient(client, req);

    const check = await client.query('SELECT status, nom_association, district FROM dossiers WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Dossier introuvable" });
    }
    if (estProtege(check.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Ce dossier est archivé et ne peut plus être modifié." });
    }

    await client.query(
      `UPDATE dossiers SET
        num_chrono = COALESCE($2, num_chrono),
        nom_association = COALESCE($3, nom_association),
        siege = COALESCE($4, siege),
        district = COALESCE($5, district),
        president = COALESCE($6, president),
        type_dossier = COALESCE($7, type_dossier),
        sous_type = COALESCE($8, sous_type),
        emplacement = COALESCE($9, emplacement),
        objet = COALESCE($10, objet),
        abreviation = COALESCE($11, abreviation),
        date_depot = COALESCE($12, date_depot),
        heure_depot = COALESCE($13::time, heure_depot),
        arn = COALESCE($14, arn),
        recu_fr = COALESCE($15, recu_fr),
        recu_mg = COALESCE($16, recu_mg)
       WHERE id = $1`,
      [id, num_chrono, nom_association, siege, district, president, type_dossier, sous_type, emplacement, objet, abreviation, dateDepot, heureDepot, arn, recu_fr, recu_mg]
    );

    await ensureAssociationId(client, parseInt(id as string), nom_association || check.rows[0].nom_association, district || check.rows[0].district);
    await replaceCategories(client, parseInt(id as string), categorie);

    await client.query('COMMIT');

    // ✅ Rafraîchir la vue matérialisée
    await refreshDashboardStats();

    const select = buildDossierSelect();
    const result = await queryDossiers(`${select} WHERE d.id = $1`, [id]);
    if (result.length === 0) return res.status(404).json({ error: "Dossier introuvable" });
    const dossier = result[0];

    try { getIO().emit('dossiers:updated', { dossier }); } catch (_) {}
    invalidateStatsCache();
    res.json(dossier);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint?.includes('num_chrono')) {
      return res.status(409).json({ error: 'Ce numéro chrono existe déjà (contrainte UNIQUE en base).' });
    }
    console.error('❌ Erreur modification complète :', err);
    res.status(500).json({ error: "Erreur lors de la modification du dossier" });
  } finally {
    client.release();
  }
};

export const supprimerDossier = async (req: Request, res: Response) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ✅ FIX AUDIT : propager user_id au client dédié (après BEGIN)
    await setUserContextOnClient(client, req);

    const check = await client.query('SELECT status FROM dossiers WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Dossier introuvable" });
    }
    if (estProtege(check.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Ce dossier est archivé et ne peut plus être supprimé." });
    }

    await client.query('DELETE FROM dossier_categories WHERE dossier_id = $1', [id]);
    await client.query('DELETE FROM sorties WHERE dossier_id = $1', [id]);
    await client.query('DELETE FROM annuaire_entries WHERE dossier_id = $1', [id]);

    const result = await client.query('DELETE FROM dossiers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Dossier introuvable" });
    }

    await client.query('COMMIT');

    // ✅ Rafraîchir la vue matérialisée
    await refreshDashboardStats();

    try { getIO().emit('dossiers:deleted', { id }); } catch (_) {}
    invalidateStatsCache();
    res.json({ message: "Dossier supprimé", dossier: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur suppression :', err);
    res.status(500).json({ error: "Erreur lors de la suppression du dossier" });
  } finally {
    client.release();
  }
};

export const listerDossiersParStatut = async (req: Request, res: Response) => {
  const statut = req.params.statut;
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);
    const cursor = parseInt(req.query.cursor as string) || 0;

    const select = buildDossierSelect();
    const result = await queryDossiers(
      `${select} WHERE d.status = $1 AND d.id > $2 ORDER BY d.date_depot DESC LIMIT $3`,
      [statut, cursor, limit]
    );
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Erreur listage par statut :', err);
    res.status(500).json({ error: "Erreur lors de la récupération des dossiers" });
  }
};

export const creerDuplicata = async (req: Request, res: Response) => {
  const { num_chrono, nom_association, siege, district, president, type_dossier, categorie, arn, recu_fr, recu_mg, heure_depot, objet, abreviation } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ✅ FIX AUDIT : propager user_id au client dédié (après BEGIN)
    await setUserContextOnClient(client, req);

    if (num_chrono) {
      const check = await client.query('SELECT status FROM dossiers WHERE num_chrono = $1', [num_chrono]);
      if (check.rows.length > 0 && estProtege(check.rows[0].status)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: "Ce numéro correspond à un dossier archivé. Impossible de créer un duplicata." });
      }
    }

    const nouveau = await client.query(
      `INSERT INTO dossiers (num_chrono, nom_association, siege, district, president, type_dossier, arn, recu_fr, recu_mg, heure_depot, status, verdict, objet, abreviation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'duplicata', 'aucun', $11, $12) RETURNING id`,
      [num_chrono, nom_association || '', siege || '', district || '', president || '', type_dossier || '', arn || '', recu_fr || '', recu_mg || '', heure_depot || '', objet || '', abreviation || '']
    );

    await ensureAssociationId(client, nouveau.rows[0].id, nom_association, district);
    await replaceCategories(client, nouveau.rows[0].id, categorie);

    await client.query('COMMIT');

    // ✅ Rafraîchir la vue matérialisée
    await refreshDashboardStats();

    const select = buildDossierSelect();
    const fullDossier = await queryDossiers(`${select} WHERE d.id = $1`, [nouveau.rows[0].id]);
    try { getIO().emit('dossiers:created', { dossier: fullDossier[0] }); } catch (_) {}
    invalidateStatsCache();
    res.status(201).json(fullDossier[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint?.includes('num_chrono')) {
      return res.status(409).json({ error: 'Ce numéro chrono existe déjà.' });
    }
    console.error('Erreur création duplicata', err);
    res.status(500).json({ error: 'Erreur création duplicata' });
  } finally {
    client.release();
  }
};

export const approuverDuplicata = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE dossiers SET status = 'reception' WHERE id = $1 AND status = 'duplicata'",
      [id]
    );

    // ✅ Rafraîchir la vue matérialisée
    await refreshDashboardStats();

    const select = buildDossierSelect();
    const result = await queryDossiers(`${select} WHERE d.id = $1`, [id]);
    if (result.length === 0) return res.status(404).json({ error: 'Duplicata introuvable ou déjà approuvé' });
    try { getIO().emit('dossiers:updated', { dossier: result[0] }); } catch (_) {}
    invalidateStatsCache();
    res.json(result[0]);
  } catch (err) {
    console.error('Erreur approbation duplicata', err);
    res.status(500).json({ error: 'Erreur approbation' });
  }
};

export const listerDuplicatas = async (req: Request, res: Response) => {
  try {
    const select = buildDossierSelect();
    const result = await queryDossiers(
      `${select} WHERE d.status = 'duplicata' ORDER BY d.date_depot ASC`
    );
    res.json(result);
  } catch (err) {
    console.error('Erreur listage duplicatas', err);
    res.status(500).json({ error: 'Erreur listage' });
  }
};

export const getDossiersParCategorieCtrl = async (req: Request, res: Response) => {
  try {
    const categorie = req.params.categorie;
    const annee = req.query.annee as string | undefined;

    let query = `${buildDossierSelect()}
      JOIN dossier_categories dc ON dc.dossier_id = d.id
      JOIN categories c ON c.id = dc.categorie_id
      WHERE c.nom ILIKE $1`;
    const params: any[] = [categorie];

    if (annee && /^\d{4}$/.test(annee)) {
      query += ' AND EXTRACT(YEAR FROM d.date_depot) = $2';
      params.push(parseInt(annee));
    }
    query += ' ORDER BY d.date_depot DESC';

    const result = await queryDossiers(query, params);
    res.json(result);
  } catch (err) {
    console.error('Erreur getDossiersParCategorieCtrl:', err);
    res.status(500).json({ error: 'Erreur récupération dossiers par catégorie' });
  }
};

export const getDossiersParDistrictCtrl = async (req: Request, res: Response) => {
  try {
    const district = req.params.district;
    const annee = req.query.annee as string | undefined;

    let query = `${buildDossierSelect()} WHERE (a.id IS NOT NULL AND a.district ILIKE $1) OR (a.id IS NULL AND d.district ILIKE $1)`;
    const params: any[] = [district];

    if (annee && /^\d{4}$/.test(annee)) {
      query += ' AND EXTRACT(YEAR FROM d.date_depot) = $2';
      params.push(parseInt(annee));
    }
    query += ' ORDER BY d.date_depot DESC';

    const result = await queryDossiers(query, params);
    res.json(result);
  } catch (err) {
    console.error('Erreur getDossiersParDistrictCtrl:', err);
    res.status(500).json({ error: 'Erreur récupération dossiers par district' });
  }
};

export const getDossiersParTypeCtrl = async (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    const annee = req.query.annee as string | undefined;

    let query = `${buildDossierSelect()} WHERE d.type_dossier ILIKE $1`;
    const params: any[] = [type];

    if (annee && /^\d{4}$/.test(annee)) {
      query += ' AND EXTRACT(YEAR FROM d.date_depot) = $2';
      params.push(parseInt(annee));
    }
    query += ' ORDER BY d.date_depot DESC';

    const result = await queryDossiers(query, params);
    res.json(result);
  } catch (err) {
    console.error('Erreur getDossiersParTypeCtrl:', err);
    res.status(500).json({ error: 'Erreur récupération dossiers par type' });
  }
};

export const listerDossiersParStatuts = async (req: Request, res: Response) => {
  try {
    const statutsParam = req.query.statuts as string | undefined;
    const rawList = statutsParam ? statutsParam.split(',') : ['annuaire', 'archive_annuaire', 'registre_chrono'];

    const statusList = rawList.filter(s => STATUTS_AUTORISES.includes(s.trim()));

    if (statusList.length === 0) {
      return res.status(400).json({ error: 'Aucun statut valide fourni' });
    }

    const placeholders = statusList.map((_, i) => `$${i + 1}`).join(', ');
    const select = buildDossierSelect();
    const query = `${select} WHERE d.status IN (${placeholders}) ORDER BY d.nom_association`;

    const result = await queryDossiers(query, statusList);
    res.status(200).json(result);
  } catch (err) {
    console.error('Erreur listage par statuts :', err);
    res.status(500).json({ error: "Erreur lors de la récupération des dossiers" });
  }
};

export const archiverSortie = async (req: Request, res: Response) => {
  const { dossierIds } = req.body;
  if (!dossierIds || !Array.isArray(dossierIds) || dossierIds.length === 0) {
    return res.status(400).json({ error: "Liste d'IDs de dossiers requise" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ✅ FIX AUDIT : propager user_id au client dédié (après BEGIN)
    await setUserContextOnClient(client, req);

    const checks = await client.query(
      'SELECT id, status FROM dossiers WHERE id = ANY($1::int[])',
      [dossierIds]
    );
    for (const row of checks.rows) {
      if (estProtege(row.status)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: `Le dossier ${row.id} est archivé et ne peut pas être archivé en sortie.` });
      }
    }

    const result = await client.query(
      `SELECT d.id FROM dossiers d
       WHERE d.id = ANY($1::int[])
         AND EXISTS (SELECT 1 FROM annuaire_entries ae WHERE ae.dossier_id = d.id)`,
      [dossierIds]
    );

    const dossiersAArchiver = result.rows;

    if (dossiersAArchiver.length === 0) {
      await client.query('ROLLBACK');
      return res.json({
        message: "Aucun dossier trouvé dans l'annuaire à archiver en sortie",
        archivedCount: 0,
        skippedCount: dossierIds.length,
      });
    }

    const targetIds = dossiersAArchiver.map(d => d.id);

    for (const id of targetIds) {
      await client.query(
        `INSERT INTO sorties (dossier_id, numero_sortie, personne_sortie, motif)
         VALUES ($1, '', '', 'Archivage sortie')`,
        [id]
      );
    }

    await client.query(
      "UPDATE dossiers SET status = 'historique_sortie' WHERE id = ANY($1::int[])",
      [targetIds]
    );

    await client.query('COMMIT');

    // ✅ Rafraîchir la vue matérialisée
    await refreshDashboardStats();

    try { getIO()?.emit('dossiers:archived', { ids: targetIds }); } catch (_) {}
    try { getIO()?.emit('dossiers:updated', { ids: targetIds, status: 'historique_sortie' }); } catch (_) {}
    invalidateStatsCache();

    const skippedCount = dossierIds.length - dossiersAArchiver.length;
    let message = `${dossiersAArchiver.length} dossier(s) archivé(s) dans l'historique de sortie`;
    if (skippedCount > 0) message += `. ${skippedCount} dossier(s) ignoré(s) car non présent(s) dans l'annuaire.`;

    res.json({ message, archivedCount: dossiersAArchiver.length, skippedCount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur archivage sortie :', err);
    res.status(500).json({ error: "Erreur lors de l'archivage en sortie" });
  } finally {
    client.release();
  }
};

// ============================================================
// NOUVEAU : CORRIGER DÉFAVORABLE (transaction atomique)
// ============================================================

export const corrigerDefavorable = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    nomPersonne,
    date_prise,
    heure_prise,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ✅ FIX AUDIT : propager user_id au client dédié (après BEGIN)
    await setUserContextOnClient(client, req);

    // 1. Récupérer le dossier
    const dossierRes = await client.query(
      `SELECT * FROM dossiers WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (dossierRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dossier introuvable' });
    }
    const dossier = dossierRes.rows[0];

    // 2. Mettre à jour le dossier
    await client.query(
      `UPDATE dossiers SET status = 'en_attente', verdict = 'favorable' WHERE id = $1`,
      [id]
    );

    // 3. Ajouter l'historique défavorable
    await client.query(
      `INSERT INTO historique_defavorable
       (dossier_id, num_chrono, nom_association, siege, district, president, type_dossier,
        date_arrivee, heure_depot, personne_correction, date_prise, heure_prise, abreviation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        dossier.id,
        dossier.num_chrono,
        dossier.nom_association,
        dossier.siege,
        dossier.district,
        dossier.president,
        dossier.type_dossier,
        dossier.date_depot,
        dossier.heure_depot,
        nomPersonne || 'Agent',
        date_prise || new Date().toISOString().split('T')[0],
        heure_prise || new Date().toTimeString().slice(0, 5),
        dossier.abreviation || ''
      ]
    );

    await client.query('COMMIT');

    // ✅ Rafraîchir la vue matérialisée et invalider les caches
    await refreshDashboardStats();
    await invalidateCacheHistoriqueDefavorable();

    // Récupérer le dossier mis à jour
    const select = buildDossierSelect();
    const result = await queryDossiers(`${select} WHERE d.id = $1`, [id]);
    const updatedDossier = result[0] || dossier;

    // Émettre les événements Socket
    try {
      getIO().emit('dossiers:updated', { dossier: updatedDossier });
      getIO().emit('historique-defavorable:changed', { dossierId: id });
    } catch (_) {}

    res.json({ message: '✅ Dossier corrigé et historié', dossier: updatedDossier });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur corrigerDefavorable :', err);
    res.status(500).json({ error: 'Erreur lors de la correction' });
  } finally {
    client.release();
  }
};

// ============================================================
// STATS (utilisant la vue matérialisée)
// ============================================================

const buildDateClause = (
  col: string,
  anneeVal: string | null,
  moisVal: string | null,
  params: any[],
): string => {
  if (moisVal) {
    params.push(moisVal);
    return ` WHERE TO_CHAR(${col}, 'YYYY-MM') = $${params.length}`;
  }
  if (anneeVal) {
    params.push(parseInt(anneeVal));
    return ` WHERE EXTRACT(YEAR FROM ${col}) = $${params.length}`;
  }
  return '';
};

const buildDateClauseAnd = (
  col: string,
  anneeVal: string | null,
  moisVal: string | null,
  params: any[],
): string => {
  if (moisVal) {
    params.push(moisVal);
    return ` AND TO_CHAR(${col}, 'YYYY-MM') = $${params.length}`;
  }
  if (anneeVal) {
    params.push(parseInt(anneeVal));
    return ` AND EXTRACT(YEAR FROM ${col}) = $${params.length}`;
  }
  return '';
};

const computeStats = async (anneeVal: string | null, moisVal: string | null) => {
  const [
    totalRes,
    parStatutRes,
    parMoisRes,
    parDistrictRes,
    parCategorieRes,
    parCategorieDetailRes,
    totalParAnneeRes,
    pipelineRes,
    receptionFavRes,
    annuaireTotalRes,
    annuaireParCategorieRes,
    parTypeDossierRes,
    histoArriveeTotalRes,
    histoDefavorableTotalRes,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM dossiers d${buildDateClause('d.date_depot', anneeVal, moisVal, [])}`),
    pool.query(`SELECT d.status, COUNT(*) FROM dossiers d${buildDateClause('d.date_depot', anneeVal, moisVal, [])} GROUP BY d.status`),
    pool.query(`SELECT TO_CHAR(d.date_depot, 'YYYY-MM') as mois, COUNT(*) FROM dossiers d${buildDateClause('d.date_depot', anneeVal, moisVal, [])} GROUP BY mois ORDER BY mois`),
    (() => {
      const p: any[] = []; const wh = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
      return pool.query(`SELECT a.district, COUNT(*) as count FROM dossiers d JOIN associations a ON a.id = d.association_id WHERE a.district IS NOT NULL AND a.district != ''${wh} GROUP BY a.district`, p);
    })(),
    (() => {
      const p: any[] = []; const wh = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
      return pool.query(`SELECT c.nom as categorie, COUNT(*) as count FROM dossiers d JOIN dossier_categories dc ON dc.dossier_id = d.id JOIN categories c ON c.id = dc.categorie_id${wh} GROUP BY c.nom ORDER BY count DESC`, p);
    })(),
    (() => {
      const p: any[] = []; const wh = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
      return pool.query(`SELECT c.nom as categorie, d.status, COUNT(*) as count FROM dossiers d JOIN dossier_categories dc ON dc.dossier_id = d.id JOIN categories c ON c.id = dc.categorie_id${wh} GROUP BY c.nom, d.status ORDER BY c.nom, d.status`, p);
    })(),
    pool.query(`SELECT EXTRACT(YEAR FROM date_depot) as annee, COUNT(*) as count FROM dossiers GROUP BY annee ORDER BY annee DESC`),
    pool.query(`SELECT status, COUNT(*) as count FROM dossiers GROUP BY status`),
    (() => {
      const qp: any[] = []; const where = buildDateClause('date_depot', anneeVal, moisVal, qp);
      const prefix = where || 'WHERE'; const connector = where ? 'AND' : '';
      return pool.query(`SELECT COUNT(*) FROM dossiers ${prefix} ${connector} status = 'reception' AND verdict = 'favorable'`, qp);
    })(),
    (() => {
      const p: any[] = []; const wh = buildDateClause('d.date_depot', anneeVal, moisVal, p);
      return pool.query(`SELECT COUNT(*) FROM dossiers d JOIN annuaire_entries ae ON ae.dossier_id = d.id${wh}`, p);
    })(),
    (() => {
      const p: any[] = []; const wh = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
      return pool.query(`SELECT c.nom as categorie, COUNT(*) as count FROM dossiers d JOIN annuaire_entries ae ON ae.dossier_id = d.id JOIN dossier_categories dc ON dc.dossier_id = d.id JOIN categories c ON c.id = dc.categorie_id${wh} GROUP BY c.nom`, p);
    })(),
    (() => {
      const p: any[] = []; const wh = buildDateClauseAnd('d.date_depot', anneeVal, moisVal, p);
      return pool.query(`SELECT d.type_dossier, COUNT(*) as count FROM dossiers d WHERE d.type_dossier IS NOT NULL AND d.type_dossier != ''${wh} GROUP BY d.type_dossier ORDER BY count DESC`, p);
    })(),
    (() => {
      const p: any[] = []; const wh = buildDateClause('ha.date_arrivee', anneeVal, moisVal, p);
      return pool.query(`SELECT COUNT(*) FROM historique_arrivee ha${wh}`, p);
    })(),
    (() => {
      const p: any[] = []; const wh = buildDateClause('hd.date_arrivee', anneeVal, moisVal, p);
      return pool.query(`SELECT COUNT(*) FROM historique_defavorable hd${wh}`, p);
    })(),
  ]);

  const pipeMap: Record<string, number> = {};
  for (const row of pipelineRes.rows) {
    pipeMap[row.status] = parseInt(row.count);
  }

  const enAttente = pipeMap['en_attente'] || 0;
  const receptionFav = parseInt(receptionFavRes.rows[0].count);

  const registreChrono =
    (pipeMap['registre_chrono'] || 0) +
    (pipeMap['archive_arrivee'] || 0) +
    (pipeMap['historique_sortie'] || 0) +
    (pipeMap['defavorable_traite'] || 0);

  return {
    total: totalRes.rows[0].count,
    parStatut: parStatutRes.rows,
    parMois: parMoisRes.rows,
    parDistrict: parDistrictRes.rows,
    parCategorie: parCategorieRes.rows,
    parCategorieDetail: parCategorieDetailRes.rows,
    totalParAnnee: totalParAnneeRes.rows,
    parTypeDossier: parTypeDossierRes.rows,
    annuaireParCategorie: annuaireParCategorieRes.rows,
    pipeline: {
      reception: pipeMap['reception'] || 0,
      en_attente: enAttente + receptionFav,
      en_cours: pipeMap['en_cours'] || 0,
      livraison: pipeMap['livraison'] || 0,
      defavorable: pipeMap['defavorable'] || 0,
      registre_chrono: registreChrono,
      historique_sortie: pipeMap['historique_sortie'] || 0,
      duplicata: pipeMap['duplicata'] || 0,
      defavorable_traite: pipeMap['defavorable_traite'] || 0,
      archive_arrivee: pipeMap['archive_arrivee'] || 0,
      annuaire: parseInt(annuaireTotalRes.rows[0].count),
      historique_arrivee: parseInt(histoArriveeTotalRes.rows[0].count),
      historique_defavorable: parseInt(histoDefavorableTotalRes.rows[0].count),
    },
  };
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const anneeVal: string | null = /^\d{4}$/.test(String(req.query.annee || '')) ? String(req.query.annee) : null;
    const moisVal: string | null = /^\d{4}-\d{2}$/.test(String(req.query.mois || '')) ? String(req.query.mois) : null;

    if (!anneeVal && !moisVal) {
      const cacheKey = statsCacheKey(null, null);
      const cached = getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      try {
        const data = await getStatsFromView();
        setCache(cacheKey, data);
        return res.json(data);
      } catch (viewErr) {
        console.warn('⚠️ Erreur vue matérialisée, fallback sur computeStats:', viewErr);
        const data = await computeStats(null, null);
        setCache(cacheKey, data);
        return res.json(data);
      }
    }

    const data = await computeStats(anneeVal, moisVal);
    const cacheKey = statsCacheKey(anneeVal, moisVal);
    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error('Erreur stats', err);
    res.status(500).json({ error: 'Erreur statistiques' });
  }
};

export const listerSorties = async (req: Request, res: Response) => {
  try {
    const dossierId = req.query.dossier_id as string | undefined;
    let query = `
      SELECT s.*, d.num_chrono, COALESCE(a.nom, d.nom_association, '') AS association_nom
      FROM sorties s
      JOIN dossiers d ON d.id = s.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
    `;
    const params: (string | number)[] = [];

    if (dossierId) {
      const parsed = parseInt(dossierId);
      if (isNaN(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'dossier_id invalide' });
      }
      query += ' WHERE s.dossier_id = $1';
      params.push(parsed);
    }

    query += ' ORDER BY s.date_sortie DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur listage sorties', err);
    res.status(500).json({ error: 'Erreur récupération sorties' });
  }
};
