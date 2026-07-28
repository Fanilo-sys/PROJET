import { Router } from 'express';
import {
  archiverArrivee,
  listerGroupesArrivee,
  listerArriveesParGroupe,
  rechercherHistoriqueArrivee,
} from '../controllers/historiqueArriveeController';
import { validateGroupeIdParam } from '../middleware/validateParams';

const router = Router();

router.post('/', archiverArrivee);
router.get('/groupes', listerGroupesArrivee);
router.get('/groupes/:groupeId', validateGroupeIdParam, listerArriveesParGroupe);
router.get('/recherche', rechercherHistoriqueArrivee);

export default router;