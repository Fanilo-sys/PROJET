import { Router } from 'express';
import {
  ajouterSortie,
  listerSorties,
  rechercherHistoriqueSortie,
  listerSortiesParDossier,
} from '../controllers/historiqueSortieController';
import { validateIdParam } from '../middleware/validateParams';

const router = Router();

router.post('/', ajouterSortie);
router.get('/', listerSorties);
router.get('/recherche', rechercherHistoriqueSortie);
router.get('/dossier/:dossierId', validateIdParam, listerSortiesParDossier);

export default router;