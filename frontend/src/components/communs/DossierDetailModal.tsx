import React from 'react';
import { X, FileText, Calendar, User, MapPin, Tag, FileSignature, Pencil, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Dossier } from '../../types';
import { CategorieBadge } from './CategorieBadge';

interface DossierDetailModalProps {
  dossier: Dossier;
  onClose: () => void;
  onEdit?: (dossier: Dossier) => void;
  actions?: React.ReactNode;
}

export const DossierDetailModal: React.FC<DossierDetailModalProps> = ({ dossier, onClose, onEdit, actions }) => {
  const d = dossier;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl shadow-indigo-500/10 overflow-hidden scale-in" onClick={e => e.stopPropagation()}>

        {/* Header avec motif décoratif */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 px-6 py-5 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full bg-white" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <FileText size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Détails du dossier</h3>
                <p className="text-xs text-indigo-200">Informations complètes</p>
              </div>
            </div>
            <button className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body — plus spacieux */}
        <div className="p-8 space-y-6">
          {/* N° Arrivée + Type — Carte mise en avant */}
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">N° Arrivée</span>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{d.numArrivee}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                d.type === 'Renouvellement' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-sky-100 text-sky-700 border border-sky-200'
              }`}>
                {d.type}
              </span>
            </div>
          </div>

          {/* Association */}
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Association</span>
            <p className="text-lg font-semibold text-slate-800 mt-0.5">{d.nom}</p>
          </div>

          {/* Grille d'infos — 3 colonnes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Calendar, label: 'Date', value: d.dateArrivee || '—', sub: d.heureArrivee },
              { icon: User, label: 'Président', value: d.president || '—' },
              { icon: FileSignature, label: 'Abréviation', value: d.abreviation || d.sigle || '—' },
            ].map(item => (
              <div key={item.label} className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <item.icon size={11} className="text-indigo-400" /> {item.label}
                </span>
                <p className="font-medium text-slate-700 mt-0.5 text-sm">{item.value}</p>
                {item.sub && <p className="text-[11px] text-slate-400 mt-0.5">{item.sub}</p>}
              </div>
            ))}
            {/* Catégorie(s) avec badges multiples */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Tag size={11} className="text-indigo-400" /> Catégorie(s)
              </span>
              <CategorieBadge categorie={d.categorie || ''} />
            </div>
          </div>

          {/* Siège + District — bloc complet */}
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="p-4">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={11} className="text-indigo-400" /> Siège
                </span>
                <p className="font-medium text-slate-700 mt-1 text-sm whitespace-pre-wrap">{d.siege || '—'}</p>
              </div>
              <div className="p-4">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={11} className="text-indigo-400" /> District
                </span>
                <p className="font-medium text-slate-700 mt-1 text-sm">{d.district || '—'}</p>
              </div>
            </div>
          </div>

          {/* Objet */}
          {d.objet && (
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={11} className="text-indigo-400" /> Objet
              </span>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{d.objet}</p>
            </div>
          )}

          {/* Verdict */}
          {d.verdict && d.verdict !== 'aucun' && (
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verdict</span>
              {d.verdict === 'favorable' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200 shadow-sm">
                  <CheckCircle size={13} /> Favorable
                </span>
              ) : d.verdict === 'defavorable' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200 shadow-sm">
                  <XCircle size={13} /> Défavorable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold border border-yellow-200 shadow-sm">
                  <Clock size={13} /> En attente
                </span>
              )}
            </div>
          )}

          {/* Récépissés */}
          {d.type === 'Renouvellement' && (d.arn || d.recuFr || d.recuMg) && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Récépissés</span>
              {d.arn && (
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400">ARN</span>
                  <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{d.arn}</p>
                </div>
              )}
              {d.recuFr && (
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400">Récépissé FR</span>
                  <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{d.recuFr}</p>
                </div>
              )}
              {d.recuMg && (
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400">Récépissé MG</span>
                  <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{d.recuMg}</p>
                </div>
              )}
            </div>
          )}

          {/* Personne sortie */}
          {d.personneSortie && (
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={11} className="text-indigo-400" /> Personne sortie
              </span>
              <p className="font-medium text-slate-700 mt-0.5 text-sm">{d.personneSortie}</p>
            </div>
          )}

          {/* Numéro de sortie */}
          {d.numeroSortie && (
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={11} className="text-amber-400" /> N° Sortie
              </span>
              <p className="font-medium text-slate-700 mt-0.5 text-sm">{d.numeroSortie}</p>
            </div>
          )}

          {/* Actions buttons */}
          {actions && (
            <div className="pt-4 border-t border-slate-100">
              {actions}
            </div>
          )}

          {/* Bouton Modifier par défaut */}
          {!actions && onEdit && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50 flex items-center gap-2 text-sm"
                onClick={() => onEdit(d)}
              >
                <Pencil size={15} /> Modifier le dossier
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
