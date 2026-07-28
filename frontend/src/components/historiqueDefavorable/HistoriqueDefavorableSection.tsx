import React, { useState, useEffect, useMemo } from 'react';
import { getHistoriqueDefavorable } from '../../services/dossierService';
import { HistoriqueDefavorableEntry, matchesSearchTerm } from '../../types';
import { SectionHeader } from '../communs/SectionHeader';
import { SearchFilterBar } from '../communs/SearchFilterBar';
import { DetailTemplateModal } from '../communs/DetailTemplateModal';
import { histDefToDossier } from '../communs/toDossier';
import { AlertTriangle, FileText, User, RefreshCw } from 'lucide-react';

interface HistoriqueDefavorableSectionProps {
  refreshKey?: number;
}

const formatDate = (d: string | undefined | null) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatHeure = (h: string | undefined | null) => {
  if (!h) return '';
  if (h.includes(':')) return h.slice(0, 5);
  return String(h);
};

export const HistoriqueDefavorableSection: React.FC<HistoriqueDefavorableSectionProps> = ({ refreshKey }) => {
  const [historique, setHistorique] = useState<HistoriqueDefavorableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailDossier, setDetailDossier] = useState<any>(null);

  const chargerHistorique = async () => {
    setLoading(true);
    try {
      const response = await getHistoriqueDefavorable();
      // ✅ Correction robuste : vérifier si c'est un tableau ou un objet paginé
      const data = Array.isArray(response)
        ? response
        : (response && typeof response === 'object' && 'data' in response)
          ? (response as any).data
          : [];
      setHistorique(data);
    } catch (err) {
      console.error('Erreur chargement historique défavorable:', err);
      setHistorique([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerHistorique();
  }, [refreshKey]);

  const historiqueFiltre = useMemo(() => {
    if (!Array.isArray(historique)) return [];
    let result = historique;
    result = result.filter(h => matchesSearchTerm(h as any, search));
    if (dateFrom) result = result.filter(h => h.date_arrivee && h.date_arrivee >= dateFrom);
    if (dateTo) result = result.filter(h => h.date_arrivee && h.date_arrivee <= dateTo);
    return result;
  }, [historique, search, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  if (loading) return <p className="p-4 text-gray-500 font-medium">Chargement…</p>;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={AlertTriangle}
        title="Historique Défavorable"
        subtitle="Dossiers défavorables corrigés"
        count={historiqueFiltre.length}
        gradient="from-rose-500 to-pink-500"
      >
        <button
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
          onClick={chargerHistorique}
          disabled={loading}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </SectionHeader>

      <SearchFilterBar
        search={search}
        onChange={setSearch}
        dateFrom={dateFrom}
        onChangeDateFrom={setDateFrom}
        dateTo={dateTo}
        onChangeDateTo={setDateTo}
        showReset={!!(search || dateFrom || dateTo)}
        onReset={handleResetFilters}
        placeholder="Rechercher par n°, nom, personne…"
      />

      {historiqueFiltre.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">Aucun historique défavorable.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {historiqueFiltre.map(h => (
            <div
              key={h.id}
              className="group flex border border-slate-200 rounded-xl w-full h-[72px] bg-white shadow-sm hover:shadow-lg hover:border-rose-200 hover:bg-gradient-to-r hover:from-white hover:to-rose-50/30 transition-all duration-200 overflow-hidden cursor-pointer"
              onClick={() => setDetailDossier(histDefToDossier(h))}
            >
              <div className="w-[4px] shrink-0 bg-rose-400" />
              <div className="flex flex-col justify-between p-2 w-[90px] flex-shrink-0">
                <div className="text-[10px] leading-tight">
                  <div className="font-semibold text-slate-700">{formatDate(h.date_arrivee)}</div>
                  <div className="text-slate-400 font-medium">{formatHeure(h.heure_depot)}</div>
                </div>
                <div className="border bg-red-50 text-red-700 border-red-400 text-center py-0.5 px-1 text-[8px] uppercase font-semibold rounded leading-tight tracking-wider">
                  CORRIGÉ
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center px-2.5 sm:px-3 min-w-0 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600 leading-none">{h.num_chrono || '—'}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border leading-none bg-amber-100 text-amber-700 border-amber-300">
                    {h.type_dossier || 'Création'}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-slate-200 to-transparent w-full my-1" />
                <div className="text-sm font-semibold text-slate-800 truncate leading-tight group-hover:text-rose-700 transition-colors">
                  {h.nom_association || '—'}
                </div>
              </div>
              <div className="flex items-center pr-2.5 sm:pr-3 flex-shrink-0 gap-1.5 sm:gap-2">
                <div className="w-px h-[36px] bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 whitespace-nowrap px-1">
                  <User size={10} /> {h.personne_correction || '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailDossier && (
        <DetailTemplateModal
          dossier={detailDossier}
          onClose={() => setDetailDossier(null)}
          headerGradient="from-rose-500 to-pink-500"
          hideDefaultSidebarButtons
        />
      )}
    </div>
  );
};

export default HistoriqueDefavorableSection;