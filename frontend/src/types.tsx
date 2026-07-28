export type TypeDossier = 'Création' | 'Renouvellement' | 'Duplicata' | 'Arrêté';
export type SousTypeDossier = 
  | 'duplicata_pur' 
  | 'renouvellement_normal' 
  | 'arret_creation' 
  | 'arret_renouvellement' 
  | '';

/**
 * Détermine le comportement du formulaire à partir du type et sous-type.
 * Retourne 'creation' ou 'renouvellement' pour savoir quels champs afficher.
 */
export function getEffectiveType(type: TypeDossier, sous_type?: SousTypeDossier): 'creation' | 'renouvellement' {
  if (type === 'Renouvellement') return 'renouvellement';
  if (type === 'Duplicata' && sous_type === 'renouvellement_normal') return 'renouvellement';
  if (type === 'Arrêté' && sous_type === 'arret_renouvellement') return 'renouvellement';
  return 'creation';
}
export type Verdict = 'favorable' | 'defavorable' | 'aucun';
/** Statuts valides dans la base de données (contrainte CHECK) */
export type StatusDossier =
  | 'reception'
  | 'en_attente'
  | 'en_cours'
  | 'defavorable'
  | 'defavorable_traite'   
  | 'livraison'
  | 'historique_sortie'
  | 'historique_arrivee'
  | 'historique_defavorable'
  | 'registre_chrono'
  | 'annuaire'
  | 'archive_annuaire'
  | 'archive_arrivee'
  | 'duplicata';

/** Identifiants d'onglets de navigation (peut inclure des valeurs non-DB) */
export type TabId = StatusDossier | 'dashboard' | 'audit';

// ============================================================
// STATUTS PROTÉGÉS (non modifiables)
// ============================================================
export const STATUTS_PROTEGES = ['registre_chrono', 'annuaire', 'archive_annuaire', 'historique_sortie'] as const;

export type StatutProtege = typeof STATUTS_PROTEGES[number];

/**
 * Vérifie si un dossier est protégé (non modifiable)
 */
export const estProtege = (status: StatusDossier): boolean => {
  return STATUTS_PROTEGES.includes(status as StatutProtege);
};
// ============================================================

export const CATEGORIES_PREDEFINIES = [
  'Sport', 'Santé', 'Éducation', 'Culture', 'Social', 'Environnement', 'Autre'
] as const;
export type CategorieAssociation = (typeof CATEGORIES_PREDEFINIES)[number] | string;

/** Parse une chaîne de catégories séparées par virgules en tableau */
export const parseCategories = (categorie: string): string[] =>
  (categorie || '').split(',').map(c => c.trim()).filter(Boolean);

/** Sérialise un tableau de catégories en chaîne */
export const joinCategories = (categories: string[]): string =>
  categories.filter(Boolean).join(', ');

/** Champs potentiels d'un objet "dossier-like" pour la recherche */
export interface DossierSearchableFields {
  numArrivee?: string; num_chrono?: string;
  nom?: string; nom_association?: string;
  siege?: string;
  district?: string;
  president?: string;
  categorie?: string;
  type?: string; type_dossier?: string;
  dateArrivee?: string; date_depot?: string;
  numeroSortie?: string; numero_sortie?: string; num_sortie?: string;
  abreviation?: string; sigle?: string;
}

/**
 * Vérifie si un terme de recherche correspond à un dossier.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const matchesSearchTerm = (d: any, search: string): boolean => {
  if (!search.trim()) return true;
  const raw = search.toLowerCase().trim();

  // Prendre en compte les deux formes de nommage (frontend legacy + backend normalisé)
  const fields = [
    d.num_chrono || d.numArrivee || '',
    d.nom_association || d.nom || '',
    d.siege || '',
    d.district || '',
    d.president || '',
    d.categorie || '',
    d.type_dossier || d.type || '',
    d.date_depot || d.dateArrivee || '',
    d.numero_sortie || d.num_sortie || '',
    d.abreviation || d.sigle || '',
  ].map(f => String(f).toLowerCase());

  const fragments = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (fragments.length === 0) return true;

  return fragments.every(frag => fields.some(f => f.includes(frag)));
};

// ============================================================
// INTERFACE DOSSIER UNIFIÉE
// Tous les noms de champs suivent la nomenclature backend.
// Les alias (nom, numArrivee, type, dateArrivee) sont conservés
// comme accesseurs de compatibilité mais pointent vers le même champ.
// ============================================================
export interface Dossier {
  id: number;

  // --- Champs réels (nomenclature backend) ---
  num_chrono: string;
  nom_association: string;
  siege: string;
  district: string;
  president: string;
  abreviation: string;
  type_dossier: TypeDossier;
  sous_type: SousTypeDossier;
  sous_type_id?: number;
  objet: string;
  date_depot: string;
  heure_depot: string;
  status: StatusDossier;
  verdict: Verdict;
  emplacement: string;
  arn: string;
  recu_fr: string;
  recu_mg: string;
  association_id?: number;
  /** Catégorie(s) — chaîne unique, peut contenir plusieurs catégories séparées par ', ' */
  categorie: string;
  numero_sortie?: string;
  personne_sortie?: string;

  // --- Accesseurs de compatibilité (lecture seule) ---
  get numArrivee(): string;
  get nom(): string;
  get type(): TypeDossier;
  get dateArrivee(): string;
  get heureArrivee(): string;
  get recuFr(): string;
  get recuMg(): string;
  get sigle(): string;
  get numeroSortie(): string | undefined;
  get personneSortie(): string | undefined;
}

