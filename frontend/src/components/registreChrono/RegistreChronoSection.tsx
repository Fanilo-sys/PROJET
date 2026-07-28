import React, { useState, useMemo } from 'react';
import {
  Dossier
} from '../../types';
import { createGroupe, archiverDossiers } from '../../services/annuaireService';
import { SectionHeader } from '../communs/SectionHeader';
import { SearchFilterBar } from '../communs/SearchFilterBar';
import { DetailTemplateModal } from '../communs/DetailTemplateModal';
import { DossierTicketCard } from '../communs/DossierTicketCard';
import {
  BookOpen, FileText, Archive,
  Globe, AlertTriangle, Filter
} from 'lucide-react';

interface RegistreChronoSectionProps {
  dossiers: Dossier[];
  onRefresh: () => void;
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatHeure = (h?: string) => {
  if (!h) return '';
  return h.replace(':', 'h');
};

const getStatusStyles = (d: Dossier) => {
  if (d.status === 'historique_sortie') return { label: 'Sorti', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', accent: 'bg-emerald-400' };
  if (d.status === 'defavorable_traite') return { label: 'Défavorable traité', bg: 'bg-rose-50 text-rose-700 border-rose-200', accent: 'bg-rose-400' };
  if (d.status === 'registre_chrono') return { label: 'Archivé', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', accent: 'bg-indigo-400' };
  return { label: d.status, bg: 'bg-slate-100 text-slate-600 border-slate-200', accent: 'bg-slate-400' };
};

export const RegistreChronoSection: React.FC<RegistreChronoSectionProps> = ({ dossiers, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveMode, setArchiveMode] = useState<'month' | 'all'>('month');
  const [archiveMonth, setArchiveMonth] = useState<number | ''>('');
  const [archiveYear, setArchiveYear] = useState<number | ''>('');
  const [archivePeriodeLabel, setArchivePeriodeLabel] = useState('');
  const [detailDossier, setDetailDossier] = useState<Dossier | null>(null);
  const [archiving, setArchiving] = useState(false);

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const dossiersFiltres = useMemo(() => {
    let result = dossiers;
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(d =>
        d.numArrivee.toLowerCase().includes(term) || d.nom.toLowerCase().includes(term) ||
        d.siege.toLowerCase().includes(term) || (d.district || '').toLowerCase().includes(term) ||
        d.president.toLowerCase().includes(term) || d.categorie.toLowerCase().includes(term) ||
        (d.numeroSortie || '').toLowerCase().includes(term) || (d.personneSortie || '').toLowerCase().includes(term) ||
        (d.objet || '').toLowerCase().includes(term)
      );
    }
    if (dateFrom) result = result.filter(d => d.dateArrivee >= dateFrom);
    if (dateTo) result = result.filter(d => d.dateArrivee <= dateTo);
    return result;
  }, [dossiers, search, dateFrom, dateTo]);

  const handleResetFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };

  // Prévisualisation archivage
  const archiveMatching = useMemo(() => {
    if (archiveMode === 'month' && archiveMonth && archiveYear) {
      const match = dossiersFiltres.filter(d => {
        if (!d.dateArrivee) return false;
        const [y, m] = d.dateArrivee.split('-');
        return Number(y) === archiveYear && Number(m) === archiveMonth;
      });
      const lbl = `${MONTHS_FR[Number(archiveMonth) - 1]} ${archiveYear}`;
      return { matching: match, label: lbl };
    }
    if (archiveMode === 'all') {
      const lbl = archivePeriodeLabel.trim() || `Archivage ${new Date().toLocaleDateString('fr-FR')}`;
      return { matching: selected.length > 0 ? dossiers.filter(d => selected.includes(d.id)) : dossiersFiltres, label: lbl };
    }
    return { matching: [], label: '' };
  }, [dossiers, dossiersFiltres, archiveMode, archiveMonth, archiveYear, archivePeriodeLabel, selected]);

  const handleArchive = async () => {
    if (archiveMode === 'month' && (!archiveMonth || !archiveYear)) {
      alert('Choisissez un mois et une année');
      return;
    }
    if (archiveMode === 'all' && !archivePeriodeLabel.trim()) {
      alert('Entrez un nom pour la période d\'archivage');
      return;
    }

    const matching = archiveMatching.matching;
    if (matching.length === 0) {
      alert('Aucun dossier à archiver');
      return;
    }

    setArchiving(true);
    try {
      const label = archiveMatching.label;
      const groupe = await createGroupe(label);
      const ids = matching.map(d => d.id);
      await archiverDossiers(ids, groupe.id);
      setShowArchiveModal(false);
      setArchiveMonth('');
      setArchiveYear('');
      setArchivePeriodeLabel('');
      setSelected([]);
      setArchiveMode('month');
      onRefresh();
      alert(`✅ ${matching.length} dossier(s) archivé(s) dans « ${label} »`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'archivage');
    } finally {
      setArchiving(false);
    }
  };

  const openArchiveModal = (mode: 'month' | 'all') => {
    setArchiveMode(mode);
    if (mode === 'all') {
      setArchivePeriodeLabel(`Archivage ${new Date().toLocaleDateString('fr-FR')}`);
    }
    setShowArchiveModal(true);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BookOpen}
        title="Registre Chrono"
        subtitle="Dossiers archivés et historisés"
        count={dossiersFiltres.length}
        gradient="from-indigo-500 to-purple-500"
      >
        <button
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl border-2 border-transparent hover:border-indigo-400/30 transition-all shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50 flex items-center gap-1.5 active:scale-[0.97]"
          onClick={() => openArchiveModal('month')}
        >
          <Archive size={14} /> Archiver mois
        </button>
        <button
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl border-2 border-transparent hover:border-amber-400/30 transition-all shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/50 flex items-center gap-1.5 active:scale-[0.97]"
          onClick={() => openArchiveModal('all')}
        >
          <Globe size={14} /> Archiver tout
        </button>
      </SectionHeader>

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
        placeholder="Rechercher par n°, nom, N° sortie, objet, personne…"
      />

      {/* Compteur */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Filter size={14} className="text-indigo-400" />
          <span>Dossiers archivés</span>
        </div>
        <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm">
          {dossiersFiltres.length}
        </span>
      </div>

      {/* Liste en cartes DossierTicketCard */}
      {dossiersFiltres.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
            <FileText size={28} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">Aucun dossier dans le registre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dossiersFiltres.map((d) => {
            const sb = getStatusStyles(d);
            return (
              <DossierTicketCard
                key={d.id}
                accentColor={sb.accent}
                numArrivee={d.numArrivee}
                nom={d.nom}
                type={d.type}
                date={formatDate(d.dateArrivee)}
                heure={formatHeure(d.heureArrivee)}
                statusLabel={sb.label}
                statusStyles={sb.bg}
                onDetail={() => setDetailDossier(d)}
                extraRight={
                  <input
                    type="checkbox"
                    checked={selected.includes(d.id)}
                    onChange={() => toggleSelect(d.id)}
                    className="w-4 h-4 rounded border-2 border-slate-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              />
            );
          })}
        </div>
      )}

      {/* Barre de sélection */}
      {selected.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-2xl flex items-center justify-between shadow-sm">
          <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
            <Globe size={16} className="text-indigo-500" />
            {selected.length} dossier(s) sélectionné(s)
          </span>
          <button
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl border-2 border-transparent hover:border-indigo-400/30 transition-all shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50 flex items-center gap-1.5 active:scale-[0.97]"
            onClick={() => openArchiveModal('all')}
          >
            <Archive size={13} /> Archiver la sélection
          </button>
        </div>
      )}

      {/* Modal d'archivage */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-2xl w-full max-w-lg animate-fade-in-up" onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                  <Archive size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {archiveMode === 'month' ? 'Archiver par mois' : selected.length > 0 ? 'Archiver la sélection' : 'Archiver tous les dossiers'}
                  </h3>
                  <p className="text-xs text-white/70">
                    {archiveMode === 'month' ? 'Dossiers d\'un mois spécifique' : 'Crée un groupe avec tous les dossiers affichés'}
                  </p>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
                onClick={() => setShowArchiveModal(false)}
              >
                <Globe size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Mode mois */}
              {archiveMode === 'month' && (
                <div className="flex gap-3">
                  <select
                    className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all font-semibold"
                    value={archiveMonth}
                    onChange={e => setArchiveMonth(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Mois</option>
                    {MONTHS_FR.map((m, i) => (
                      <option key={i} value={i+1}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Année"
                    className="w-32 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all font-semibold"
                    value={archiveYear === '' ? '' : String(archiveYear)}
                    onChange={e => setArchiveYear(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              )}

              {/* Mode all */}
              {archiveMode === 'all' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nom de la période d'archivage
                  </label>
                  <input
                    type="text"
                    className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
                    value={archivePeriodeLabel}
                    onChange={e => setArchivePeriodeLabel(e.target.value)}
                    placeholder="Ex: Archivage complet Mars 2026"
                  />
                </div>
              )}

              {/* Prévisualisation */}
              {archiveMatching.matching.length > 0 && (
                <div className="p-4 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Archive size={14} className="text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-700">
                      {archiveMatching.matching.length} dossier(s) → « {archiveMatching.label} »
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 mt-2">
                    {archiveMatching.matching.slice(0, 15).map(d => (
                      <div key={d.id} className="flex items-center gap-2 text-xs text-slate-600 bg-white rounded-lg px-2.5 py-1.5 border border-indigo-100">
                        <span className="font-mono font-bold text-indigo-600">{d.numArrivee}</span>
                        <span className="text-slate-300">—</span>
                        <span className="font-medium text-slate-700 truncate">{d.nom}</span>
                      </div>
                    ))}
                    {archiveMatching.matching.length > 15 && (
                      <div className="text-xs font-semibold text-slate-400 px-1">
                        …et {archiveMatching.matching.length - 15} autre(s)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {archiveMatching.matching.length === 0 && (
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-amber-700">Aucun dossier trouvé pour cette sélection.</p>
                </div>
              )}

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t-2 border-slate-100">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-sm font-bold transition-all active:scale-[0.97] bg-white"
                  onClick={() => setShowArchiveModal(false)}
                >
                  Annuler
                </button>
                <button
                  disabled={archiving || archiveMatching.matching.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/50 flex items-center justify-center gap-2 active:scale-[0.97]"
                  onClick={handleArchive}
                >
                  <Archive size={15} />
                  {archiving ? 'Archivage…' : `Archiver ${archiveMatching.matching.length} dossier(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {detailDossier && (
        <DetailTemplateModal
          dossier={detailDossier}
          onClose={() => setDetailDossier(null)}
          headerGradient="from-indigo-500 to-purple-500"
          hideDefaultSidebarButtons
        />
      )}
    </div>
  );
};
