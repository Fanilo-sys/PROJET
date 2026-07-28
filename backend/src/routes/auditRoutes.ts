import { Router } from 'express';
import pool from '../config/db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * Récupérer tous les logs d'audit (derniers 200 par défaut)
 * GET /api/audit/journal?limit=200
 */
router.get('/journal', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    
    const result = await pool.query(
      `SELECT al.*, u.username
       FROM audit_log al
       LEFT JOIN utilisateurs u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur récupération journal:', err);
    res.status(500).json({ error: 'Erreur récupération du journal d\'audit' });
  }
});

/**
 * Récupérer l'historique d'un dossier spécifique
 * GET /api/audit/dossiers/:id
 */
router.get('/dossiers/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT al.*, u.username
       FROM audit_log al
       LEFT JOIN utilisateurs u ON u.id = al.user_id
       WHERE al.table_name = 'dossiers' AND al.record_id = $1
       ORDER BY al.created_at DESC`,
      [id]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur récupération historique dossier:', err);
    res.status(500).json({ error: 'Erreur récupération de l\'historique du dossier' });
  }
});

export default router;