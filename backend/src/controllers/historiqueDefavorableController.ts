import { Request, Response } from 'express';
import pool from '../config/db';
import {
  getCacheHistoriqueDefavorable,
  setCacheHistoriqueDefavorable,
  invalidateCacheHistoriqueDefavorable,
} from '../utils/statsCache';

// ================================================================
// AJOUTER UNE ENTRÉE DANS L'HISTORIQUE DÉFAVORABLE
// ================================================================

export const ajouterHistoriqueDefavorable = async (req: Request, res: Response) => {
  console.log('📝 Réception requête historique défavorable :', req.body);

  const {
    dossier_id,
    num_chrono,
    nom_association,
    siege,
    district,
    president,
    type_dossier,
    date_arrivee,
    heure_depot,
    personne_correction,
    date_prise,
    heure_prise,
    abreviation,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO historique_defavorable
       (dossier_id, num_chrono, nom_association, siege, district, president, type_dossier,
        date_arrivee, heure_depot, personne_correction, date_prise, heure_prise, abreviation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        dossier_id,
        num_chrono || '',
        nom_association || '',
        siege || '',
        district || '',
        president || '',
        type_dossier || '',
        date_arrivee,
        heure_depot || '',
        personne_correction || 'Agent',
        date_prise,
        heure_prise || '',
        abreviation || '',
      ]
    );

    invalidateCacheHistoriqueDefavorable();

    console.log('✅ Historique défavorable inséré avec succès, ID :', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    console.error('❌ Erreur lors de l\'insertion dans historique_defavorable :', err);

    let errorMessage = 'Erreur interne du serveur';
    let errorStack: string | undefined;

    if (err instanceof Error) {
      errorMessage = err.message;
      errorStack = err.stack;
      // Si c'est une erreur PostgreSQL, on peut avoir plus de détails
      if ('code' in err && 'detail' in err) {
        // Cast uniquement pour accéder aux propriétés PostgreSQL
        const pgError = err as { code?: string; detail?: string };
        errorMessage = `PostgreSQL error [${pgError.code}]: ${pgError.detail || err.message}`;
      }
    }

    res.status(500).json({
      error: "Erreur lors de l'ajout à l'historique défavorable",
      details: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
    });
  }
};

// ================================================================
// LISTER L'HISTORIQUE DÉFAVORABLE (AVEC PAGINATION)
// ================================================================

export const listerHistoriqueDefavorable = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    // Vérifier le cache pour la page 1
    if (page === 1) {
      const cached = getCacheHistoriqueDefavorable();
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
      SELECT hd.*,
        COALESCE(NULLIF(a.nom, ''), hd.nom_association, '') AS nom_association,
        COALESCE(NULLIF(a.siege, ''), hd.siege, '') AS siege,
        COALESCE(NULLIF(a.district, ''), hd.district, '') AS district,
        COALESCE(NULLIF(a.president, ''), hd.president, '') AS president,
        COALESCE(NULLIF(a.abreviation, ''), d.abreviation, '') AS abreviation
      FROM historique_defavorable hd
      LEFT JOIN dossiers d ON d.id = hd.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
      ORDER BY hd.date_arrivee DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );

    // Récupérer le total pour la pagination
    const countResult = await pool.query('SELECT COUNT(*) as total FROM historique_defavorable');
    const total = parseInt(countResult.rows[0].total);

    // Si page 1, stocker en cache
    if (page === 1) {
      setCacheHistoriqueDefavorable(result.rows);
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
    console.error('❌ Erreur listage historique défavorable :', err);
    res.status(500).json({ error: "Erreur lors de la récupération de l'historique" });
  }
};

// ================================================================
// RECHERCHE DANS L'HISTORIQUE DÉFAVORABLE (AVEC PAGINATION)
// ================================================================

export const rechercherHistoriqueDefavorable = async (req: Request, res: Response) => {
  const { q, limit = 50, page = 1 } = req.query;

  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(400).json({ error: 'Terme de recherche requis' });
  }

  const searchTerm = `%${q.trim().toLowerCase()}%`;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const limitValue = Math.min(parseInt(limit as string), 100);

  try {
    const query = `
      SELECT hd.*,
        COALESCE(NULLIF(a.nom, ''), hd.nom_association, '') AS nom_association,
        COALESCE(NULLIF(a.siege, ''), hd.siege, '') AS siege,
        COALESCE(NULLIF(a.district, ''), hd.district, '') AS district,
        COALESCE(NULLIF(a.president, ''), hd.president, '') AS president,
        COALESCE(NULLIF(a.abreviation, ''), d.abreviation, '') AS abreviation
      FROM historique_defavorable hd
      LEFT JOIN dossiers d ON d.id = hd.dossier_id
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE (LOWER(hd.num_chrono) LIKE $1
        OR LOWER(hd.nom_association) LIKE $1
        OR LOWER(hd.siege) LIKE $1
        OR LOWER(hd.president) LIKE $1
        OR LOWER(hd.abreviation) LIKE $1
        OR LOWER(hd.personne_correction) LIKE $1)
    `;
    const params: any[] = [searchTerm];

    const countQuery = query.replace(
      /SELECT hd\.\*, .*? FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const finalQuery =
      query + ` ORDER BY hd.date_arrivee DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
    console.error('❌ Erreur recherche historique défavorable :', err);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
};