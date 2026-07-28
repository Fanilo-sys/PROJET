import { Request, Response } from 'express';
import pool from '../config/db';
import { getIO } from '../socket';
import {
  getCacheHistoriqueArrivee,
  setCacheHistoriqueArrivee,
  invalidateCacheHistoriqueArrivee,
} from '../utils/statsCache';

// ================================================================
// ARCHIVER UNE ARRIVÉE
// ================================================================

export const archiverArrivee = async (req: Request, res: Response) => {
  const { periode, dossierIds } = req.body;
  if (!periode) return res.status(400).json({ error: 'Période requise' });

  try {
    let groupe;
    const existing = await pool.query(
      'SELECT * FROM historique_arrivee_groupes WHERE LOWER(TRIM(periode)) = LOWER(TRIM($1)) LIMIT 1',
      [periode]
    );

    if (existing.rows.length > 0) {
      groupe = existing.rows[0];
      if (groupe.periode !== periode.trim()) {
        await pool.query(
          'UPDATE historique_arrivee_groupes SET periode = $1 WHERE id = $2',
          [periode.trim(), groupe.id]
        );
        groupe.periode = periode.trim();
      }
    } else {
      const insertRes = await pool.query(
        'INSERT INTO historique_arrivee_groupes (periode) VALUES ($1) RETURNING *',
        [periode.trim()]
      );
      groupe = insertRes.rows[0];
    }

    const groupeId = groupe.id;
    const totalDemandes = dossierIds && Array.isArray(dossierIds) ? dossierIds.length : 0;

    let dossiers;
    if (dossierIds && Array.isArray(dossierIds) && dossierIds.length > 0) {
      dossiers = await pool.query(
        `SELECT d.id, d.num_chrono, d.nom_association, d.siege, d.district, d.president,
                d.type_dossier, d.date_depot, d.heure_depot, d.abreviation,
                COALESCE(NULLIF(a.abreviation, ''), d.abreviation, '') AS abreviation_assoc
         FROM dossiers d
         LEFT JOIN associations a ON a.id = d.association_id
         WHERE d.id = ANY($1::int[])
           AND EXISTS (SELECT 1 FROM annuaire_entries ae WHERE ae.dossier_id = d.id)
           AND NOT EXISTS (SELECT 1 FROM historique_arrivee ha WHERE ha.dossier_id = d.id)`,
        [dossierIds]
      );
    } else {
      dossiers = await pool.query(
        `SELECT d.id, d.num_chrono, d.nom_association, d.siege, d.district, d.president,
                d.type_dossier, d.date_depot, d.heure_depot, d.abreviation,
                COALESCE(NULLIF(a.abreviation, ''), d.abreviation, '') AS abreviation_assoc
         FROM dossiers d
         LEFT JOIN associations a ON a.id = d.association_id
         WHERE d.status NOT IN ('defavorable_traite', 'historique_sortie')
           AND EXISTS (SELECT 1 FROM annuaire_entries ae WHERE ae.dossier_id = d.id)
           AND NOT EXISTS (SELECT 1 FROM historique_arrivee ha WHERE ha.dossier_id = d.id)`
      );
    }

    const archivedCount = dossiers.rows.length;
    const skippedCount = totalDemandes > 0 ? totalDemandes - archivedCount : 0;

    if (archivedCount === 0) {
      const msg =
        totalDemandes > 0
          ? `Aucun des ${totalDemandes} dossier(s) sélectionné(s) n'est présent dans l'annuaire. Aucun dossier archivé.`
          : "Aucun dossier trouvé dans l'annuaire à archiver";
      return res.json({ message: msg, archivedCount: 0, skippedCount: totalDemandes, groupe });
    }

    for (const d of dossiers.rows) {
      const abrevFinal =
        d.abreviation_assoc && d.abreviation_assoc.trim()
          ? d.abreviation_assoc.trim()
          : d.abreviation || '';
      // ⚠️ Formater la date en YYYY-MM-DD pour éviter le décalage de fuseau horaire
      // PostgreSQL retourne les DATE comme des objets Date JS (minuit UTC), ce qui
      // peut décaler d'un jour selon le fuseau horaire du serveur.
      const dateArriveeStr = d.date_depot instanceof Date
        ? d.date_depot.toISOString().split('T')[0]
        : String(d.date_depot).split(' ')[0] || d.date_depot;
      await pool.query(
        `INSERT INTO historique_arrivee (groupe_id, dossier_id, num_chrono, nom_association, siege, district, president, type_dossier, abreviation, date_arrivee, heure_depot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11)`,
        [
          groupeId,
          d.id,
          d.num_chrono,
          d.nom_association || '',
          d.siege || '',
          d.district || '',
          d.president || '',
          d.type_dossier || '',
          abrevFinal,
          dateArriveeStr,
          d.heure_depot ? String(d.heure_depot).slice(0, 5) + ':00' : null,
        ]
      );
    }

    const targetIds = dossiers.rows.map((d: any) => d.id);
    await pool.query("UPDATE dossiers SET status = 'archive_arrivee' WHERE id = ANY($1::int[])", [
      targetIds,
    ]);

    invalidateCacheHistoriqueArrivee(groupeId);
    try {
      const { invalidateStatsCache } = await import('../utils/statsCache');
      invalidateStatsCache();
    } catch (_) {}

    try {
      getIO()?.emit('dossiers:archived', { ids: targetIds });
    } catch (_) {}
    try {
      getIO()?.emit('historique-arrivee:changed', { groupeId });
    } catch (_) {}

    let message = `${archivedCount} dossier(s) archivé(s) dans l'historique arrivée`;
    if (skippedCount > 0)
      message += `. ${skippedCount} dossier(s) ignoré(s) car non présent(s) dans l'annuaire.`;

    res.json({ message, archivedCount, skippedCount, groupe });
  } catch (err) {
    console.error('❌ Erreur archivage arrivée :', err);
    res.status(500).json({ error: "Erreur lors de l'archivage" });
  }
};

