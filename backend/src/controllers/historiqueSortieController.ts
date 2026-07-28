import { Request, Response } from 'express';
import pool from '../config/db';
import {
  getCacheHistoriqueSortie,
  setCacheHistoriqueSortie,
  invalidateCacheHistoriqueSortie,
} from '../utils/statsCache';

// ================================================================
// AJOUTER UNE SORTIE
// ================================================================

export const ajouterSortie = async (req: Request, res: Response) => {
  const { dossier_id, numero_sortie, personne_sortie, motif } = req.body;

  if (!dossier_id) {
    return res.status(400).json({ error: 'dossier_id requis' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO sorties (dossier_id, numero_sortie, personne_sortie, motif)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dossier_id, numero_sortie || '', personne_sortie || '', motif || '']
    );

    await pool.query("UPDATE dossiers SET status = 'historique_sortie' WHERE id = $1", [dossier_id]);

    invalidateCacheHistoriqueSortie();

    try {
      const { getIO } = await import('../socket');
      getIO().emit('sortie:added', { sortie: result.rows[0], dossierId: dossier_id });
    } catch (_) {}

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erreur ajout sortie :', err);
    res.status(500).json({ error: "Erreur lors de l'ajout de la sortie" });
  }
};

// ================================================================
// LISTER TOUTES LES SORTIES (AVEC PAGINATION)
// ================================================================

export const listerSorties = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    // Vérifier le cache pour la page 1
    if (page === 1) {
      const cached = getCacheHistoriqueSortie();
      if (cached) {
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

    // Requête SQL avec pagination
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.dossier_id,
        s.numero_sortie,
        s.personne_sortie,
        s.motif,
        s.date_sortie,
        d.num_chrono,
        COALESCE(a.nom, d.nom_association, '') AS nom_association,
        COALESCE(a.siege, d.siege, '') AS siege,
        COALESCE(a.president, d.president, '') AS president,
        COALESCE(a.abreviation, d.abreviation, '') AS abreviation
      FROM sorties s
      JOIN dossiers d ON d.id = s.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
      ORDER BY s.date_sortie DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );

    // Récupérer le total pour la pagination
    const countResult = await pool.query('SELECT COUNT(*) as total FROM sorties');
    const total = parseInt(countResult.rows[0].total);

    // Si page 1, stocker en cache
    if (page === 1) {
      setCacheHistoriqueSortie(result.rows);
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
    console.error('❌ Erreur listage sorties :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des sorties' });
  }
};

// ================================================================
// RECHERCHE DANS L'HISTORIQUE DES SORTIES (AVEC PAGINATION)
// ================================================================

export const rechercherHistoriqueSortie = async (req: Request, res: Response) => {
  const { q, limit = 50, page = 1 } = req.query;

  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(400).json({ error: 'Terme de recherche requis' });
  }

  const searchTerm = `%${q.trim().toLowerCase()}%`;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const limitValue = Math.min(parseInt(limit as string), 100);

  try {
    const query = `
      SELECT
        s.id,
        s.dossier_id,
        s.numero_sortie,
        s.personne_sortie,
        s.motif,
        s.date_sortie,
        d.num_chrono,
        COALESCE(a.nom, d.nom_association, '') AS nom_association,
        COALESCE(a.siege, d.siege, '') AS siege,
        COALESCE(a.president, d.president, '') AS president,
        COALESCE(a.abreviation, d.abreviation, '') AS abreviation
      FROM sorties s
      JOIN dossiers d ON d.id = s.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE (LOWER(d.num_chrono) LIKE $1
        OR LOWER(COALESCE(a.nom, d.nom_association, '')) LIKE $1
        OR LOWER(s.personne_sortie) LIKE $1
        OR LOWER(s.numero_sortie) LIKE $1
        OR LOWER(s.motif) LIKE $1)
    `;
    const params: any[] = [searchTerm];

    const countQuery = query.replace(
      /SELECT s\.id, .*? FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const finalQuery =
      query + ` ORDER BY s.date_sortie DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitValue, offset);

    const result = await pool.query(finalQuery, params);

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
    console.error('❌ Erreur recherche historique sortie :', err);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
};

// ================================================================
// RÉCUPÉRER LES SORTIES D'UN DOSSIER SPÉCIFIQUE
// ================================================================

export const listerSortiesParDossier = async (req: Request, res: Response) => {
  const { dossierId } = req.params;
  const id = parseInt(String(dossierId));

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de dossier invalide' });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.dossier_id,
        s.numero_sortie,
        s.personne_sortie,
        s.motif,
        s.date_sortie,
        d.num_chrono,
        COALESCE(a.nom, d.nom_association, '') AS nom_association
      FROM sorties s
      JOIN dossiers d ON d.id = s.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE s.dossier_id = $1
      ORDER BY s.date_sortie DESC
    `,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur listage sorties par dossier :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des sorties' });
  }
};