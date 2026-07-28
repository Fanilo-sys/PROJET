import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Inbox, Layers, Clock, CheckCircle,
  Database, Users, Calendar, RefreshCw,
  ChevronDown, ChevronRight, Tag, MapPin, FileText,
} from 'lucide-react';
import { getStats, getDossiersParCategorie, getDossiersParDistrict, getDossiersParType } from '../../services/dossierService';
import { StatisticsResponse, DossierAPIResponse, StatusDossier, TabId, Dossier } from '../../types';
import { DossierTicketCard } from '../communs/DossierTicketCard';
import { DossierDetailModal } from '../communs/DossierDetailModal';
import { apiToDossier } from '../communs/toDossier';
import { initSocket } from '../../services/socket';

// ============================================================
// TYPES
// ============================================================
interface DashboardData {
  pipeline: StatisticsResponse['pipeline'];
  parCategorie: Array<{ categorie: string; count: string }>;
  parDistrict: Array<{ district: string; count: string }>;
  parTypeDossier: Array<{ type_dossier: string; count: string }>;
  total: number;
}

const STATUS_LABEL: Record<string, string> = {
  reception: 'Réception',
  en_attente: 'En Pile',
  en_cours: 'En Cours',
  livraison: 'Prêt / Signé',
  registre_chrono: 'Reg. Chrono',
  annuaire: 'Annuaire',
  defavorable: 'Défavorable',
  historique_sortie: 'Hist. Sortie',
  historique_arrivee: 'Hist. Arrivée',
  historique_defavorable: 'Hist. Défav.',
  duplicata: 'Duplicata',
  defavorable_traite: 'Défav. Traité',
  archive_arrivee: 'Arch. Arrivée',
};

const STATUS_ACCENT: Record<string, string> = {
  reception: 'bg-blue-500',
  en_attente: 'bg-amber-500',
  en_cours: 'bg-indigo-500',
  livraison: 'bg-emerald-500',
  registre_chrono: 'bg-violet-500',
  annuaire: 'bg-pink-500',
  defavorable: 'bg-red-500',
  historique_sortie: 'bg-teal-500',
  historique_arrivee: 'bg-orange-500',
  historique_defavorable: 'bg-rose-500',
  duplicata: 'bg-purple-500',
  defavorable_traite: 'bg-yellow-600',
  archive_arrivee: 'bg-slate-500',
};

const KPI_DEFS: Array<{ status: string; label: string; icon: React.ReactNode; color: string; tab: StatusDossier }> = [
  { status: 'reception', label: 'Réception', icon: <Inbox size={18} />, color: 'bg-blue-500', tab: 'reception' },
  { status: 'en_attente', label: 'En Pile', icon: <Layers size={18} />, color: 'bg-amber-500', tab: 'en_attente' },
  { status: 'en_cours', label: 'En Cours', icon: <Clock size={18} />, color: 'bg-indigo-500', tab: 'en_cours' },
  { status: 'livraison', label: 'Livraison', icon: <CheckCircle size={18} />, color: 'bg-emerald-500', tab: 'livraison' },
  { status: 'registre_chrono', label: 'Reg. Chrono', icon: <Database size={18} />, color: 'bg-violet-500', tab: 'registre_chrono' },
  { status: 'annuaire', label: 'Annuaire', icon: <Users size={18} />, color: 'bg-pink-500', tab: 'annuaire' },
];

