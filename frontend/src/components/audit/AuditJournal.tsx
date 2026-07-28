import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAuditJournal, AuditLog } from '../../services/auditService';
import { History, RefreshCw, Search, X, ChevronDown, ChevronUp, FileText, Eye } from 'lucide-react';

// ───── Constantes ─────

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'création',
  UPDATE: 'modification',
  DELETE: 'suppression',
};

const ACTION_BADGE: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-rose-100 text-rose-700',
};

const STATUT_LABELS: Record<string, string> = {
  reception: 'Réception',
  en_attente: 'En attente',
  en_cours: 'En cours',
  defavorable: 'Défavorable',
  defavorable_traite: 'Défavorable traité',
  livraison: 'Livraison',
  registre_chrono: 'Registre chrono',
  annuaire: 'Annuaire',
  archive_annuaire: 'Archive annuaire',
  archive_arrivee: 'Archive arrivée',
  historique_sortie: 'Historique sortie',
  duplicata: 'Duplicata',
};

const VERDICT_BADGE: Record<string, string> = {
  favorable: 'bg-green-100 text-green-700',
  defavorable: 'bg-red-100 text-red-700',
  aucun: 'bg-slate-100 text-slate-500',
};

const VERDICT_LABELS: Record<string, string> = {
  favorable: 'Favorable',
  defavorable: 'Défavorable',
  aucun: 'Aucun',
};

// ───── Helpers de format ─────

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return {
    jour: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
    heure: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    iso: d.toISOString(),
  };
};

const safe = (val: unknown): string =>
  val == null || val === '' || val === 'null' || val === 'undefined' ? '' : String(val);

const tronque = (s: string, max: number = 35) =>
  s.length > max ? s.slice(0, max) + '…' : s;

// ───── Détection des champs modifiés (diff) ─────

interface DiffEntry {
  champ: string;
  avant: string;
  apres: string;
}

const CHAMPS_IGNORES = ['id', 'date_creation', 'date_modification', 'association_id', 'district_id', 'sous_type_id', 'created_by'];

const LABELS_CHAMPS: Record<string, string> = {
  num_chrono: 'N° chrono',
  nom_association: 'Association',
  siege: 'Siège',
  district: 'District',
  president: 'Président',
  abreviation: 'Abréviation',
  type_dossier: 'Type',
  sous_type: 'Sous-type',
  objet: 'Objet',
  date_depot: 'Date dépôt',
  heure_depot: 'Heure dépôt',
  status: 'Statut',
  verdict: 'Verdict',
  emplacement: 'Emplacement',
  arn: 'ARN',
  recu_fr: 'Récépissé FR',
  recu_mg: 'Récépissé MG',
};

const extractDiffs = (oldData: any, newData: any): DiffEntry[] => {
  if (!oldData || !newData) return [];
  const diffs: DiffEntry[] = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of allKeys) {
    if (CHAMPS_IGNORES.includes(key)) continue;
    const oldVal = safe(oldData[key]);
    const newVal = safe(newData[key]);
    if (oldVal !== newVal) {
      diffs.push({
        champ: LABELS_CHAMPS[key] || key,
        avant: oldVal || '—',
        apres: newVal || '—',
      });
    }
  }
  return diffs;
};

// ───── Enrichissement métier ─────

const getEnrichissement = (log: AuditLog): string | null => {
  if (log.action === 'UPDATE' && log.verdict) {
    if (log.verdict === 'favorable') return 'Traité favorable';
    if (log.verdict === 'defavorable') return 'Traité défavorable';
  }
  if (log.action === 'UPDATE') {
    if (log.status_dossier) {
      const statut = log.status_dossier;
      if (statut === 'annuaire') return 'Classé à l\'annuaire';
      if (statut === 'registre_chrono') return 'Transféré au registre chrono';
      if (statut === 'livraison') return 'En livraison';
      if (statut === 'en_attente') return 'Mis en attente';
      if (statut === 'en_cours') return 'En cours de traitement';
      if (statut === 'historique_sortie') return 'Sorti (historique)';
    }
  }
  if (log.action === 'INSERT' && log.verdict) {
    if (log.verdict === 'favorable') return 'Créé avec verdict favorable';
    if (log.verdict === 'defavorable') return 'Créé avec verdict défavorable';
  }
  return null;
};

// ───── Composant DiffRow ─────

const DiffRow: React.FC<{ diff: DiffEntry }> = ({ diff }) => (
  <div className="grid grid-cols-[120px_1fr_1fr] gap-2 text-xs py-1.5 border-b border-dashed border-slate-200 last:border-0">
    <span className="font-semibold text-slate-600">{diff.champ}</span>
    <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 line-through decoration-red-400">
      {tronque(diff.avant, 40)}
    </span>
    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 font-medium">
      {tronque(diff.apres, 40)}
    </span>
  </div>
);

// ───── Composant principal ─────

