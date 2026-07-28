import React from 'react';
import { ReceptionFormulaire } from './ReceptionFormulaire';
import { ReceptionTableau } from './ReceptionTableau';
import { Dossier, FormDossier, DossierUpdatePayload } from '../../types';
import { SectionHeader } from '../communs/SectionHeader';
import { BookOpen } from 'lucide-react';

interface ReceptionSectionProps {
  newDossier: FormDossier;
  setNewDossier: React.Dispatch<React.SetStateAction<FormDossier>>;
  onAdd: () => void;
  dossiers: Dossier[];
  onVerdict: (id: number, verdict: 'favorable' | 'defavorable') => void;
  onDelete: (id: number) => void;
  onArchive: () => void;
  lignesSupplementairesAssoc: string;
  setLignesSupplementairesAssoc: (val: string) => void;
  onUndo: (id: number) => void;
  onEdit: (id: number, data: DossierUpdatePayload) => void;
  onRefresh?: () => void;
}

export const ReceptionSection: React.FC<ReceptionSectionProps> = ({
  newDossier,
  setNewDossier,
  onAdd,
  dossiers,
  onVerdict,
  onDelete,
  lignesSupplementairesAssoc,
  setLignesSupplementairesAssoc,
  onUndo,
  onEdit,
}) => {
  const receptionDossiers = dossiers.filter(d => d.status === 'reception');

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BookOpen}
        title="📬 Réception"
        subtitle="Dossiers entrants"
        count={receptionDossiers.length}
        gradient="from-sky-500 to-cyan-500"
      />

      <ReceptionFormulaire
        newDossier={newDossier}
        setNewDossier={setNewDossier}
        onAdd={onAdd}
        lignesSupplementairesAssoc={lignesSupplementairesAssoc}
        setLignesSupplementairesAssoc={setLignesSupplementairesAssoc}
        dossiers={dossiers}
      />

      <ReceptionTableau
        dossiers={receptionDossiers}
        onVerdict={onVerdict}
        onDelete={onDelete}
        onUndo={onUndo}
        onEdit={onEdit}
      />
    </div>
  );
};

export default ReceptionSection;
