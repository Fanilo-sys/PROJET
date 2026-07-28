import React, { useState } from 'react';
import {
  CalendarDays, FilePen, Copy, RotateCcw, Trash2,
  ChevronDown, ChevronRight, Building2,
} from 'lucide-react';
import { AnnuaireGroup, Dossier, AnnuaireEntry, createDossier as createDossierObject } from '../../types';
import { DetailTemplateModal } from '../communs/DetailTemplateModal';
import { DossierTicketCard } from '../communs/DossierTicketCard';
import { ModifierAnnuaireModal } from './ModifierAnnuaireModal';

interface AnnuaireGroupCardProps {
  group: AnnuaireGroup;
  onRenouveler?: (association: import('../../types').AnnuaireEntry) => void;
  onDuplicata?: (association: import('../../types').AnnuaireEntry) => void;
  onEdit?: (association: import('../../types').AnnuaireEntry) => void;
  onDelete?: (id: number) => void;
  onAssociationUpdated?: () => void;
}

/** Convert an AnnuaireEntry to a Dossier-like object for the detail modal */
const toDossierLike = (a: import('../../types').AnnuaireEntry): Dossier =>
  createDossierObject({
    id: a.id,
    num_chrono: a.num_chrono || '',
    nom_association: a.nom_association || '',
    siege: a.siege || '',
    district: a.district || '',
    president: a.president || '',
    abreviation: a.abreviation || '',
    type_dossier: (a.type_dossier || 'Création') as import('../../types').TypeDossier,
    objet: a.objet || '',
    date_depot: a.date_depot || '',
    heure_depot: a.heure_depot || '',
    status: 'registre_chrono',
    verdict: 'aucun',
    categorie: a.categorie || 'Autre',
    arn: '',
    recu_fr: '',
    recu_mg: '',
    emplacement: '',
  });

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

export const AnnuaireGroupCard: React.FC<AnnuaireGroupCardProps> = ({ group, onRenouveler, onDuplicata, onEdit, onDelete, onAssociationUpdated }) => {
  const [expanded, setExpanded] = useState(false);
  const [detailDossier, setDetailDossier] = useState<Dossier | null>(null);
  const [editAssociation, setEditAssociation] = useState<AnnuaireEntry | null>(null);

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden group/card">
      {/* Header du groupe */}
      <button
        className={`w-full flex items-center justify-between px-5 py-4 transition-all duration-200 ${
          expanded
            ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white border-b-2 border-sky-600/20 shadow-inner'
            : 'bg-gradient-to-r from-sky-50 to-indigo-50/50 hover:from-sky-100 hover:to-indigo-100/50 text-slate-800'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-2 ${
            expanded
              ? 'bg-white/20 text-white border-white/30 shadow-lg'
              : 'bg-white text-sky-600 border-sky-200 shadow-sm group-hover/card:border-sky-300'
          }`}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>
          <div className="flex items-center gap-2.5">
            <CalendarDays size={20} className={expanded ? 'text-white/80' : 'text-sky-600'} />
            <span className={`font-bold text-base tracking-tight ${expanded ? 'text-white' : 'text-slate-800'}`}>
              {group.periode}
            </span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm border-2 transition-all ${
          expanded
            ? 'bg-white/20 text-white border-white/30 backdrop-blur-sm'
            : 'bg-white text-sky-700 border-sky-200'
        }`}>
          <Building2 size={13} />
          {group.associations.length} association{group.associations.length > 1 ? 's' : ''}
        </span>
      </button>

      {/* Liste des associations en DossierTicketCard */}
      {expanded && (
        <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/60 to-white">
          {group.associations.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">Aucune association dans ce groupe.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.associations.map((a: import('../../types').AnnuaireEntry) => (
                <DossierTicketCard
                  key={a.id}
                  accentColor="bg-sky-400"
                  numArrivee={a.num_chrono || '—'}
                  nom={a.nom_association || ''}
                  type={a.type_dossier || 'Création'}
                  date={formatDate(a.date_depot)}
                  heure={formatHeure(a.heure_depot)}
                  statusLabel="ARCHIVÉ"
                  statusStyles="bg-indigo-50 text-indigo-700 border-indigo-200"
                  onDetail={() => setDetailDossier(toDossierLike(a))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de détails avec actions annuaire */}
      {detailDossier && (
        <DetailTemplateModal
          dossier={detailDossier}
          onClose={() => setDetailDossier(null)}
          headerGradient="from-sky-500 to-cyan-500"
          hideDefaultSidebarButtons
          sidebarExtra={
            <div className="flex flex-col gap-2">
              <button
                className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-transparent hover:border-sky-400/30 transition-all shadow-md shadow-sky-200/50 hover:shadow-lg hover:shadow-sky-300/50 flex items-center gap-1.5 active:scale-[0.97]"
                onClick={() => { const entry = group.associations.find(e => e.id === detailDossier.id); if (entry && onRenouveler) onRenouveler(entry); }}
              >
                <RotateCcw size={13} /> Renouveler
              </button>
              <button
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-transparent hover:border-indigo-400/30 transition-all shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50 flex items-center gap-1.5 active:scale-[0.97]"
                onClick={() => { const entry = group.associations.find(e => e.id === detailDossier.id); if (entry && onDuplicata) onDuplicata(entry); }}
              >
                <Copy size={13} /> Duplicata
              </button>
              <button
                className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-600 hover:to-indigo-600 hover:text-white hover:border-blue-600 transition-all active:scale-[0.97] shadow-sm"
                onClick={() => { const entry = group.associations.find(e => e.id === detailDossier.id); if (entry) { setEditAssociation(entry); setDetailDossier(null); } }}
              >
                ✎ Modifier
              </button>
              <button
                className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-slate-300 bg-white text-slate-600 hover:from-red-600 hover:to-rose-600 hover:text-white hover:border-red-500 transition-all active:scale-[0.97] shadow-sm hover:bg-gradient-to-r"
                onClick={() => { if (window.confirm('Supprimer définitivement cette association de l\'annuaire ?')) { onDelete && onDelete(detailDossier.id); setDetailDossier(null); } }}
              >
                🗑 Supprimer
              </button>
            </div>
          }
        />
      )}

      {/* Modal de modification */}
      {editAssociation && (
        <ModifierAnnuaireModal
          association={editAssociation}
          onClose={() => setEditAssociation(null)}
          onSuccess={() => onAssociationUpdated?.()}
        />
      )}
    </div>
  );
};
