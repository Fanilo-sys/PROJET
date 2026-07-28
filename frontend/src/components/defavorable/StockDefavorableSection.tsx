import React from 'react';
import { AlertCircle } from 'lucide-react';
import { StockDefavorableListe } from './StockDefavorableListe';
import { Dossier } from '../../types';
import { SectionHeader } from '../communs/SectionHeader';

interface StockDefavorableSectionProps {
  dossiers: Dossier[];
  onRepasserEnReception: (id: number) => void;
}

export const StockDefavorableSection: React.FC<StockDefavorableSectionProps> = ({ dossiers, onRepasserEnReception }) => {
  const defList = dossiers.filter(d => d.status === 'defavorable' || (d.status === 'reception' && d.verdict === 'defavorable'));

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={AlertCircle}
        title="Rejets & Dossiers Incomplets"
        subtitle="Dossiers défavorables en attente de correction"
        count={defList.length}
        gradient="from-rose-500 to-pink-500"
      />

      <StockDefavorableListe dossiers={defList} onRepasserEnReception={onRepasserEnReception} />
    </div>
  );
};
