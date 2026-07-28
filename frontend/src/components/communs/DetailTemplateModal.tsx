import React from 'react';
import { X, Building2, MapPin, User, Calendar, Tag, FileText } from 'lucide-react';
import { Dossier } from '../../types';

interface DetailTemplateModalProps {
  dossier: Dossier;
  onClose: () => void;
  onVerdict?: (id: number, verdict: 'favorable' | 'defavorable') => void;
  onUndo?: (id: number) => void;
  onEdit?: (dossier: Dossier) => void;
  onDelete?: (id: number) => void;
  headerGradient?: string;
  sidebarExtra?: React.ReactNode;
  hideDefaultSidebarButtons?: boolean;
  hideActions?: boolean;
}

export const DetailTemplateModal: React.FC<DetailTemplateModalProps> = ({
  dossier: d,
  onClose,
  onVerdict,
  onUndo,
  onEdit,
  onDelete,
  headerGradient = 'from-violet-600 via-indigo-600 to-blue-600',
  sidebarExtra,
  hideDefaultSidebarButtons = false,
  hideActions = false,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
      return `${m[3]}/${m[2]}/${m[1]}`;
    }
    return dateStr;
  };

  const handleDelete = () => {
    if (window.confirm('Supprimer ce dossier ?')) {
      onDelete?.(d.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{
        background: 'linear-gradient(135deg, rgba(224,231,255,0.6) 0%, rgba(252,231,243,0.6) 50%, rgba(219,234,254,0.6) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-pink-300/25 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-blue-200/20 blur-3xl" />
      </div>
      <div
        className="flex w-[960px] max-w-full bg-white rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* MAIN PANEL */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className={`bg-gradient-to-br ${headerGradient} px-8 pt-8 pb-6 relative overflow-hidden flex-shrink-0`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white" />
              <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-white" />
              <div className="absolute top-1/2 right-1/4 w-3 h-3 rounded-full bg-white" />
              <div className="absolute bottom-8 right-8 w-2 h-2 rounded-full bg-white" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-300 via-fuchsia-300 to-rose-300" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-[10px] font-semibold text-white/60 uppercase tracking-[0.2em] mb-1">
                  Numéro d'arrivée
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                  {d.numArrivee || 'N° —'}
                </div>
                <div className="text-sm text-white/60 font-medium mt-1.5 flex items-center gap-2">
                  <Calendar size={12} />
                  {formatDate(d.dateArrivee)}
                  {d.heureArrivee && <span className="text-white/50">à {d.heureArrivee}</span>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-8 space-y-7 overflow-y-auto max-h-[65vh]">
            {/* Association + Type */}
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-violet-500 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                  <Building2 size={12} /> Association
                </label>
                <div className="text-xl font-bold text-slate-900 leading-tight">{d.nom || '—'}</div>
                {d.abreviation && (
                  <div className="text-sm font-medium text-slate-400 mt-0.5">Abrév. : {d.abreviation}</div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <label className="block text-[10px] font-bold text-violet-500 uppercase tracking-[0.15em] mb-1.5">Type</label>
                <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border-2 shadow-sm ${
                  d.type === 'Renouvellement'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-sky-50 text-sky-700 border-sky-300'
                }`}>
                  {d.type || 'Création'}
                </span>
              </div>
            </div>

            {/* Président + Catégorie */}
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4 border border-indigo-100 shadow-sm">
                <label className="block text-[10px] font-bold text-indigo-500 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                  <User size={12} /> Président(e)
                </label>
                <div className="font-semibold text-slate-800 text-base">{d.president || '—'}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-100 shadow-sm">
                <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                  <Tag size={12} /> Catégorie
                </label>
                <div className="font-semibold text-slate-800">{d.categorie || '—'}</div>
              </div>
            </div>

            {/* Siège */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <MapPin size={13} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em]">SIÈGE</span>
              </div>
              <div className="px-4 pb-2 pt-1">
                <div className="text-base font-bold text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {d.siege || '—'}
                </div>
              </div>
              {d.district && (
                <>
                  <div className="h-px bg-emerald-200 mx-4" />
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em]">District</span>
                    <span className="text-base font-semibold text-emerald-700">{d.district}</span>
                  </div>
                </>
              )}
            </div>

            {/* Objet */}
            {d.objet && (
              <div>
                <label className="block text-[10px] font-bold text-violet-500 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                  <FileText size={12} /> Objet
                </label>
                <div className="font-medium text-slate-700 whitespace-pre-wrap bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  {d.objet}
                </div>
              </div>
            )}

            {/* Récépissés */}
            {d.type === 'Renouvellement' && (d.arn || d.recuFr || d.recuMg) && (
              <div>
                <label className="block text-[10px] font-bold text-violet-500 uppercase tracking-[0.15em] mb-2.5">Récépissés</label>
                <div className="grid grid-cols-3 gap-4">
                  {d.arn && (
                    <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-3 border border-sky-200 shadow-sm">
                      <span className="text-[9px] font-bold text-sky-600 uppercase tracking-[0.1em]">ARN</span>
                      <div className="text-sm font-semibold text-slate-700 mt-0.5">{d.arn}</div>
                    </div>
                  )}
                  {d.recuFr && (
                    <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-3 border border-sky-200 shadow-sm">
                      <span className="text-[9px] font-bold text-sky-600 uppercase tracking-[0.1em]">Récépissé FR</span>
                      <div className="text-sm font-semibold text-slate-700 mt-0.5">{d.recuFr}</div>
                    </div>
                  )}
                  {d.recuMg && (
                    <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-3 border border-sky-200 shadow-sm">
                      <span className="text-[9px] font-bold text-sky-600 uppercase tracking-[0.1em]">Récépissé MG</span>
                      <div className="text-sm font-semibold text-slate-700 mt-0.5">{d.recuMg}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sortie info */}
            {(d.numeroSortie || d.personneSortie) && (
              <div className="grid grid-cols-2 gap-4">
                {d.numeroSortie && (
                  <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl p-3 border border-rose-200 shadow-sm">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.15em]">N° de sortie</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{d.numeroSortie}</div>
                  </div>
                )}
                {d.personneSortie && (
                  <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl p-3 border border-rose-200 shadow-sm">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.15em]">Personne sortie</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{d.personneSortie}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-[220px] bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 p-6 flex flex-col gap-3 flex-shrink-0">
          {d.verdict && d.verdict !== 'aucun' && (
            <div className={`text-center text-xs font-bold py-2.5 px-3 rounded-xl border-2 tracking-wider uppercase shadow-sm ${
              d.verdict === 'favorable'
                ? 'bg-green-50 text-green-700 border-green-400'
                : 'bg-red-50 text-red-700 border-red-400'
            }`}>
              {d.verdict === 'favorable' ? '✓ Favorable' : '✗ Défavorable'}
            </div>
          )}

          {sidebarExtra && (
            <>
              {sidebarExtra}
            </>
          )}

          {hideActions ? (
            <div className="text-center text-xs font-medium text-slate-500 bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
              📄 Ce dossier est archivé.<br />
              <span className="text-slate-400">Consultation uniquement</span>
            </div>
          ) : (
            !hideDefaultSidebarButtons && (
              <>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent my-1" />

                {d.verdict === 'aucun' ? (
                  <>
                    <button
                      onClick={() => onVerdict?.(d.id, 'favorable')}
                      className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-600 hover:to-emerald-600 hover:text-white hover:border-green-600 transition-all active:scale-[0.97] shadow-sm"
                    >
                      ✓ Favorable
                    </button>
                    <button
                      onClick={() => onVerdict?.(d.id, 'defavorable')}
                      className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 hover:from-red-600 hover:to-rose-600 hover:text-white hover:border-red-600 transition-all active:scale-[0.97] shadow-sm"
                    >
                      ✗ Défavorable
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onUndo?.(d.id)}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 hover:from-amber-500 hover:to-yellow-500 hover:text-white hover:border-amber-500 transition-all active:scale-[0.97] shadow-sm"
                  >
                    ↺ Annuler
                  </button>
                )}

                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent my-1" />

                <button
                  onClick={() => onEdit?.(d)}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-600 hover:to-indigo-600 hover:text-white hover:border-blue-600 transition-all active:scale-[0.97] shadow-sm"
                >
                  ✎ Modifier
                </button>

                <button
                  onClick={handleDelete}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-slate-300 bg-white text-slate-600 hover:from-red-600 hover:to-rose-600 hover:text-white hover:border-red-500 transition-all active:scale-[0.97] shadow-sm hover:bg-gradient-to-r"
                >
                  🗑 Supprimer
                </button>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};