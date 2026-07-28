import React, { useState, useMemo } from 'react';
import {
  FileText, Filter, Send, Undo2, Trash2, Download, Clock, Pencil,
} from 'lucide-react';
import { Dossier, DossierCompletUpdatePayload, estProtege, matchesSearchTerm } from '../../types';
import { SearchFilterBar } from '../communs/SearchFilterBar';
import { DetailTemplateModal } from '../communs/DetailTemplateModal';
import { EditDossierModal } from '../communs/EditDossierModal';
import { DossierTicketCard } from '../communs/DossierTicketCard';

interface PileTravailProps {
  dossiers: Dossier[];
  onEnvoyer: (id: number) => void;
  onDownloadDocx: (dossier: Dossier) => void;
  dossiersTelecharges: Set<number>;
  onUndo?: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (id: number, data: DossierCompletUpdatePayload) => void;
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

export const PileTravail: React.FC<PileTravailProps> = ({
  dossiers, onEnvoyer, onDownloadDocx, dossiersTelecharges, onUndo, onDelete, onEdit
}) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailDossier, setDetailDossier] = useState<Dossier | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DossierCompletUpdatePayload>({
    num_chrono: '', nom_association: '', siege: '', district: '', president: '',
    type_dossier: 'Création', categorie: 'Autre', abreviation: '',
    dateArrivee: '', heureArrivee: '', objet: '', arn: '', recuFr: '', recuMg: '',
    emplacement: '',
  });

  const dossiersFiltres = useMemo(() => {
    let result = dossiers;
    // FILTRE : exclure les dossiers protégés (archivés)
    result = result.filter(d => !estProtege(d.status));
    result = result.filter(d => matchesSearchTerm(d, search));
    if (dateFrom) result = result.filter(d => d.dateArrivee >= dateFrom);
    if (dateTo) result = result.filter(d => d.dateArrivee <= dateTo);
    return result;
  }, [dossiers, search, dateFrom, dateTo]);

  const handleResetFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };

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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId !== null && onEdit) {
      onEdit(editingId, editForm);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="flex items-center gap-2.5 px-1">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Filter size={14} className="text-amber-400" />
          <span>Dossiers en attente</span>
        </div>
        <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm">
          {dossiersFiltres.length}
        </span>
      </div>

      {dossiersFiltres.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">Aucun dossier en attente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dossiersFiltres.map((d) => (
            <DossierTicketCard
              key={d.id}
              accentColor="bg-amber-400"
              numArrivee={d.numArrivee}
              nom={d.nom}
              type={d.type}
              date={formatDate(d.dateArrivee)}
              heure={formatHeure(d.heureArrivee)}
              statusLabel={dossiersTelecharges.has(d.id) ? 'TÉLÉCHARGÉ' : 'EN ATTENTE'}
              statusStyles={dossiersTelecharges.has(d.id) ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'}
              onDetail={() => setDetailDossier(d)}
            />
          ))}
        </div>
      )}

      {detailDossier && (
        <DetailTemplateModal
          dossier={detailDossier}
          onClose={() => setDetailDossier(null)}
          onEdit={(d) => { setDetailDossier(null); startEdit(d); }}
          onDelete={(id) => { setDetailDossier(null); if (window.confirm('Supprimer ce dossier ?') && onDelete) onDelete(id); }}
          onUndo={onUndo ? (id) => { setDetailDossier(null); onUndo(id); } : undefined}
          headerGradient="from-amber-500 to-orange-500"
          hideActions={estProtege(detailDossier.status)}
          sidebarExtra={
            <div className="flex flex-col gap-2">
              {detailDossier.type !== 'Duplicata' && detailDossier.type !== 'Arrêté' && detailDossier.type_dossier !== 'Duplicata' && detailDossier.type_dossier !== 'Arrêté' && (
                <button
                  className={`w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 transition-all active:scale-[0.97] shadow-sm ${
                    dossiersTelecharges.has(detailDossier.id)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-blue-300'
                  }`}
                  onClick={() => onDownloadDocx(detailDossier)}
                >
                  <Download size={13} className="inline mr-1" />
                  {dossiersTelecharges.has(detailDossier.id) ? 'Déjà téléchargé' : 'Télécharger'}
                </button>
              )}
              <button
                className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-sky-300 bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-700 hover:from-sky-600 hover:to-cyan-600 hover:text-white hover:border-sky-600 transition-all active:scale-[0.97] shadow-sm"
                onClick={() => { setDetailDossier(null); onEnvoyer(detailDossier.id); }}
              >
                <Send size={13} className="inline mr-1" /> Traiter
              </button>
              {onUndo && (
                <button
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-wider uppercase border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 hover:from-amber-500 hover:to-yellow-500 hover:text-white hover:border-amber-500 transition-all active:scale-[0.97] shadow-sm"
                  onClick={() => { setDetailDossier(null); onUndo(detailDossier.id); }}
                >
                  ↺ Réception
                </button>
              )}
            </div>
          }
        />
      )}

      {editingId !== null && onEdit && (
        <EditDossierModal
          editForm={editForm}
          setEditForm={setEditForm}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditingId(null)}
          accentColor="amber"
        />
      )}
    </div>
  );
};
