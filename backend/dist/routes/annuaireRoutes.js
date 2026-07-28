"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/annuaireRoutes.ts
const express_1 = require("express");
const annuaireController_1 = require("../controllers/annuaireController");
const validate_1 = require("../middleware/validate");
const dossierSchema_1 = require("../validations/dossierSchema");
const router = (0, express_1.Router)();
router.get('/groupes', annuaireController_1.listerGroupes);
router.post('/groupes', (0, validate_1.validate)(dossierSchema_1.creerGroupeSchema), annuaireController_1.creerGroupe);
router.post('/associations', (0, validate_1.validate)(dossierSchema_1.ajouterAssociationSchema), annuaireController_1.ajouterAssociationManuelle);
router.put('/associations/:id', annuaireController_1.modifierAssociation);
router.delete('/associations/:id', annuaireController_1.supprimerAssociation);
router.get('/groupes/:groupeId/associations', annuaireController_1.listerAssociationsParGroupe);
router.post('/archiver', (0, validate_1.validate)(dossierSchema_1.archiverDossiersSchema), annuaireController_1.archiverDossiers);
router.get('/chronos', annuaireController_1.listerChronosAnnuaire);
exports.default = router;