/**
 * Crée un objet Dossier à partir des données brutes de l'API.
 * Utilise `Object.defineProperty` pour les accesseurs de compatibilité.
 */
export function createDossier(data: Partial<Dossier> & { id: number }): Dossier {
  const d = {
    id: data.id,
    num_chrono: data.num_chrono || '',
    nom_association: data.nom_association || '',
    siege: data.siege || '',
    district: data.district || '',
    president: data.president || '',
    abreviation: data.abreviation || '',
    type_dossier: (data.type_dossier || 'Création') as TypeDossier,
    sous_type: (data.sous_type || '') as SousTypeDossier,
    sous_type_id: data.sous_type_id,
    objet: data.objet || '',
    date_depot: data.date_depot || '',
    heure_depot: data.heure_depot || '',
    status: (data.status || 'reception') as StatusDossier,
    verdict: (data.verdict || 'aucun') as Verdict,
    emplacement: data.emplacement || '',
    arn: data.arn || '',
    recu_fr: data.recu_fr || '',
    recu_mg: data.recu_mg || '',
    association_id: data.association_id,
    categorie: data.categorie || 'Autre',
  } as Dossier;

  Object.defineProperties(d, {
    numArrivee: { get: () => d.num_chrono, enumerable: true },
    nom: { get: () => d.nom_association, enumerable: true },
    type: { get: () => d.type_dossier, enumerable: true },
    dateArrivee: { get: () => d.date_depot, enumerable: true },
    heureArrivee: { get: () => d.heure_depot, enumerable: true },
    recuFr: { get: () => d.recu_fr, enumerable: true },
    recuMg: { get: () => d.recu_mg, enumerable: true },
    sigle: { get: () => d.abreviation, enumerable: true },
    numeroSortie: { get: () => d.numero_sortie, enumerable: true },
    personneSortie: { get: () => d.personne_sortie, enumerable: true },
  });

  return d;
}

export interface AnnuaireEntry {
  id: number;
  num_chrono?: string;
  nom_association?: string;
  siege: string;
  district?: string;
  president?: string;
  date_depot?: string;
  heure_depot?: string;
  type_dossier?: TypeDossier;
  categorie: string;
  emplacement?: string;
  abreviation?: string;
  objet?: string;
  numero_sortie?: string;
  personne_sortie?: string;
}

export interface HistoriqueEntry {
  id: number;
  numArrivee: string;
  nom: string;
  siege: string;
  dateArrivee: string;
  heureArrivee?: string;
  datePrise: string;
  personnePrise: string;
}

export interface HistoriqueDefavorableEntry {
  id: number;
  dossier_id?: number;
  num_chrono?: string;
  nom_association?: string;
  siege?: string;
  district?: string;
  president?: string;
  type_dossier?: string;
  categorie?: string;
  date_arrivee?: string;
  heure_depot?: string;
  personne_correction?: string;
  date_prise?: string;
  heure_prise?: string;
}

export interface HistoriqueSortieEntry {
  id: number;
  numArrivee: string;
  nom: string;
  objet?: string;
  siege: string;
  president: string;
  personnePrise: string;
  dateSortie: string;
  personneSortie?: string;
}

// ============================================================
// NOUVEAU : SortieEntry (traçabilité des sorties)
// ============================================================
export interface SortieEntry {
  id: number;
  dossier_id: number;
  numero_sortie: string;
  personne_sortie: string;
  motif: string;
  date_sortie: string;
  /** Champs dénormalisés pour l'affichage */
  num_chrono?: string;
  association_nom?: string;
}

// ============================================================

export interface AnnuaireGroup {
  id: number;
  periode: string;
  associations: AnnuaireEntry[];
}

export interface HistoriqueArriveeGroup {
  id: number;
  periode: string;
  dossiers: Dossier[];
}

