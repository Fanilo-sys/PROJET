import React from 'react';
import { Send } from 'lucide-react';
import { EnCoursListe } from './EnCoursListe';
import { Dossier, DossierCompletUpdatePayload } from '../../types';
import { SectionHeader } from '../communs/SectionHeader';

interface EnCoursSectionProps {
  dossiers: Dossier[];
  onRetourPile: (id: number) => void;
  onLivrer: (id: number) => void;
  onEdit?: (id: number, data: DossierCompletUpdatePayload) => void;
}

export const EnCoursSection: React.FC<EnCoursSectionProps> = ({ dossiers, onRetourPile, onLivrer, onEdit }) => {
  const enCours = dossiers.filter(d => d.status === 'en_cours');

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Send}
        title="En Cours"
        subtitle="Dossiers en cours de traitement"
        count={enCours.length}
        gradient="from-sky-500 to-cyan-500"
      />

      <EnCoursListe enCoursList={enCours} onRetourPile={onRetourPile} onLivrer={onLivrer} onEdit={onEdit} />
    </div>
  );
};
