import { Request, Response } from 'express';
import pool from '../config/db';
import { getIO } from '../socket';
import { syncCategories } from '../services/categorieService';


export const listerGroupes = async (req: Request, res: Response) => {
  try {
    const groupes = await pool.query('SELECT * FROM annuaire_groupes ORDER BY date_creation DESC');
    res.status(200).json(groupes.rows);
  } catch (err) {
    console.error('❌ Erreur listage groupes :', err);
    res.status(500).json({ error: "Erreur lors de la récupération des groupes" });
  }
};

export const creerGroupe = async (req: Request, res: Response) => {
  const { periode } = req.body;
  const p = periode ? String(periode).trim() : '';
  if (!p) return res.status(400).json({ error: 'Période requise' });
  try {
    let groupe;
    try {
      const insertRes = await pool.query(
        'INSERT INTO annuaire_groupes (periode) VALUES ($1) RETURNING *',
        [p]
      );
      groupe = insertRes.rows[0];
    } catch (err: any) {
      if (err && err.code === '23505') {
        const existing = await pool.query(
          'SELECT * FROM annuaire_groupes WHERE lower(trim(periode)) = lower(trim($1)) LIMIT 1',
          [p]
        );
        groupe = existing.rows[0];
      } else throw err;
    }
    try { getIO().emit('annuaire:groupCreated', groupe); } catch (_) {}
    return res.status(201).json(groupe);
  } catch (err) {
    console.error('❌ Erreur création groupe :', err);
    res.status(500).json({ error: "Erreur lors de la création du groupe" });
  }
};

