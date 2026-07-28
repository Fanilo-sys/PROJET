"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historiqueDefavorableSchema = exports.archiverDossiersSchema = exports.ajouterAssociationSchema = exports.creerGroupeSchema = exports.modifierDossierCompletSchema = exports.modifierDossierSchema = exports.creerDossierSchema = void 0;
const zod_1 = require("zod");
exports.creerDossierSchema = zod_1.z.object({
    num_chrono: zod_1.z.string().min(1, 'Numéro chrono requis'),
    nom_association: zod_1.z.string().min(1, 'Nom association requis'),
    siege: zod_1.z.string().optional().default(''),
    district: zod_1.z.string().optional().default(''),
    president: zod_1.z.string().optional().default(''),
    type_dossier: zod_1.z.string().optional().default('Création'),
    sous_type: zod_1.z.string().optional().default(''),
    categorie: zod_1.z.string().optional().default('Autre'),
    emplacement: zod_1.z.string().optional().default(''),
    arn: zod_1.z.string().optional().default(''),
    recu_fr: zod_1.z.string().optional().default(''),
    recu_mg: zod_1.z.string().optional().default(''),
    heure_depot: zod_1.z.string().optional().default(''),
    date_depot: zod_1.z.string().optional().default(''),
    status: zod_1.z.string().optional().default('reception'),
    objet: zod_1.z.string().optional().default(''),
    abreviation: zod_1.z.string().optional().default(''),
});
exports.modifierDossierSchema = zod_1.z.object({
    verdict: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    emplacement: zod_1.z.string().optional(),
    numero_sortie: zod_1.z.string().optional(),
    personne_sortie: zod_1.z.string().optional(),
});
exports.modifierDossierCompletSchema = zod_1.z.object({
    num_chrono: zod_1.z.string().optional(),
    nom_association: zod_1.z.string().optional(),
    siege: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    president: zod_1.z.string().optional(),
    type_dossier: zod_1.z.string().optional(),
    categorie: zod_1.z.string().optional(),
    emplacement: zod_1.z.string().optional(),
    numero_sortie: zod_1.z.string().optional(),
    personne_sortie: zod_1.z.string().optional(),
    objet: zod_1.z.string().optional(),
    abreviation: zod_1.z.string().optional(),
});
exports.creerGroupeSchema = zod_1.z.object({
    periode: zod_1.z.string().min(1, 'Période requise'),
});
exports.ajouterAssociationSchema = zod_1.z.object({
    groupeId: zod_1.z.number().optional(),
    periode: zod_1.z.string().optional(),
    numero_sortie: zod_1.z.string().optional(),
    nom_association: zod_1.z.string().optional(),
    abreviation: zod_1.z.string().optional(),
    siege: zod_1.z.string().optional(),
    president: zod_1.z.string().optional(),
    objet: zod_1.z.string().optional(),
    type_dossier: zod_1.z.string().optional(),
    arn: zod_1.z.string().optional(),
    recuFr: zod_1.z.string().optional(),
    recuMg: zod_1.z.string().optional(),
});
exports.archiverDossiersSchema = zod_1.z.object({
    dossierIds: zod_1.z.array(zod_1.z.number()).min(1, 'Au moins un dossier requis'),
    groupeId: zod_1.z.number(),
});
exports.historiqueDefavorableSchema = zod_1.z.object({
    dossier_id: zod_1.z.number(),
    num_chrono: zod_1.z.string().optional(),
    nom_association: zod_1.z.string().optional(),
    siege: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    president: zod_1.z.string().optional(),
    type_dossier: zod_1.z.string().optional(),
    categorie: zod_1.z.string().optional(),
    date_arrivee: zod_1.z.string().optional(),
    heure_depot: zod_1.z.string().optional(),
    personne_correction: zod_1.z.string().optional(),
    date_prise: zod_1.z.string().optional(),
    heure_prise: zod_1.z.string().optional(),
});
