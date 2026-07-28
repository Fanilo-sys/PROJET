import React, { useState, useMemo } from 'react';
import {
  FileText, Filter, Undo2, XCircle,
} from 'lucide-react';
import { Dossier, matchesSearchTerm } from '../../types';
import { SearchFilterBar } from '../communs/SearchFilterBar';
import { DetailTemplateModal } from '../communs/DetailTemplateModal';
import { DossierTicketCard } from '../communs/DossierTicketCard';

interface StockDefavorableListeProps {
  dossiers: Dossier[];
  onRepasserEnReception: (id: number) => void;
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

export const StockDefavorableListe: React.FC<StockDefavorableListeProps> = ({ dossiers, onRepasserEnReception }) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailDossier, setDetailDossier] = useState<Dossier | null>(null);

  const dossiersFiltres = useMemo(() => {
    let result = dossiers;
    result = result.filter(d => matchesSearchTerm(d, search));
    if (dateFrom) result = result.filter(d => d.dateArrivee >= dateFrom);
    if (dateTo) result = result.filter(d => d.dateArrivee <= dateTo);
    return result;
  }, [dossiers, search, dateFrom, dateTo]);

  const handleResetFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <SearchFilterBar
        search={search}
        onChange={setSearch}
        dateFrom={dateFrom}
        onChangeDateFrom={setDateFrom}
        dateTo={dateTo}
        onChangeDateTo={setDateTo}
        showReset={!!(search || dateFrom || dateTo)}
        onReset={handleResetFilters}
        placeholder="Rechercher par n°, nom, siège…"
      />

      {/* Compteur */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Filter size={14} className="text-rose-400" />
          <span>Dossiers défavorables</span>
        </div>
        <span className="inline-flex items-center justify-center bg-rose-100 text-rose-700 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm">
          {dossiersFiltres.length}
        </span>
      </div>

      {/* Tickets en grille 2 colonnes */}
      {dossiersFiltres.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">Aucun dossier défavorable.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dossiersFiltres.map((d) => (
            <DossierTicketCard
              key={d.id}
              accentColor="bg-rose-400"
              numArrivee={d.numArrivee}
              nom={d.nom}
              type={d.type}
              date={formatDate(d.dateArrivee)}
              heure={formatHeure(d.heureArrivee)}
              statusLabel="DÉFAVORABLE"
              statusStyles="bg-red-50 text-red-700 border-red-400"
              onDetail={() => setDetailDossier(d)}
            />
          ))}
        </div>
      )}

      {/* Modal de détails */}
      {detailDossier && (
        <DetailTemplateModal
          dossier={detailDossier}
          onClose={() => setDetailDossier(null)}
          headerGradient="from-rose-500 to-pink-500"
          sidebarExtra={
            <div className="flex flex-col gap-2">
              <button
                className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 hover:from-amber-500 hover:to-yellow-500 hover:text-white hover:border-amber-500 transition-all active:scale-[0.97] shadow-sm"
                onClick={() => { setDetailDossier(null); onRepasserEnReception(detailDossier.id); }}
              >
                ↺ Corriger
              </button>
            </div>
          }
        />
      )}
    </div>
  );
};
