import { Dossier, HistoriqueDefavorableEntry, createDossier } from '../../types';
import type { DossierAPIResponse } from '../../types';

/** Convert DossierAPIResponse → Dossier */
export const apiToDossier = (d: DossierAPIResponse): Dossier =>
  createDossier({
    id: d.id,
    num_chrono: d.num_chrono || '',
    nom_association: d.nom_association || '',
    siege: d.siege || '',
    district: d.district || '',
    president: d.president || '',
    abreviation: d.abreviation || '',
    type_dossier: (d.type_dossier || 'Création') as any,
    objet: d.objet || '',
    date_depot: d.date_depot || '',
    heure_depot: d.heure_depot ? d.heure_depot.slice(0, 5) : '',
    status: (d.status || 'registre_chrono') as any,
    verdict: 'aucun' as any,
    categorie: d.categorie || 'Autre',
    arn: d.arn || '',
    recu_fr: d.recu_fr || '',
    recu_mg: d.recu_mg || '',
  });

/** Convert HistoriqueDefavorableEntry → Dossier */
export const histDefToDossier = (h: HistoriqueDefavorableEntry): Dossier =>
  createDossier({
    id: h.id,
    num_chrono: h.num_chrono || '',
    nom_association: h.nom_association || '',
    siege: h.siege || '',
    district: h.district || '',
    president: h.president || '',
    type_dossier: (h.type_dossier || 'Création') as any,
    date_depot: h.date_arrivee || '',
    heure_depot: h.heure_depot ? h.heure_depot.slice(0, 5) : '',
    status: 'defavorable_traite' as any,
    verdict: 'aucun' as any,
    categorie: h.categorie || 'Autre',
    abreviation: '',
  });
