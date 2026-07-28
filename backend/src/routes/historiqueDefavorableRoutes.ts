import { Router } from 'express';
import {
  ajouterHistoriqueDefavorable,
  listerHistoriqueDefavorable,
  rechercherHistoriqueDefavorable,
} from '../controllers/historiqueDefavorableController';
import { validate } from '../middleware/validate';
import { historiqueDefavorableSchema } from '../validations/dossierSchema';

const router = Router();

router.post('/', validate(historiqueDefavorableSchema), ajouterHistoriqueDefavorable);
router.get('/', listerHistoriqueDefavorable);
router.get('/recherche', rechercherHistoriqueDefavorable);

export default router;