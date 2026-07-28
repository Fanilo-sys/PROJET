// backend/src/routes/annuaireRoutes.ts
import { Router } from 'express';
import { 
  listerGroupes, creerGroupe, archiverDossiers, listerAssociationsParGroupe, 
  ajouterAssociationManuelle, modifierAssociation, supprimerAssociation,
  listerChronosAnnuaire
} from '../controllers/annuaireController';
import { validate } from '../middleware/validate';
import { creerGroupeSchema, ajouterAssociationSchema, archiverDossiersSchema } from '../validations/dossierSchema';
import { validateIdParam, validateGroupeIdParam } from '../middleware/validateParams';

const router = Router();

router.get('/groupes', listerGroupes);
router.post('/groupes', validate(creerGroupeSchema), creerGroupe);
router.post('/associations', validate(ajouterAssociationSchema), ajouterAssociationManuelle);
router.put('/associations/:id', validateIdParam, modifierAssociation);
router.delete('/associations/:id', validateIdParam, supprimerAssociation);
router.get('/groupes/:groupeId/associations', validateGroupeIdParam, listerAssociationsParGroupe);
router.post('/archiver', validate(archiverDossiersSchema), archiverDossiers);
router.get('/chronos', listerChronosAnnuaire);

export default router;
