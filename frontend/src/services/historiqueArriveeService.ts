import { apiFetch } from './apiHelper';

const API = '/api/historique-arrivee';

export const archiverArrivee = async (periode: string, dossierIds?: number[]) => {
  const res = await apiFetch(API, {
    method: 'POST',
    body: JSON.stringify({ periode, dossierIds }),
  });
  if (!res.ok) throw new Error("Erreur d'archivage");
  return res.json();
};

export const getGroupesArrivee = async () => {
  const res = await apiFetch(`${API}/groupes`);
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

export const getArriveesParGroupe = async (groupeId: number) => {
  const res = await apiFetch(`${API}/groupes/${groupeId}`);
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};
