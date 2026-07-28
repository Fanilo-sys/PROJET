import { apiFetch } from './apiHelper';
import { HistoriqueDefavorablePayload, DossierAPIResponse, HistoriqueDefavorableEntry, StatisticsResponse, SortieEntry } from '../types';

const API_URL = '/api/dossiers';
const API_HISTO_DEF = '/api/historique-defavorable';

export const getDossiers = async (cursor?: number, limit?: number, status?: string): Promise<DossierAPIResponse[]> => {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', String(cursor));
  if (limit) params.set('limit', String(limit));
  if (status) params.set('status', status);
  const qs = params.toString();
  const url = qs ? `${API_URL}?${qs}` : API_URL;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error('Erreur réseau');
  return response.json();
};

export const createDossier = async (dossier: Partial<DossierAPIResponse>): Promise<DossierAPIResponse> => {
  const response = await apiFetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(dossier),
  });
  if (!response.ok) throw new Error('Erreur création');
  return response.json();
};

// ✅ FIX C4 : Appel unique pour corriger un défavorable
export const corrigerDefavorable = async (id: number, data: { nomPersonne: string; date_prise: string; heure_prise: string }): Promise<DossierAPIResponse> => {
  const res = await apiFetch(`${API_URL}/${id}/corriger-defavorable`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erreur lors de la correction');
  return res.json();
};

export const updateDossier = async (id: number, data: Partial<DossierAPIResponse>): Promise<DossierAPIResponse> => {
  const response = await apiFetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Erreur mise à jour');
  return response.json();
};

export const updateDossierComplet = async (id: number, data: Partial<DossierAPIResponse>): Promise<DossierAPIResponse> => {
  const response = await apiFetch(`${API_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Erreur mise à jour complète');
  return response.json();
};

export const deleteDossier = async (id: number): Promise<{ message?: string; dossier?: DossierAPIResponse }> => {
  const response = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Erreur suppression');
  return response.json();
};

export const getDossiersParStatut = async (statut: string, cursor?: number, limit?: number): Promise<DossierAPIResponse[]> => {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', String(cursor));
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const url = qs ? `${API_URL}/statut/${statut}?${qs}` : `${API_URL}/statut/${statut}`;
  const response = await apiFetch(url);
  if (!response.ok) throw new Error('Erreur réseau');
  return response.json();
};

export const addHistoriqueDefavorable = async (data: HistoriqueDefavorablePayload): Promise<HistoriqueDefavorableEntry> => {
  const res = await apiFetch(API_HISTO_DEF, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erreur ajout historique');
  return res.json();
};

export const getHistoriqueDefavorable = async (): Promise<HistoriqueDefavorableEntry[]> => {
  const res = await apiFetch(API_HISTO_DEF);
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

export const createDuplicata = async (dossier: Partial<DossierAPIResponse>): Promise<DossierAPIResponse> => {
  const res = await apiFetch(`${API_URL}/duplicata`, {
    method: 'POST',
    body: JSON.stringify(dossier),
  });
  if (!res.ok) throw new Error('Erreur création duplicata');
  return res.json();
};

export const getDuplicatas = async (): Promise<DossierAPIResponse[]> => {
  const res = await apiFetch(`${API_URL}/duplicata`);
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

export const approuverDuplicata = async (id: number): Promise<DossierAPIResponse> => {
  const res = await apiFetch(`${API_URL}/duplicata/${id}/approuver`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Erreur approbation');
  return res.json();
};

export const getStats = async (annee?: string, mois?: string): Promise<StatisticsResponse> => {
  const params = new URLSearchParams();
  if (annee) params.set('annee', annee);
  if (mois) params.set('mois', mois);
  const qs = params.toString();
  const url = qs ? `${API_URL}/stats?${qs}` : `${API_URL}/stats`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Erreur stats');
  return res.json();
};

export const getDossiersParDistrict = async (district: string, annee?: string): Promise<DossierAPIResponse[]> => {
  let url = `${API_URL}/district/${encodeURIComponent(district)}`;
  if (annee) url += `?annee=${annee}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Erreur récupération dossiers par district');
  return res.json();
};

export const getDossiersParType = async (type: string, annee?: string): Promise<DossierAPIResponse[]> => {
  let url = `${API_URL}/type/${encodeURIComponent(type)}`;
  if (annee) url += `?annee=${annee}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Erreur récupération dossiers par type');
  return res.json();
};

export const getDossiersParCategorie = async (categorie: string, annee?: string): Promise<DossierAPIResponse[]> => {
  let url = `${API_URL}/categorie/${encodeURIComponent(categorie)}`;
  if (annee) url += `?annee=${annee}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Erreur récupération dossiers par catégorie');
  return res.json();
};

export const getDossiersParStatuts = async (statuts: string[]): Promise<DossierAPIResponse[]> => {
  const url = `${API_URL}/statuts?statuts=${encodeURIComponent(statuts.join(','))}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Erreur récupération dossiers par statuts');
  return res.json();
};

export const archiverSortie = async (dossierIds: number[]): Promise<{ message: string; archivedCount: number; skippedCount: number }> => {
  const res = await apiFetch(`${API_URL}/archiver-sortie`, {
    method: 'POST',
    body: JSON.stringify({ dossierIds }),
  });
  if (!res.ok) throw new Error("Erreur d'archivage en sortie");
  return res.json();
};

// ============================================================
// NOUVEAU : Sorties
// ============================================================
export const getSorties = async (dossierId?: number): Promise<SortieEntry[]> => {
  const params = new URLSearchParams();
  if (dossierId) params.set('dossier_id', String(dossierId));
  const qs = params.toString();
  const url = qs ? `${API_URL}/sorties?${qs}` : `${API_URL}/sorties`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Erreur récupération sorties");
  return res.json();
};
