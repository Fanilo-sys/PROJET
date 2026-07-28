import React from 'react';
import { CheckCircle } from 'lucide-react';
import { LivraisonListe } from './LivraisonListe';
import { Dossier } from '../../types';
import { SectionHeader } from '../communs/SectionHeader';

interface LivraisonSectionProps {
  dossiers: Dossier[];
  onSortie: (id: number) => void;
}

export const LivraisonSection: React.FC<LivraisonSectionProps> = ({ dossiers, onSortie }) => {
  const livraison = dossiers.filter(d => d.status === 'livraison');

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={CheckCircle}
        title="Prêt / Signé"
        subtitle="Dossiers prêts à être remis"
        count={livraison.length}
        gradient="from-emerald-500 to-teal-500"
      />

      <LivraisonListe livraisonList={livraison} onSortie={onSortie} />
    </div>
  );
};
