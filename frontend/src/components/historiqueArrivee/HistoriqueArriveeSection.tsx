import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, RefreshCw, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { getGroupesArrivee, getArriveesParGroupe } from '../../services/historiqueArriveeService';
import { DossierAPIResponse, matchesSearchTerm } from '../../types';
import { SectionHeader } from '../communs/SectionHeader';
import { SearchFilterBar } from '../communs/SearchFilterBar';
import { DetailTemplateModal } from '../communs/DetailTemplateModal';
import { DossierTicketCard } from '../communs/DossierTicketCard';
import { apiToDossier } from '../communs/toDossier';
import { initSocket } from '../../services/socket';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  // Si c'est déjà au format YYYY-MM-DD (string de l'API), traiter directement
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      // Utiliser UTC pour éviter le décalage de fuseau horaire
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${day}/${m}/${y}`;
    }
  } catch {}
  return dateStr;
};

const formatHeure = (h?: string) => {
  if (!h) return '';
  if (h.includes(':')) return h.slice(0, 5);
  try {
    const dt = new Date(h);
    if (!isNaN(dt.getTime())) return dt.toTimeString().slice(0, 5);
  } catch {}
  return String(h);
};

export const HistoriqueArriveeSection: React.FC = () => {
  const [groupes, setGroupes] = useState<any[]>([]);
  const [dossiersParGroupe, setDossiersParGroupe] = useState<Record<number, DossierAPIResponse[]>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadings, setLoadings] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailDossier, setDetailDossier] = useState<DossierAPIResponse | null>(null);

  const loadGroupes = async () => {
    setLoading(true);
    setDossiersParGroupe({});
    setExpanded({});
    try {
      const data = await getGroupesArrivee();
      setGroupes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement groupes:', err);
      setGroupes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupes();

    const socket = initSocket();
    if (socket) {
      const handler = () => {
        console.log('🔄 Rechargement Historique Arrivée');
        loadGroupes();
      };
      socket.on('historique-arrivee:changed', handler);
      return () => {
        socket.off('historique-arrivee:changed', handler);
      };
    }
  }, []);

  const toggleGroupe = async (id: number) => {
    if (expanded[id]) {
      setExpanded(prev => ({ ...prev, [id]: false }));
      return;
    }
    setLoadings(prev => ({ ...prev, [id]: true }));
    setExpanded(prev => ({ ...prev, [id]: true }));
    try {
      const response = await getArriveesParGroupe(id);
      // ✅ Correction robuste
      const rawEntries = (response && typeof response === 'object' && 'data' in response)
        ? (response as any).data
        : response;
      const entries: DossierAPIResponse[] = Array.isArray(rawEntries)
        ? rawEntries.map((item: any) => ({
            ...item,
            date_depot: item.date_arrivee || item.date_depot || '',
          }))
        : [];
      setDossiersParGroupe(prev => ({ ...prev, [id]: entries }));
    } catch (err) {
      console.error('Erreur chargement dossiers:', err);
      setDossiersParGroupe(prev => ({ ...prev, [id]: [] }));
    } finally {
      setLoadings(prev => ({ ...prev, [id]: false }));
    }
  };

  const filterDossiers = (liste: DossierAPIResponse[]) => {
    if (!Array.isArray(liste)) return [];
    if (!search.trim() && !dateFrom && !dateTo) return liste;
    let result = liste;
    result = result.filter(d => matchesSearchTerm(d as any, search));
    if (dateFrom) result = result.filter(d => d.date_depot && d.date_depot >= dateFrom);
    if (dateTo) result = result.filter(d => d.date_depot && d.date_depot <= dateTo);
    return result;
  };

  const handleResetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const totalCount = useMemo(() => {
    return groupes.reduce((acc, g) => {
      const dossiers = dossiersParGroupe[g.id] || [];
      const filtered = filterDossiers(dossiers);
      const show = (search || dateFrom || dateTo) ? filtered.length > 0 : true;
      return show ? acc + filtered.length : acc;
    }, 0);
  }, [groupes, dossiersParGroupe, search, dateFrom, dateTo]);

  if (loading) {
    return <p className="p-4 text-gray-500 font-medium">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Calendar}
        title="Historique d'Arrivée"
        subtitle="Archives des réceptions par période"
        count={totalCount}
        gradient="from-indigo-500 to-purple-500"
      >
        <button
          className="bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
          onClick={loadGroupes}
        >
          <RefreshCw size={13} /> Rafraîchir
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
        placeholder="Rechercher par n°, nom, siège, président…"
      />

      {groupes.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
            <FileText size={28} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">Aucune archive de réception.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupes.map(g => {
            const isExpanded = expanded[g.id] || false;
            const dossiers = dossiersParGroupe[g.id] || [];
            const dossiersFiltres = filterDossiers(dossiers);
            const isLoading = loadings[g.id] || false;
            const estFiltrageActif = search.trim() || dateFrom || dateTo;

            if (estFiltrageActif && dossiersFiltres.length === 0) return null;

            return (
              <div
                key={g.id}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <button
                  className={`w-full flex items-center justify-between px-5 py-4 transition-all duration-200 ${
                    isExpanded
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-b-2 border-indigo-600/20'
                      : 'bg-gradient-to-r from-indigo-50 to-purple-50/50 hover:from-indigo-100 hover:to-purple-100/50 text-slate-800'
                  }`}
                  onClick={() => toggleGroupe(g.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-2 ${
                        isExpanded
                          ? 'bg-white/20 text-white border-white/30'
                          : 'bg-white text-indigo-600 border-indigo-200'
                      }`}
                    >
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Calendar size={20} className={isExpanded ? 'text-white/80' : 'text-indigo-600'} />
                      <span className={`font-bold text-base ${isExpanded ? 'text-white' : 'text-slate-800'}`}>
                        {g.periode}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm border-2 ${
                      isExpanded
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-white text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <FileText size={13} />
                    {dossiersFiltres.length} dossier{dossiersFiltres.length > 1 ? 's' : ''}
                  </span>
                </button>

                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/60 to-white">
                    {isLoading ? (
                      <p className="text-sm text-slate-500 font-medium py-4 text-center">
                        Chargement des dossiers…
                      </p>
                    ) : dossiersFiltres.length === 0 ? (
                      <p className="text-sm text-slate-400 font-medium py-8 text-center">
                        Aucun dossier ne correspond à votre recherche
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dossiersFiltres.map((d: DossierAPIResponse) => (
                          <DossierTicketCard
                            key={d.id}
                            accentColor="bg-indigo-400"
                            numArrivee={d.num_chrono || '—'}
                            nom={d.nom_association || '—'}
                            type={d.type_dossier || 'Création'}
                            date={formatDate(d.date_depot)}
                            heure={formatHeure(d.heure_depot)}
                            statusLabel="ARCHIVÉ"
                            statusStyles="bg-indigo-50 text-indigo-700 border-indigo-200"
                            onDetail={() => setDetailDossier(d)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {detailDossier && (
        <DetailTemplateModal
          dossier={apiToDossier(detailDossier)}
          onClose={() => setDetailDossier(null)}
          headerGradient="from-indigo-500 to-purple-500"
          hideDefaultSidebarButtons
        />
      )}
    </div>
  );
};

export default HistoriqueArriveeSection;