// ================================================================
// LISTER LES GROUPES D'ARRIVÉE
// ================================================================

export const listerGroupesArrivee = async (req: Request, res: Response) => {
  try {
    const groupes = await pool.query(
      'SELECT * FROM historique_arrivee_groupes ORDER BY date_creation DESC'
    );
    res.json(groupes.rows);
  } catch (err) {
    console.error('❌ Erreur listage groupes arrivée :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des groupes' });
  }
};

// ================================================================
// LISTER LES ARRIVÉES PAR GROUPE (AVEC PAGINATION)
// ================================================================

export const listerArriveesParGroupe = async (req: Request, res: Response) => {
  const { groupeId } = req.params;
  const id = parseInt(String(groupeId));

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de groupe invalide' });
  }

  // Paramètres de pagination
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;

  try {
    // Vérifier le cache pour la page 1 (pratique courante)
    if (page === 1) {
      const cached = getCacheHistoriqueArrivee(id);
      if (cached) {
        // Retourner les données avec pagination
        const total = cached.length;
        const paginatedData = cached.slice(0, limit);
        return res.json({
          data: paginatedData,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }
    }

    // Requête SQL avec pagination — TO_CHAR pour éviter le décalage JS Date (fuseau horaire)
    const result = await pool.query(
      `
      SELECT ha.*,
        TO_CHAR(ha.date_arrivee, 'YYYY-MM-DD') AS date_arrivee,
        TO_CHAR(ha.heure_depot, 'HH24:MI') AS heure_depot,
        COALESCE(NULLIF(ha.nom_association, ''), a.nom, '') AS nom_association,
        COALESCE(NULLIF(ha.siege, ''), a.siege, '') AS siege,
        COALESCE(NULLIF(ha.district, ''), a.district, '') AS district,
        COALESCE(NULLIF(ha.president, ''), a.president, '') AS president,
        COALESCE(a.abreviation, '') AS abreviation
      FROM historique_arrivee ha
      LEFT JOIN dossiers d ON d.id = ha.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE ha.groupe_id = $1
      ORDER BY ha.date_arrivee DESC, ha.id DESC
      LIMIT $2 OFFSET $3
    `,
      [id, limit, offset]
    );

    // Récupérer le total pour la pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM historique_arrivee WHERE groupe_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].total);

    // Si page 1, stocker en cache (pour les futures requêtes)
    if (page === 1) {
      setCacheHistoriqueArrivee(id, result.rows);
    }

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('❌ Erreur listage arrivées par groupe :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
};

// ================================================================
// RECHERCHE DANS L'HISTORIQUE ARRIVÉE (AVEC PAGINATION)
// ================================================================

export const rechercherHistoriqueArrivee = async (req: Request, res: Response) => {
  const { q, groupeId, limit = 50, page = 1 } = req.query;

  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(400).json({ error: 'Terme de recherche requis' });
  }

  const searchTerm = `%${q.trim().toLowerCase()}%`;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const limitValue = Math.min(parseInt(limit as string), 100);

  try {
    let query = `
      SELECT ha.*,
        COALESCE(NULLIF(ha.nom_association, ''), a.nom, '') AS nom_association,
        COALESCE(NULLIF(ha.siege, ''), a.siege, '') AS siege,
        COALESCE(NULLIF(ha.district, ''), a.district, '') AS district,
        COALESCE(NULLIF(ha.president, ''), a.president, '') AS president,
        COALESCE(a.abreviation, '') AS abreviation
      FROM historique_arrivee ha
      LEFT JOIN dossiers d ON d.id = ha.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE (LOWER(ha.num_chrono) LIKE $1
        OR LOWER(ha.nom_association) LIKE $1
        OR LOWER(ha.siege) LIKE $1
        OR LOWER(ha.president) LIKE $1
        OR LOWER(ha.abreviation) LIKE $1)
    `;
    const params: any[] = [searchTerm];

    if (groupeId) {
      const gid = parseInt(groupeId as string);
      if (!isNaN(gid) && gid > 0) {
        query += ` AND ha.groupe_id = $${params.length + 1}`;
        params.push(gid);
      }
    }

    const countQuery = query.replace(
      /SELECT ha\.\*, .*? FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    query += ` ORDER BY ha.date_arrivee DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limitValue, offset);

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: limitValue,
        total,
        totalPages: Math.ceil(total / limitValue),
      },
    });
  } catch (err) {
    console.error('❌ Erreur recherche historique arrivée :', err);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
};
