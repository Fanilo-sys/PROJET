import React, { useState, useMemo } from 'react';
import {
  ThumbsUp, ThumbsDown, Undo2, Trash2, Pencil,
  FileText, Search, Filter, RotateCcw, Eye,
} from 'lucide-react';
import { Dossier, DossierUpdatePayload, DossierCompletUpdatePayload, estProtege, matchesSearchTerm } from '../../types';
import { DetailTemplateModal } from '../communs/DetailTemplateModal';
import { EditDossierModal } from '../communs/EditDossierModal';

interface ReceptionTableauProps {
  dossiers: Dossier[];
  onVerdict: (id: number, verdict: 'favorable' | 'defavorable') => void;
  onUndo: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, data: DossierUpdatePayload | DossierCompletUpdatePayload) => void;
}

// ─── Helpers de format ───────────────────────────────────────
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

// ─── Composant principal ──────────────────────────────────────
export const ReceptionTableau: React.FC<ReceptionTableauProps> = ({
  dossiers,
  onVerdict,
  onUndo,
  onDelete,
  onEdit,
}) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailDossier, setDetailDossier] = useState<Dossier | null>(null);
  const [editForm, setEditForm] = useState<DossierCompletUpdatePayload>({
    num_chrono: '', nom_association: '', siege: '', district: '', president: '',
    type_dossier: 'Création', categorie: 'Autre', emplacement: '',
    abreviation: '', dateArrivee: '', heureArrivee: '', objet: '',
    arn: '', recuFr: '', recuMg: '',
  });

  // Extrait le numéro d'ordre depuis numArrivee (ex: "425/2025" → 425)
  const extraireNumero = (s: string) => {
    const m = s.match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : 999999;
  };

  const dossiersFiltres = useMemo(() => {
    let result = dossiers;
    result = result.filter(d => matchesSearchTerm(d, search));
    if (dateFrom) result = result.filter(d => d.dateArrivee >= dateFrom);
    if (dateTo) result = result.filter(d => d.dateArrivee <= dateTo);
    return [...result].sort((a, b) => extraireNumero(a.numArrivee) - extraireNumero(b.numArrivee));
  }, [dossiers, search, dateFrom, dateTo]);

  const startEdit = (d: Dossier) => {
    setEditingId(d.id);
    setEditForm({
      num_chrono: d.numArrivee || '',
      nom_association: d.nom || '',
      siege: d.siege || '',
      district: d.district || '',
      president: d.president || '',
      type_dossier: d.type || 'Création',
      categorie: d.categorie || 'Autre',
      abreviation: d.abreviation || d.sigle || '',
      dateArrivee: d.dateArrivee || '',
      heureArrivee: d.heureArrivee || '',
      emplacement: d.emplacement || '',
      objet: d.objet || '',
      arn: d.arn || '',
      recuFr: d.recuFr || '',
      recuMg: d.recuMg || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId !== null) { onEdit(editingId, editForm); setEditingId(null); }
  };

  const handleResetFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };

  const handleVerdictFromModal = (id: number, verdict: 'favorable' | 'defavorable') => {
    setDetailDossier(null);
    onVerdict(id, verdict);
  };

  const handleDeleteFromModal = (id: number) => {
    setDetailDossier(null);
    if (window.confirm('Supprimer ce dossier ?')) onDelete(id);
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtres */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 outline-none transition-all"
              type="text"
              placeholder="Rechercher par n°, nom, siège…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Du</span>
              <input className="border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 outline-none transition-all w-32" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Au</span>
              <input className="border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 outline-none transition-all w-32" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {(dateFrom || dateTo || search) && (
              <button className="text-xs font-medium text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5" onClick={handleResetFilters}>
                <RotateCcw size={12} /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compteur */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Filter size={14} className="text-indigo-400" />
          <span>Tous les dossiers</span>
        </div>
        <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm">
          {dossiersFiltres.length}
        </span>
      </div>

      {/* Tickets — grille 2 colonnes */}
      {dossiersFiltres.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">Aucun dossier en réception.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dossiersFiltres.map((d) => {
            const dateFormatted = formatDate(d.dateArrivee);
            const heureFormatted = formatHeure(d.heureArrivee);

            let verdictLabel = 'VERDICT';
            let verdictStyles = 'bg-white text-slate-600 border-slate-300';
            if (d.verdict === 'favorable') {
              verdictLabel = 'FAVORABLE';
              verdictStyles = 'bg-green-50 text-green-700 border-green-400';
            } else if (d.verdict === 'defavorable') {
              verdictLabel = 'DEFAVORABLE';
              verdictStyles = 'bg-red-50 text-red-700 border-red-400';
            }

            const typeColors: Record<string, string> = {
              'Création': 'bg-sky-100 text-sky-700 border-sky-300',
              'Renouvellement': 'bg-amber-100 text-amber-700 border-amber-300',
              'Duplicata': 'bg-purple-100 text-purple-700 border-purple-300',
              'Arrêté': 'bg-rose-100 text-rose-700 border-rose-300',
            };
            const typeColor = typeColors[d.type] || 'bg-slate-100 text-slate-600 border-slate-300';

            const isProtege = estProtege(d.status);

            return (
              <div
                key={d.id}
                className={`group flex border rounded-xl w-full h-[72px] bg-white shadow-sm overflow-hidden transition-all duration-200 ${
                  isProtege 
                    ? 'border-slate-200 opacity-75 cursor-not-allowed hover:border-slate-200' 
                    : 'border-slate-200 hover:shadow-lg hover:border-indigo-200 hover:bg-gradient-to-r hover:from-white hover:to-indigo-50/30 cursor-pointer'
                }`}
                onClick={() => {
                  if (!isProtege) {
                    // Optionnel : ouvrir la modale en cliquant sur la carte (mais je laisse le bouton gérer)
                    // setDetailDossier(d);
                  }
                }}
                title={isProtege ? "Ce dossier est archivé (Registre Chrono ou Annuaire) et ne peut pas être modifié." : ""}
              >
                {/* Accent color band - left side */}
                <div className={`w-[4px] shrink-0 ${d.verdict === 'favorable' ? 'bg-emerald-400' : d.verdict === 'defavorable' ? 'bg-red-400' : 'bg-indigo-400'}`} />

                {/* Section gauche : date / heure + verdict */}
                <div className="flex flex-col justify-between p-2 w-[90px] flex-shrink-0">
                  <div className="text-[10px] leading-tight">
                    <div className="font-semibold text-slate-700">{dateFormatted}</div>
                    <div className="text-slate-400 font-medium">{heureFormatted}</div>
                  </div>
                  <div className={`border ${verdictStyles} text-center py-0.5 px-1 text-[8px] uppercase font-semibold rounded leading-tight tracking-wider`}>
                    {verdictLabel}
                  </div>
                </div>

                {/* Section milieu : N°, type, nom association */}
                <div className="flex-1 flex flex-col justify-center px-2.5 sm:px-3 min-w-0 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 leading-none">{d.numArrivee}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border leading-none ${typeColor}`}>
                      {d.type}
                    </span>
                    {/* ============================================================ */}
                    {/* UN SEUL BADGE : uniquement pour les statuts protégés */}
                    {isProtege && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border leading-none bg-slate-200 text-slate-700 border-slate-300">
                        ARCHIVÉ
                      </span>
                    )}
                    {/* ============================================================ */}
                  </div>
                  <div className="h-px bg-gradient-to-r from-slate-200 to-transparent w-full my-1" />
                  <div className={`text-sm font-semibold truncate leading-tight ${
                    isProtege ? 'text-slate-500' : 'text-slate-800 group-hover:text-indigo-700 transition-colors'
                  }`}>
                    {d.nom}
                  </div>
                </div>

                {/* Section droite : séparateur + bouton détail */}
                <div className="flex items-center pr-2.5 sm:pr-3 flex-shrink-0 gap-1.5 sm:gap-2">
                  <div className="w-px h-[36px] bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
                  <button
                    className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all duration-150 active:scale-90 shadow-sm bg-white ${
                      isProtege 
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed opacity-50'
                        : 'border-indigo-200 text-indigo-400 hover:bg-gradient-to-br hover:from-indigo-500 hover:to-violet-500 hover:text-white hover:border-indigo-400 hover:shadow-md'
                    }`}
                    onClick={() => {
                      if (!isProtege) {
                        setDetailDossier(d);
                      }
                    }}
                    title={isProtege ? "Dossier archivé - consultation impossible" : "Voir détails"}
                    disabled={isProtege}
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de détails avec le template personnalisé */}
      {detailDossier && (
        <DetailTemplateModal
          dossier={detailDossier}
          onClose={() => setDetailDossier(null)}
          onVerdict={(id, verdict) => handleVerdictFromModal(id, verdict)}
          onUndo={(id) => { setDetailDossier(null); onUndo(id); }}
          onEdit={(d) => { setDetailDossier(null); startEdit(d); }}
          onDelete={(id) => handleDeleteFromModal(id)}
          headerGradient="from-violet-600 via-indigo-600 to-blue-600"
          hideActions={estProtege(detailDossier.status)}
        />
      )}

      {/* Modal d'édition */}
      {editingId !== null && (
        <EditDossierModal
          editForm={editForm}
          setEditForm={setEditForm}
          onSubmit={handleSubmit}
          onCancel={() => setEditingId(null)}
          accentColor="violet"
        />
      )}
    </div>
  );
};
