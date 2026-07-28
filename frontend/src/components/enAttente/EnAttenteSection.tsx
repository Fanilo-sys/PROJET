import React, { useState, useMemo } from 'react';
import { Clock, Plus } from 'lucide-react';
import { PileTravail } from './PileTravail';
import { ReceptionFormulaire } from '../reception/ReceptionFormulaire';
import { Modal } from '../communs/Modal';
import { Dossier, DossierCompletUpdatePayload, FormDossier } from '../../types';
import { SectionHeader } from '../communs/SectionHeader';

interface EnAttenteSectionProps {
  dossiers: Dossier[];
  onEnvoyerEnCours: (id: number) => void;
  onDownloadDocx: (dossier: Dossier) => void;
  dossiersTelecharges: Set<number>;
  newDossier?: FormDossier;
  setNewDossier?: React.Dispatch<React.SetStateAction<FormDossier>>;
  onAdd?: () => void;
  lignesSupplementairesAssoc?: string;
  setLignesSupplementairesAssoc?: (val: string) => void;
  onUndo?: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (id: number, data: DossierCompletUpdatePayload) => void;
}

export const EnAttenteSection: React.FC<EnAttenteSectionProps> = ({ 
  dossiers, 
  onEnvoyerEnCours, 
  onDownloadDocx, 
  dossiersTelecharges,
  newDossier,
  setNewDossier,
  onAdd,
  lignesSupplementairesAssoc = '',
  setLignesSupplementairesAssoc = () => {},
  onUndo,
  onDelete,
  onEdit,
}) => {
  const [showModal, setShowModal] = useState(false);

  const enPile = dossiers.filter(d => d.status === 'en_attente' || (d.status === 'reception' && d.verdict === 'favorable'));

  const handleAddClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleAddSubmit = () => {
    handleCloseModal();
    if (onAdd) onAdd();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Clock}
        title="Pile de travail"
        subtitle="Dossiers en attente de traitement"
        count={enPile.length}
        gradient="from-amber-500 to-orange-500"
      >
        {newDossier && setNewDossier && onAdd && (
          <button className="bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-[0.97] shadow-sm" onClick={handleAddClick}>
            <Plus size={14} /> Ajouter
          </button>
        )}
      </SectionHeader>

      <Modal show={showModal} onClose={handleCloseModal} title="Ajouter un dossier en pile">
        {newDossier && setNewDossier && onAdd && (
          <div className="p-4">
            <ReceptionFormulaire
              newDossier={newDossier}
              setNewDossier={setNewDossier}
              onAdd={handleAddSubmit}
              lignesSupplementairesAssoc={lignesSupplementairesAssoc}
              setLignesSupplementairesAssoc={setLignesSupplementairesAssoc}
              dossiers={dossiers}
            />
          </div>
        )}
      </Modal>

      <PileTravail 
        dossiers={enPile} 
        onEnvoyer={onEnvoyerEnCours} 
        onDownloadDocx={onDownloadDocx} 
        dossiersTelecharges={dossiersTelecharges}
        onUndo={onUndo}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </div>
  );
};
