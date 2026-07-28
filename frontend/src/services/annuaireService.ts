import { apiFetch } from './apiHelper';
import { AnnuaireEntry, AnnuaireGroup, AnnuaireUpdatePayload } from '../types';

const API_ANNUAIRE = '/api/annuaire';


export const getGroupes = async (): Promise<AnnuaireGroup[]> => {
  const res = await apiFetch(`${API_ANNUAIRE}/groupes`);
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

export const createGroupe = async (periode: string): Promise<AnnuaireGroup> => {
  const res = await apiFetch(`${API_ANNUAIRE}/groupes`, {
    method: 'POST',
    body: JSON.stringify({ periode }),
  });
  if (!res.ok) throw new Error('Erreur création groupe');
  return res.json();
};

export const archiverDossiers = async (dossierIds: number[], groupeId: number): Promise<{ message: string }> => {
  const res = await apiFetch(`${API_ANNUAIRE}/archiver`, {
    method: 'POST',
    body: JSON.stringify({ dossierIds, groupeId }),
  });
  if (!res.ok) throw new Error("Erreur d'archivage");
  return res.json();
};

export const getAssociationsParGroupe = async (groupeId: number): Promise<AnnuaireEntry[]> => {
  const res = await apiFetch(`${API_ANNUAIRE}/groupes/${groupeId}/associations`);
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

export const ajouterAssociationManuelle = async (data: AnnuaireUpdatePayload & { groupeId?: number; periode?: string; numero_sortie?: string; nom_association?: string; siege?: string; president?: string; objet?: string; type_dossier?: string; abreviation?: string; }): Promise<AnnuaireEntry> => {
  const res = await apiFetch(`${API_ANNUAIRE}/associations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erreur ajout association");
  return res.json();
};

export const updateAnnuaire = async (id: number, data: AnnuaireUpdatePayload): Promise<AnnuaireEntry> => {
  const res = await apiFetch(`${API_ANNUAIRE}/associations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erreur mise à jour');
  return res.json();
};

export const deleteAnnuaire = async (id: number): Promise<{ message: string }> => {
  const res = await apiFetch(`${API_ANNUAIRE}/associations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erreur suppression');
  return res.json();
};

export const getChronosAnnuaire = async (): Promise<string[]> => {
  const res = await apiFetch(`${API_ANNUAIRE}/chronos`);
  if (!res.ok) throw new Error('Erreur récupération chronos');
  return res.json();
};