export const AuditJournal: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditJournal(300);
      setLogs(data);
    } catch (err) {
      console.error('Erreur chargement journal:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Filtrage ──
  const logsFiltres = logs.filter(log => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      safe(log.table_name).toLowerCase().includes(q) ||
      safe(log.username).toLowerCase().includes(q) ||
      safe(log.action).toLowerCase().includes(q) ||
      safe(log.nom_association).toLowerCase().includes(q) ||
      safe(log.num_chrono).toLowerCase().includes(q) ||
      safe(log.type_dossier).toLowerCase().includes(q) ||
      safe(log.verdict).toLowerCase().includes(q) ||
      safe(log.status_dossier).toLowerCase().includes(q)
    );
  });

  // ── Stats ──
  const countInsert = logs.filter(l => l.action === 'INSERT').length;
  const countUpdate = logs.filter(l => l.action === 'UPDATE').length;
  const countDelete = logs.filter(l => l.action === 'DELETE').length;

  // ── Loading ──
  if (loading && logs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg border border-slate-200 p-20 text-center">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Chargement du journal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* ── Header ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <History size={18} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Journal d'audit
            </h1>
            <p className="text-xs text-slate-500">
              {logsFiltres.length} événement{logsFiltres.length !== 1 ? 's' : ''}
              {filter && ' filtré(s)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 border border-slate-300 rounded"
            />
            Auto
          </label>
          <button
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Chargement…' : 'Rafraîchir'}
          </button>
        </div>
      </div>

      {/* ── Filtre ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Filtrer par n°, association, agent, statut, verdict…  (⌘K)"
            className="w-full border border-slate-300 rounded-lg pl-9 pr-9 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          {filter && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded p-1 transition-colors"
              onClick={() => setFilter('')}
              title="Effacer le filtre"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Liste ── */}
      {logsFiltres.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <FileText size={24} className="text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-500">
            {filter ? 'Aucun résultat' : 'Journal vide'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {filter ? 'Aucun événement ne correspond à votre filtre.' : 'Aucun événement enregistré pour le moment.'}
          </p>
          {filter && (
            <button
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              onClick={() => setFilter('')}
            >
              Effacer le filtre
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {logsFiltres.map(log => {
            const date = formatDate(log.created_at);
            const actionLabel = ACTION_LABELS[log.action] || log.action.toLowerCase();
            const enrichi = getEnrichissement(log);
            const diffs = log.action === 'UPDATE' && log.old_data && log.new_data
              ? extractDiffs(log.old_data, log.new_data)
              : [];
            const isOpen = expanded.has(log.id);

            return (
              <div
                key={log.id}
                className="bg-white rounded-lg border border-slate-200 transition-shadow hover:shadow-sm"
              >
                {/* ── Ligne principale ── */}
                <div className="p-3.5 flex items-start gap-3 cursor-pointer" onClick={() => toggleExpand(log.id)}>
                  {/* Badge action */}
                  <div className="shrink-0 mt-0.5">
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${ACTION_BADGE[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {actionLabel}
                    </span>
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">
                        {safe(log.num_chrono) || '—'}
                      </span>
                      <span className="text-slate-600">
                        {safe(log.nom_association) || '—'}
                      </span>
                      {log.type_dossier && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {log.type_dossier}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{date.jour}</span>
                      <span className="font-mono">{date.heure}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>Agent: {log.username || 'Anonyme'}</span>
                      {log.status_dossier && (
                        <>
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            log.status_dossier === 'defavorable'
                              ? 'bg-red-50 text-red-600'
                              : log.status_dossier === 'annuaire' || log.status_dossier === 'registre_chrono'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-slate-50 text-slate-500'
                          }`}>
                            {STATUT_LABELS[log.status_dossier] || log.status_dossier}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Enrichissement métier */}
                    {enrichi && (
                      <div className="mt-1">
                        <span className="inline-block text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded">
                          {enrichi}
                        </span>
                        {log.verdict && log.verdict !== 'aucun' && (
                          <span className={`ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${VERDICT_BADGE[log.verdict] || 'bg-slate-50'}`}>
                            Verdict: {VERDICT_LABELS[log.verdict] || log.verdict}
                          </span>
                        )}
                      </div>
                    )}

                    {!enrichi && log.verdict && log.verdict !== 'aucun' && (
                      <div className="mt-1">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${VERDICT_BADGE[log.verdict]}`}>
                          Verdict: {VERDICT_LABELS[log.verdict] || log.verdict}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expand / Collapse */}
                  <div className="shrink-0 mt-1">
                    {diffs.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                        <Eye size={11} />
                        {diffs.length} modif{diffs.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <div className="mt-1 flex justify-end">
                      {diffs.length > 0 ? (
                        isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* ── Panneau de diff dépliant ── */}
                {isOpen && diffs.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50 rounded-b-lg p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Détail des modifications
                    </p>
                    <div className="space-y-0">
                      {diffs.map((diff, idx) => (
                        <DiffRow key={idx} diff={diff} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stats bar ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-300 rounded inline-block" />
            Créations ({countInsert})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-amber-300 rounded inline-block" />
            Modifications ({countUpdate})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-rose-300 rounded inline-block" />
            Suppressions ({countDelete})
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          {logs.length} événements chargés · {logsFiltres.length} affichés
        </p>
      </div>
    </div>
  );
};

export default AuditJournal;
