import React from 'react';
import { InfiniteScrollList } from '../communs/InfiniteScrollList';
import { DossierTicketCard } from '../communs/DossierTicketCard';
import { apiFetch } from '../../services/apiHelper';

interface ArriveeEntry {
  id: number;
  num_chrono: string;
  nom_association: string;
  siege: string;
  district: string;
  president: string;
  type_dossier: string;
  date_arrivee: string;
  heure_depot: string;
}

interface HistoriqueArriveeListeProps {
  groupeId: number;
}

export const HistoriqueArriveeListe: React.FC<HistoriqueArriveeListeProps> = ({ groupeId }) => {
  const fetchArrivees = async (page: number) => {
    const res = await apiFetch(
      `/api/historique-arrivee/groupes/${groupeId}?page=${page}&limit=50`
    );
    return res.json();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatHeure = (heure: string) => {
    if (!heure) return '';
    return heure.slice(0, 5).replace(':', 'h');
  };

  return (
    <InfiniteScrollList<ArriveeEntry>
      fetchData={fetchArrivees}
      renderItem={(item) => (
        <DossierTicketCard
          key={item.id}
          accentColor="bg-indigo-400"
          numArrivee={item.num_chrono || '—'}
          nom={item.nom_association || '—'}
          type={item.type_dossier || 'Création'}
          date={formatDate(item.date_arrivee)}
          heure={formatHeure(item.heure_depot)}
          statusLabel="ARCHIVÉ"
          statusStyles="bg-indigo-50 text-indigo-700 border-indigo-200"
          onDetail={() => console.log('Détails', item.id)}
        />
      )}
      emptyMessage="Aucune arrivée dans ce groupe"
    />
  );
};