// ============================================================
// KPI CARD
// ============================================================
const KPICard: React.FC<{
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  onClick?: () => void;
}> = ({ icon, label, count, color, onClick }) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    className={[
      'flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-white',
      'transition-all duration-150',
      onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5' : '',
    ].join(' ')}
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} text-white shadow-sm`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</div>
      <div className="text-xl font-bold text-slate-800 tabular-nums">{count}</div>
    </div>
  </div>
);

// ============================================================
// EXPANDABLE LIST (Catégories / Districts / Types)
// ============================================================
interface ExpandableListProps {
  title: string;
  icon: React.ReactNode;
  items: Array<{ key: string; label: string; count: number }>;
  expandedKey: string | null;
  loadingKey: string | null;
  dossiers: DossierAPIResponse[];
  onToggle: (key: string) => void;
  onDossierDetail: (dossier: DossierAPIResponse) => void;
}

const ExpandableList: React.FC<ExpandableListProps> = ({
  title, icon, items, expandedKey, loadingKey, dossiers, onToggle, onDossierDetail,
}) => (
  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
      {icon}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <span className="text-xs text-slate-400 ml-auto">{items.length}</span>
    </div>

    {items.length === 0 ? (
      <p className="text-xs text-slate-400 text-center py-8 px-4">Aucune donnée pour cette période</p>
    ) : (
      <div className="divide-y divide-slate-50">
        {items.map((item) => {
          const isExpanded = expandedKey === item.key;
          const isLoading = loadingKey === item.key;
          return (
            <div key={item.key}>
              <button
                onClick={() => onToggle(isExpanded ? '' : item.key)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
              >
                {isExpanded
                  ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                  : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                }
                <span className="text-sm text-slate-700 flex-1 truncate font-medium">
                  {item.label || '(vide)'}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 pt-1">
                  {isLoading ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      <RefreshCw size={14} className="animate-spin inline mr-2" />
                      Chargement des dossiers...
                    </div>
                  ) : dossiers.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Aucun dossier trouvé</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {dossiers.map((d) => (
                        <DossierTicketCard
                          key={d.id}
                          accentColor={STATUS_ACCENT[d.status || 'reception'] || 'bg-slate-400'}
                          numArrivee={d.num_chrono || ''}
                          nom={d.nom_association || ''}
                          type={d.type_dossier || 'Création'}
                          date={d.date_depot ? d.date_depot.split('T')[0] : ''}
                          heure={d.heure_depot ? d.heure_depot.slice(0, 5) : ''}
                          statusLabel={STATUS_LABEL[d.status || ''] || d.status}
                          statusStyles="bg-slate-50 text-slate-600 border-slate-200"
                          onDetail={() => onDossierDetail(d)}
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
  </div>
);

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================
interface DashboardSectionProps {
  onTabChange: (tab: TabId) => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({ onTabChange }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'year'>('all');
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expandable state
  const [expandedCategorie, setExpandedCategorie] = useState<string | null>(null);
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [catDossiers, setCatDossiers] = useState<DossierAPIResponse[]>([]);
  const [disDossiers, setDisDossiers] = useState<DossierAPIResponse[]>([]);
  const [typeDossiers, setTypeDossiers] = useState<DossierAPIResponse[]>([]);
  const [loadingCat, setLoadingCat] = useState<string | null>(null);
  const [loadingDis, setLoadingDis] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [detailDossier, setDetailDossier] = useState<DossierAPIResponse | null>(null);

  const availableYears = Array.from({ length: 10 }, (_, i) => String(2020 + i)).filter(y => parseInt(y) <= currentYear + 2);

  const MONTHS = [
    { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' }, { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' }, { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre' }, { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const annee = filterMode === 'year' ? selectedYear : undefined;
      const monthVal = selectedMonth.split('-')[1] || String(new Date().getMonth() + 1).padStart(2, '0');
      const mois = filterMode === 'month' ? `${selectedYear}-${monthVal}` : undefined;

      const stats: StatisticsResponse = await getStats(annee, mois);

      // ✅ CORRECTION : le total peut être un nombre (vue matérialisée), une chaîne, ou un tableau
      let totalExtracted = 0;
      if (typeof stats.total === 'number') {
        totalExtracted = stats.total;
      } else if (typeof stats.total === 'string') {
        totalExtracted = parseInt(stats.total) || 0;
      } else if (Array.isArray(stats.total) && stats.total.length > 0) {
        totalExtracted = parseInt((stats.total[0] as any).count || '0') || 0;
      }

      setData({
        pipeline: stats.pipeline,
        parCategorie: Array.isArray(stats.parCategorie) ? stats.parCategorie : [],
        parDistrict: Array.isArray(stats.parDistrict) ? stats.parDistrict : [],
        parTypeDossier: Array.isArray(stats.parTypeDossier) ? stats.parTypeDossier : [],
        total: totalExtracted,
      });

      setExpandedCategorie(null);
      setExpandedDistrict(null);
      setExpandedType(null);
      setCatDossiers([]);
      setDisDossiers([]);
      setTypeDossiers([]);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
      setError('Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, [filterMode, selectedYear, selectedMonth]);

  // Chargement initial + socket listeners pour auto-refresh
  useEffect(() => {
    fetchData();

    // ✅ CORRECTION : écouter les événements socket pour rafraîchir le dashboard automatiquement
    const socket = initSocket();
    if (socket) {
      const handleRefresh = () => {
        console.log('🔄 Dashboard: rafraîchissement via socket');
        fetchData();
      };
      socket.on('dossiers:created', handleRefresh);
      socket.on('dossiers:updated', handleRefresh);
      socket.on('dossiers:deleted', handleRefresh);
      socket.on('dossiers:archived', handleRefresh);
      socket.on('historique-arrivee:changed', handleRefresh);

      return () => {
        socket.off('dossiers:created', handleRefresh);
        socket.off('dossiers:updated', handleRefresh);
        socket.off('dossiers:deleted', handleRefresh);
        socket.off('dossiers:archived', handleRefresh);
        socket.off('historique-arrivee:changed', handleRefresh);
      };
    }
  }, [fetchData]);

  const handleToggleCategorie = async (key: string) => {
    if (!key) {
      setExpandedCategorie(null);
      setCatDossiers([]);
      return;
    }
    setExpandedCategorie(key);
    setLoadingCat(key);
    try {
      const dossiers = await getDossiersParCategorie(key, filterMode === 'year' ? selectedYear : undefined);
      setCatDossiers(Array.isArray(dossiers) ? dossiers : []);
    } catch (err) {
      console.error('Erreur chargement dossiers catégorie:', err);
      setCatDossiers([]);
    } finally {
      setLoadingCat(null);
    }
  };

  const handleToggleDistrict = async (key: string) => {
    if (!key) {
      setExpandedDistrict(null);
      setDisDossiers([]);
      return;
    }
    setExpandedDistrict(key);
    setLoadingDis(key);
    try {
      const dossiers = await getDossiersParDistrict(key, filterMode === 'year' ? selectedYear : undefined);
      setDisDossiers(Array.isArray(dossiers) ? dossiers : []);
    } catch (err) {
      console.error('Erreur chargement dossiers district:', err);
      setDisDossiers([]);
    } finally {
      setLoadingDis(null);
    }
  };

  const handleToggleType = async (key: string) => {
    if (!key) {
      setExpandedType(null);
      setTypeDossiers([]);
      return;
    }
    setExpandedType(key);
    setLoadingType(key);
    try {
      const dossiers = await getDossiersParType(key, filterMode === 'year' ? selectedYear : undefined);
      setTypeDossiers(Array.isArray(dossiers) ? dossiers : []);
    } catch (err) {
      console.error('Erreur chargement dossiers type:', err);
      setTypeDossiers([]);
    } finally {
      setLoadingType(null);
    }
  };

  const handleMonthChange = (monthVal: string) => {
    setSelectedMonth(`${selectedYear}-${monthVal}`);
  };

  const currentMonthValue = selectedMonth.split('-')[1] || String(new Date().getMonth() + 1).padStart(2, '0');
  const pipelineTotal = data
    ? KPI_DEFS.reduce((s, kpi) => s + ((data.pipeline as any)[kpi.status] || 0), 0)
    : 0;

  const filterLabel = filterMode === 'all'
    ? 'Tous les dossiers'
    : filterMode === 'month'
      ? `${MONTHS.find(m => m.value === currentMonthValue)?.label || 'Mois'} ${selectedYear}`
      : `Année ${selectedYear}`;

  // ✅ CORRECTION : useMemo sécurisés avec Array.isArray
  const categorieItems = useMemo(() => {
    if (!data?.parCategorie || !Array.isArray(data.parCategorie)) return [];
    return data.parCategorie
      .filter(c => c?.categorie?.trim())
      .map(c => ({ key: c.categorie, label: c.categorie, count: Number(c.count) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const districtItems = useMemo(() => {
    if (!data?.parDistrict || !Array.isArray(data.parDistrict)) return [];
    return data.parDistrict
      .filter(d => d?.district?.trim())
      .map(d => ({ key: d.district, label: d.district, count: Number(d.count) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const typeItems = useMemo(() => {
    if (!data?.parTypeDossier || !Array.isArray(data.parTypeDossier)) return [];
    return data.parTypeDossier
      .filter(t => t?.type_dossier?.trim())
      .map(t => ({ key: t.type_dossier, label: t.type_dossier, count: Number(t.count) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar size={18} />
          <span className="text-sm font-semibold">Période</span>
        </div>

        <div className="flex border border-slate-300 rounded-md overflow-hidden">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${filterMode === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Tout
          </button>
          <button
            onClick={() => setFilterMode('month')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${filterMode === 'month' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Mois
          </button>
          <button
            onClick={() => setFilterMode('year')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${filterMode === 'year' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Année
          </button>
        </div>

        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="border border-slate-300 rounded-md px-2.5 py-1.5 text-sm text-slate-700 bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
        >
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {filterMode === 'month' && (
          <select
            value={currentMonthValue}
            onChange={e => handleMonthChange(e.target.value)}
            className="border border-slate-300 rounded-md px-2.5 py-1.5 text-sm text-slate-700 bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        )}

        <button
          onClick={fetchData}
          disabled={loading}
          className="ml-auto px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium border border-blue-600 hover:bg-blue-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm font-medium text-center">
          ⚠️ {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <LayoutDashboard size={20} className="text-blue-500" />
          Tableau de Bord
          <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
            {filterLabel}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <RefreshCw size={12} className="animate-spin" />
              Chargement...
            </div>
          )}
          <div className="bg-slate-700 text-white px-3 py-1.5 rounded-md text-sm font-bold">
            Total: {pipelineTotal}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_DEFS.map((kpi) => {
          const count = data ? ((data.pipeline as any)[kpi.status] || 0) : 0;
          return (
            <KPICard
              key={kpi.status}
              icon={kpi.icon}
              label={kpi.label}
              count={count}
              color={kpi.color}
              onClick={() => onTabChange(kpi.tab)}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ExpandableList
          title="Par Catégorie"
          icon={<Tag size={16} className="text-blue-500" />}
          items={categorieItems}
          expandedKey={expandedCategorie}
          loadingKey={loadingCat}
          dossiers={catDossiers}
          onToggle={handleToggleCategorie}
          onDossierDetail={setDetailDossier}
        />

        <ExpandableList
          title="Par District"
          icon={<MapPin size={16} className="text-emerald-500" />}
          items={districtItems}
          expandedKey={expandedDistrict}
          loadingKey={loadingDis}
          dossiers={disDossiers}
          onToggle={handleToggleDistrict}
          onDossierDetail={setDetailDossier}
        />
      </div>

      <ExpandableList
        title="Par Type de Dossier"
        icon={<FileText size={16} className="text-violet-500" />}
        items={typeItems}
        expandedKey={expandedType}
        loadingKey={loadingType}
        dossiers={typeDossiers}
        onToggle={handleToggleType}
        onDossierDetail={setDetailDossier}
      />

      {detailDossier && (
        <DossierDetailModal
          dossier={apiToDossier(detailDossier)}
          onClose={() => setDetailDossier(null)}
        />
      )}
    </div>
  );
};

export default DashboardSection;
