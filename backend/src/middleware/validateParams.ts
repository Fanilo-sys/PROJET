import { Request, Response, NextFunction } from 'express';

/**
 * Valide que req.params.id est un entier strictement positif.
 */
export const validateIdParam = (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'ID invalide : doit être un entier positif' });
  }
  next();
};

/**
 * Valide que req.params.statut est un statut autorisé.
 */
const STATUTS_AUTORISES = [
  'reception', 'en_attente', 'en_cours', 'defavorable',
  'defavorable_traite', 'livraison', 'registre_chrono',
  'annuaire', 'archive_annuaire', 'archive_arrivee',
  'historique_sortie', 'historique_arrivee',
  'historique_defavorable', 'duplicata'
];

export const validateStatutParam = (req: Request, res: Response, next: NextFunction) => {
  const statut = req.params.statut as string;
  if (!STATUTS_AUTORISES.includes(statut)) {
    return res.status(400).json({ error: `Statut invalide : "${statut}". Statuts autorisés : ${STATUTS_AUTORISES.join(', ')}` });
  }
  next();
};

/**
 * Valide que req.params.groupeId est un entier strictement positif.
 */
export const validateGroupeIdParam = (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.groupeId as string);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de groupe invalide : doit être un entier positif' });
  }
  next();
};

/**
 * Valide que le paramètre `limit` dans req.query est un entier positif valide.
 */
export const validateLimitQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.limit !== undefined) {
    const limit = parseInt(req.query.limit as string);
    if (isNaN(limit) || limit <= 0 || limit > 1000) {
      return res.status(400).json({ error: 'Paramètre limit invalide (doit être entre 1 et 1000)' });
    }
  }
  next();
};

/**
 * Valide que le paramètre `statuts` dans req.query ne contient que des statuts autorisés.
 */
export const validateStatutsQuery = (req: Request, res: Response, next: NextFunction) => {
  const statutsParam = req.query.statuts as string | undefined;
  if (statutsParam) {
    const statusList = statutsParam.split(',');
    for (const s of statusList) {
      if (!STATUTS_AUTORISES.includes(s.trim())) {
        return res.status(400).json({ error: `Statut "${s.trim()}" non autorisé` });
      }
    }
  }
  next();
};

/**
 * Valide que le paramètre `cursor` dans req.query est un entier valide.
 */
export const validateCursorQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.cursor !== undefined) {
    const cursor = parseInt(req.query.cursor as string);
    if (isNaN(cursor) || cursor < 0) {
      return res.status(400).json({ error: 'Paramètre cursor invalide (doit être un entier >= 0)' });
    }
  }
  next();
};