export interface DossierAPIResponse {
  id: number;
  num_chrono?: string;
  nom_association?: string;
  siege?: string;
  district?: string;
  president?: string;
  abreviation?: string;
  type_dossier?: TypeDossier;
  sous_type?: string;
  objet?: string;
  date_depot?: string;
  heure_depot?: string;
  // Données normalisées depuis la table associations
  association_id?: number;
  association_nom?: string;
  association_siege?: string;
  association_district?: string;
  association_president?: string;
  association_abreviation?: string;
  // Catégories sous forme de chaîne CSV (déduite de la table pivot)
  categorie?: string;
  status?: StatusDossier;
  verdict?: Verdict;
  emplacement?: string;
  arn?: string;
  recu_fr?: string;
  recu_mg?: string;
  // Sorties (optionnel)
  numero_sortie?: string;
  personne_sortie?: string;
  num_sortie?: string;
}

export type DossierUpdatePayload = Partial<Omit<Dossier, 'id'>>;
export type DossierCompletUpdatePayload = Partial<Dossier>;
export type AnnuaireUpdatePayload = Partial<Omit<AnnuaireEntry, 'id'>> & {
  groupeId?: number;
  periode?: string;
  numero_sortie?: string;
  nom_association?: string;
  siege?: string;
  president?: string;
  objet?: string;
  type_dossier?: TypeDossier;
  abreviation?: string;
  arn?: string;
  recuFr?: string;
  recuMg?: string;
};

export interface HistoriqueDefavorablePayload {
  dossier_id: number;
  num_chrono?: string;
  nom_association?: string;
  siege?: string;
  district?: string;
  president?: string;
  type_dossier?: TypeDossier;
  categorie?: string;
  date_arrivee?: string;
  heure_depot?: string;
  personne_correction?: string;
  date_prise?: string;
  heure_prise?: string;
  motif?: string;
}

export interface StatisticsResponse {
  total: string | Array<{ count: string }>;
  parStatut: Array<{ status: string; count: string }>;
  parMois?: Array<{ mois: string; count: string }>;
  parDistrict?: Array<{ district: string; count: string }>;
  parCategorie: Array<{ categorie: string; count: string }>;
  parCategorieDetail: Array<{ categorie: string; status: string; count: string }>;
  parTypeDossier: Array<{ type_dossier: string; count: string }>;
  totalParAnnee: Array<{ annee: string; count: number | string }>;
  annuaireParCategorie?: Array<{ categorie: string; count: string }>;
  pipeline: {
    reception: number;
    en_attente: number;
    en_cours: number;
    livraison: number;
    defavorable: number;
    registre_chrono: number;
    historique_sortie: number;
    duplicata: number;
    defavorable_traite: number;
    archive_arrivee: number;
    annuaire: number;
    historique_arrivee: number;
    historique_defavorable: number;
  };
}

export interface DashboardStats {
  total: number;
  parStatut: Array<{ status: string; count: number }>;
  parCategorie: Array<{ categorie: string; count: number }>;
  parCategorieDetail: Array<{ categorie: string; status: string; count: number }>;
  totalParAnnee: Array<{ annee: string; count: number }>;
}

export interface FormDossier {
  /** Catégories prédéfinies sélectionnées (multi-sélection) */
  selectedCategories: string[];
  /** Catégorie personnalisée saisie librement (champ optionnel) */
  customCategory: string;
  /** Catégorie finale calculée (pour compatibilité) */
  categorie?: string;
  categorieTemp?: string;
  /** N° chrono (alias de compatibilité numArrivee) */
  numArrivee: string;
  /** Nom de l'association (alias de compatibilité nom) */
  nom: string;
  /** Siège social */
  siege: string;
  /** District extrait de la dernière ligne du siège */
  district: string;
  /** Président(e) */
  president: string;
  /** Abréviation / sigle */
  abreviation: string;
  /** Type de dossier (Création / Renouvellement / Duplicata / Arrêté) */
  type: TypeDossier;
  /** Sous-type pour Duplicata / Arrêté */
  sous_type: SousTypeDossier;
  /** Date de dépôt (alias de compatibilité dateArrivee) */
  dateArrivee: string;
  /** Heure de dépôt (alias de compatibilité heureArrivee) */
  heureArrivee: string;
  /** Objet / objectif */
  objet: string;
  /** ARN (récépissé) */
  arn: string;
  /** Récépissé français */
  recuFr: string;
  /** Récépissé malgache */
  recuMg: string;
  /** Emplacement */
  emplacement?: string;
}

export interface ReceptionTableauProps {
  dossiers: Dossier[];
  loading: boolean;
  onEdit: (id: number, data: DossierUpdatePayload) => void;
  onDelete: (id: number) => void;
  onUndoEnAttente: (id: number) => void;
  onRenouveler: (dossier: Dossier) => void;
  onDuplicata: (dossier: Dossier) => void;
  onGenerateRecu: (dossier: Dossier, format: string) => void;
}
