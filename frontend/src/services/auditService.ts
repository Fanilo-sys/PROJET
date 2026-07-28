import { apiFetch } from './apiHelper';

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: any;
  new_data: any;
  username: string | null;
  created_at: string;
  num_chrono: string | null;
  nom_association: string | null;
  /** Type du dossier (Création, Renouvellement, Duplicata, Arrêté) */
  type_dossier: string | null;
  /** Verdict au moment de l'événement (favorable, defavorable, aucun) */
  verdict: string | null;
  /** Statut du dossier au moment de l'événement (reception, en_attente, etc.) */
  status_dossier: string | null;
}

export const getAuditJournal = async (limit: number = 200): Promise<AuditLog[]> => {
  const res = await apiFetch(`/api/audit/journal?limit=${limit}`);
  if (!res.ok) throw new Error('Erreur récupération journal');
  return res.json();
};

export const getHistoriqueDossier = async (dossierId: number): Promise<AuditLog[]> => {
  const res = await apiFetch(`/api/audit/dossiers/${dossierId}`);
  if (!res.ok) throw new Error('Erreur récupération historique');
  return res.json();
};