export const ajouterAssociationManuelle = async (req: Request, res: Response) => {
  const {
    groupeId,
    periode,
    numero_sortie,
    nom_association,
    abreviation,
    siege,
    president,
    objet,
    type_dossier,
    arn,
    recuFr,
    recuMg,
    categorie,   // <-- NOUVEAU : récupération de la catégorie
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Récupérer ou créer le groupe d'annuaire
    let gid = groupeId;
    if (!gid && periode) {
      const p = String(periode).trim();
      try {
        const insertRes = await client.query(
          'INSERT INTO annuaire_groupes (periode) VALUES ($1) RETURNING id',
          [p]
        );
        gid = insertRes.rows[0].id;
      } catch (err: any) {
        if (err && err.code === '23505') {
          const existing = await client.query(
            'SELECT id FROM annuaire_groupes WHERE lower(trim(periode)) = lower(trim($1)) LIMIT 1',
            [p]
          );
          gid = existing.rows[0]?.id;
          if (!gid) throw new Error('Impossible de récupérer le groupe existant');
        } else {
          throw err;
        }
      }
    }

    if (!gid) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Groupe ID ou période requis' });
    }

    // 2. Préparer les dates
    const now = new Date();
    const dateDepot = now.toISOString().split('T')[0];
    const heureDepot = now.toTimeString().slice(0, 5);

    // 3. Créer le dossier
    const dossierResult = await client.query(
      `INSERT INTO dossiers (
        num_chrono, nom_association, siege, president, type_dossier,
        objet, abreviation, date_depot, heure_depot, status,
        arn, recu_fr, recu_mg
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'annuaire', $10, $11, $12)
      RETURNING id`,
      [
        numero_sortie || '',
        nom_association || '',
        siege || '',
        president || '',
        type_dossier || 'Création',
        objet || '',
        abreviation || '',
        dateDepot,
        heureDepot,
        arn || '',
        recuFr || '',
        recuMg || '',
      ]
    );
    const dossierId = dossierResult.rows[0].id;

    // ════════════════════════════════════════════════════════════════
    // ✅ AJOUT CRITIQUE : Synchronisation des catégories
    // ════════════════════════════════════════════════════════════════
    await syncCategories(client, dossierId, categorie || 'Autre');
    // ════════════════════════════════════════════════════════════════

    // 4. Associer ou créer l'association
    if (nom_association) {
      const assoc = await client.query(
        `SELECT id FROM associations WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1)) LIMIT 1`,
        [nom_association.trim()]
      );

      let assocId: number;
      if (assoc.rows.length > 0) {
        assocId = assoc.rows[0].id;
        // Mettre à jour l'association existante avec les nouvelles infos (si plus complètes)
        await client.query(
          `UPDATE associations SET
            siege = COALESCE(NULLIF($1, ''), siege),
            president = COALESCE(NULLIF($2, ''), president),
            abreviation = COALESCE(NULLIF($3, ''), abreviation)
           WHERE id = $4`,
          [siege || '', president || '', abreviation || '', assocId]
        );
      } else {
        const newAssoc = await client.query(
          `INSERT INTO associations (nom, siege, president, abreviation)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [nom_association.trim(), siege || '', president || '', abreviation || '']
        );
        assocId = newAssoc.rows[0].id;
      }

      await client.query(
        'UPDATE dossiers SET association_id = $1 WHERE id = $2',
        [assocId, dossierId]
      );
    }

    // 5. Lier le dossier au groupe d'annuaire
    await client.query(
      `INSERT INTO annuaire_entries (dossier_id, groupe_id)
       VALUES ($1, $2)
       ON CONFLICT (dossier_id) DO NOTHING`,
      [dossierId, gid]
    );

    await client.query('COMMIT');

    // 6. Récupérer l'entrée complète pour la réponse
    const fullEntry = await pool.query(`
      SELECT d.*,
        COALESCE(NULLIF(a.nom, ''), d.nom_association, '') AS nom_association,
        COALESCE(NULLIF(a.siege, ''), d.siege, '') AS siege,
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
      WHERE d.id = $1
    `, [dossierId]);

    try {
      getIO().emit('annuaire:associationAdded', {
        association: fullEntry.rows[0],
        groupeId: gid
      });
    } catch (_) {}

    res.status(201).json(fullEntry.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur ajout manuel annuaire :', err);
    res.status(500).json({ error: "Erreur lors de l'ajout de l'association" });
  } finally {
    client.release();
  }
};

export const archiverDossiers = async (req: Request, res: Response) => {
  const { dossierIds, groupeId } = req.body;
  try {
    // Vérifier que les dossiers existent
    const dossiers = await pool.query(
      'SELECT id, status FROM dossiers WHERE id = ANY($1::int[])',
      [dossierIds]
    );

    if (dossiers.rows.length === 0) {
      return res.status(404).json({ error: "Aucun dossier trouvé" });
    }

    // Insérer les entrées annuaire
    for (const d of dossiers.rows) {
      await pool.query(
        `INSERT INTO annuaire_entries (dossier_id, groupe_id) VALUES ($1, $2) ON CONFLICT (dossier_id) DO NOTHING`,
        [d.id, groupeId]
      );
    }

    // Mettre à jour le statut
    const targetIds = dossiers.rows.map(d => d.id);
    await pool.query(
      "UPDATE dossiers SET status = 'archive_annuaire' WHERE id = ANY($1::int[])",
      [targetIds]
    );

    try {
      getIO().emit('annuaire:changed', { groupeId });
      getIO().emit('dossiers:archived', { ids: targetIds });
    } catch (_) {}
    res.json({ message: `${dossiers.rows.length} dossier(s) archivé(s)` });
  } catch (err) {
    console.error('❌ Erreur archivage :', err);
    res.status(500).json({ error: "Erreur lors de l'archivage" });
  }
};

export const listerAssociationsParGroupe = async (req: Request, res: Response) => {
  const { groupeId } = req.params;
  try {
    // Lister les dossiers liés à ce groupe via annuaire_entries
    const result = await pool.query(`
      SELECT d.*,
        COALESCE(NULLIF(a.nom, ''), d.nom_association, '') AS nom_association,
        COALESCE(NULLIF(a.siege, ''), d.siege, '') AS siege,
        COALESCE(NULLIF(a.district, ''), d.district, '') AS district,
        COALESCE(NULLIF(a.president, ''), d.president, '') AS president,
        COALESCE(NULLIF(a.abreviation, ''), d.abreviation, '') AS abreviation,
        a.nom AS association_nom,
        a.siege AS association_siege,
        a.district AS association_district,
        a.president AS association_president,
        a.abreviation AS association_abreviation
      FROM dossiers d
      JOIN annuaire_entries ae ON ae.dossier_id = d.id
      LEFT JOIN associations a ON a.id = d.association_id
      WHERE ae.groupe_id = $1
      ORDER BY d.nom_association
    `, [groupeId]);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur listage associations par groupe :', err);
    res.status(500).json({ error: "Erreur lors de la récupération des associations" });
  }
};

export const modifierAssociation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nom_association, siege, president, type_dossier, objet, abreviation, arn, recuFr, recuMg } = req.body;
  try {
    // Mettre à jour le dossier sous-jacent
    const result = await pool.query(
      `UPDATE dossiers SET
        nom_association = COALESCE($2, nom_association),
        siege = COALESCE($3, siege),
        president = COALESCE($4, president),
        type_dossier = COALESCE($5, type_dossier),
        objet = COALESCE($6, objet),
        abreviation = COALESCE($7, abreviation),
        arn = COALESCE($8, arn),
        recu_fr = COALESCE($9, recu_fr),
        recu_mg = COALESCE($10, recu_mg),
        date_modification = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id`,
      [id, nom_association, siege, president, type_dossier, objet, abreviation, arn, recuFr, recuMg]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Entrée non trouvée" });

    // Mettre à jour l'association si le nom change
    if (nom_association) {
      const assoc = await pool.query(
        `SELECT id FROM associations WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1)) LIMIT 1`,
        [nom_association.trim()]
      );
      if (assoc.rows.length > 0) {
        await pool.query('UPDATE dossiers SET association_id = $1 WHERE id = $2', [assoc.rows[0].id, id]);
      } else {
        const newAssoc = await pool.query(
          `INSERT INTO associations (nom, siege, president) VALUES ($1, $2, $3) RETURNING id`,
          [nom_association.trim(), siege || '', president || '']
        );
        await pool.query('UPDATE dossiers SET association_id = $1 WHERE id = $2', [newAssoc.rows[0].id, id]);
      }
    }

    const updated = await pool.query(`
      SELECT d.*,
        COALESCE(NULLIF(a.nom, ''), d.nom_association, '') AS nom_association,
        COALESCE(NULLIF(a.siege, ''), d.siege, '') AS siege,
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
      WHERE d.id = $1
    `, [id]);
    try { getIO().emit('annuaire:changed', { association: updated.rows[0] }); } catch (_) {}
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Erreur modification association', err);
    res.status(500).json({ error: "Erreur lors de la modification" });
  }
};

export const listerChronosAnnuaire = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT d.num_chrono FROM dossiers d JOIN annuaire_entries ae ON ae.dossier_id = d.id WHERE d.num_chrono IS NOT NULL AND d.num_chrono != \'\''
    );
    res.json(result.rows.map((r: any) => r.num_chrono));
  } catch (err) {
    console.error('❌ Erreur listage chronos annuaire :', err);
    res.status(500).json({ error: "Erreur lors de la récupération des chronos" });
  }
};

export const supprimerAssociation = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Supprimer l'entrée annuaire (annuaire_entries), puis le dossier
    await pool.query('DELETE FROM annuaire_entries WHERE dossier_id = $1', [id]);
    const result = await pool.query(
      'DELETE FROM dossiers WHERE id = $1 AND status IN (\'annuaire\', \'archive_annuaire\') RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Entrée non trouvée" });
    try { getIO().emit('annuaire:changed', { deletedId: id }); } catch (_) {}
    res.json({ message: "Entrée annuaire supprimée" });
  } catch (err) {
    console.error('Erreur suppression association', err);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
};
