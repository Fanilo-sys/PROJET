import { z } from 'zod';

/**
 * Validation d'un champ heure au format HH:MM ou HH:MM:SS
 */
const heureRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const heureOptional = z.string().regex(heureRegex, 'Format heure invalide (HH:MM ou HH:MM:SS)').optional().or(z.literal(''));

export const creerDossierSchema = z.object({
  num_chrono: z.string().min(1, 'Numéro chrono requis'),
  nom_association: z.string().min(1, 'Nom association requis'),
  siege: z.string().optional().default(''),
  district: z.string().optional().default(''),
  president: z.string().optional().default(''),
  type_dossier: z.string().optional().default('Création'),
  sous_type: z.string().optional().default(''),
  /** Catégories séparées par des virgules — écrit dans la table pivot dossier_categories */
  categorie: z.string().optional().default('Autre'),
  emplacement: z.string().optional().default(''),
  arn: z.string().optional().default(''),
  recu_fr: z.string().optional().default(''),
  recu_mg: z.string().optional().default(''),
  heure_depot: heureOptional,
  date_depot: z.string().optional().default(''),
  status: z.string().optional().default('reception'),
  objet: z.string().optional().default(''),
  abreviation: z.string().optional().default(''),
});

export const modifierDossierSchema = z.object({
  verdict: z.string().optional(),
  status: z.string().optional(),
  emplacement: z.string().optional(),
});

export const modifierDossierCompletSchema = z.object({
  num_chrono: z.string().optional(),
  nom_association: z.string().optional(),
  siege: z.string().optional(),
  district: z.string().optional(),
  president: z.string().optional(),
  type_dossier: z.string().optional(),
  sous_type: z.string().optional(),
  /** Catégories séparées par des virgules — écrit dans la table pivot dossier_categories */
  categorie: z.string().optional(),
  emplacement: z.string().optional(),
  objet: z.string().optional(),
  abreviation: z.string().optional(),
  arn: z.string().optional(),
  recu_fr: z.string().optional(),
  recu_mg: z.string().optional(),
  recuFr: z.string().optional(),
  recuMg: z.string().optional(),
  date_depot: z.string().optional(),
  dateArrivee: z.string().optional(),
  heure_depot: heureOptional,
  heureArrivee: heureOptional,
});

export const creerGroupeSchema = z.object({
  periode: z.string().min(1, 'Période requise'),
});

export const ajouterAssociationSchema = z.object({
  groupeId: z.number().optional(),
  periode: z.string().optional(),
  numero_sortie: z.string().optional(),
  nom_association: z.string().optional(),
  abreviation: z.string().optional(),
  siege: z.string().optional(),
  president: z.string().optional(),
  objet: z.string().optional(),
  type_dossier: z.string().optional(),
  arn: z.string().optional(),
  recuFr: z.string().optional(),
  recuMg: z.string().optional(),
});

export const archiverDossiersSchema = z.object({
  dossierIds: z.array(z.number()).min(1, 'Au moins un dossier requis'),
  groupeId: z.number(),
});

export const historiqueDefavorableSchema = z.object({
  dossier_id: z.number(),
  num_chrono: z.string().optional(),
  nom_association: z.string().optional(),
  siege: z.string().optional(),
  district: z.string().optional(),
  president: z.string().optional(),
  type_dossier: z.string().optional(),
  categorie: z.string().optional(),
  date_arrivee: z.string().optional(),
  heure_depot: heureOptional,
  personne_correction: z.string().optional(),
  date_prise: z.string().optional(),
  heure_prise: heureOptional,
});
