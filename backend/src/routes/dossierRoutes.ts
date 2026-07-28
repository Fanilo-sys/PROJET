import { Router } from 'express';
import {
  creerDossier,
  listerDossiers,
  rechercherDossiers,
  modifierDossier,
  modifierDossierComplet,
  supprimerDossier,
  listerDossiersParStatut,
  listerDossiersParStatuts,
  getStats,
  getDossiersParCategorieCtrl,
  getDossiersParDistrictCtrl,
  getDossiersParTypeCtrl,
  creerDuplicata,
  approuverDuplicata,
  listerDuplicatas,
  archiverSortie,
  corrigerDefavorable,
} from '../controllers/dossierController';
import { validate } from '../middleware/validate';
import { creerDossierSchema, modifierDossierSchema, modifierDossierCompletSchema } from '../validations/dossierSchema';
import {
  validateIdParam,
  validateStatutParam,
  validateLimitQuery,
  validateStatutsQuery,
  validateCursorQuery
} from '../middleware/validateParams';


const router = Router();

router.post('/', validate(creerDossierSchema), creerDossier);
router.get('/', validateLimitQuery, validateCursorQuery, listerDossiers);
router.patch('/:id', validateIdParam, validate(modifierDossierSchema), modifierDossier);
router.put('/:id', validateIdParam, validate(modifierDossierCompletSchema), modifierDossierComplet);
router.delete('/:id', validateIdParam, supprimerDossier);
router.get('/statuts', validateStatutsQuery, listerDossiersParStatuts);
router.get('/recherche', rechercherDossiers);
router.get('/statut/:statut', validateStatutParam, validateLimitQuery, validateCursorQuery, listerDossiersParStatut);
router.get('/stats', getStats);
router.get('/categorie/:categorie', getDossiersParCategorieCtrl);
router.get('/district/:district', getDossiersParDistrictCtrl);
router.get('/type/:type', getDossiersParTypeCtrl);
router.post('/duplicata', creerDuplicata);
router.post('/:id/corriger-defavorable', validateIdParam, corrigerDefavorable);
router.get('/duplicata', listerDuplicatas);
router.patch('/duplicata/:id/approuver', validateIdParam, approuverDuplicata);
router.post('/archiver-sortie', archiverSortie);

export default router;