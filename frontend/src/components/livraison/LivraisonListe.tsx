import React, { useState, useMemo } from 'react';
import {
  FileText, Filter, LogOut, Eye,
} from 'lucide-react';
import { Dossier, estProtege, matchesSearchTerm } from '../../types';
import { SearchFilterBar } from '../communs/SearchFilterBar';
import { DetailTemplateModal } from '../communs/DetailTemplateModal';
import { DossierTicketCard } from '../communs/DossierTicketCard';

interface LivraisonListeProps {
  livraisonList: Dossier[];
  onSortie: (id: number) => void;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return dateStr;
};

const formatHeure = (h?: string) => {
  if (!h) return '';
  return h.replace(':', 'h');
};

export const LivraisonListe: React.FC<LivraisonListeProps> = ({ livraisonList, onSortie }) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailDossier, setDetailDossier] = useState<Dossier | null>(null);

  const dossiersFiltres = useMemo(() => {
    let result = livraisonList;
    result = result.filter(d => !estProtege(d.status));
    result = result.filter(d => matchesSearchTerm(d, search));
    if (dateFrom) result = result.filter(d => d.dateArrivee >= dateFrom);
    if (dateTo) result = result.filter(d => d.dateArrivee <= dateTo);
    return result;
  }, [livraisonList, search, dateFrom, dateTo]);

  const handleResetFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };

  return (
    <div className="space-y-4">
      <SearchFilterBar
        search={search}
        onChange={setSearch}
        dateFrom={dateFrom}
        onChangeDateFrom={setDateFrom}
        dateTo={dateTo}
        onChangeDateTo={setDateTo}
        showReset={!!(search || dateFrom || dateTo)}
        onReset={handleResetFilters}
        placeholder="Rechercher par n°, nom, N° sortie…"
      />

      <div className="flex items-center gap-2.5 px-1">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Filter size={14} className="text-emerald-400" />
          <span>Dossiers prêts / signés</span>
        </div>
        <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm">
          {dossiersFiltres.length}
        </span>
      </div>

      {dossiersFiltres.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">Aucun dossier prêt / signé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dossiersFiltres.map((d) => (
            <DossierTicketCard
              key={d.id}
              accentColor="bg-emerald-400"
              numArrivee={d.numArrivee}
              nom={d.nom}
              type={d.type}
              date={formatDate(d.dateArrivee)}
              heure={formatHeure(d.heureArrivee)}
              statusLabel="PRÊT"
              statusStyles="bg-emerald-50 text-emerald-700 border-emerald-300"
              onDetail={() => setDetailDossier(d)}
              extraRight={
                d.numeroSortie ? (
                  <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap px-1">
                    S: {d.numeroSortie}
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {detailDossier && (
        <DetailTemplateModal
          dossier={detailDossier}
          onClose={() => setDetailDossier(null)}
          headerGradient="from-emerald-500 to-teal-500"
          hideActions={estProtege(detailDossier.status)}
          sidebarExtra={
            <div className="flex flex-col gap-2">
              <button
                className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-rose-300 bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 hover:from-rose-600 hover:to-pink-600 hover:text-white hover:border-rose-600 transition-all active:scale-[0.97] shadow-sm"
                onClick={() => { setDetailDossier(null); onSortie(detailDossier.id); }}
              >
                <LogOut size={13} className="inline mr-1" /> Sortie
              </button>
            </div>
          }
        />
      )}
    </div>
  );
};
