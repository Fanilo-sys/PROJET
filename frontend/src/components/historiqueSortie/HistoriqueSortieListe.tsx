import React from 'react';
import { HistoriqueSortieEntry } from '../../types';
import { InfoTooltip } from '../communs/InfoTooltip';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

interface HistoriqueSortieListeProps {
  historiquesSortie: HistoriqueSortieEntry[];
}

export const HistoriqueSortieListe: React.FC<HistoriqueSortieListeProps> = ({
  historiquesSortie,
}) => {
  if (historiquesSortie.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        Aucune sortie enregistrée.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-slate-200">
        <thead className="bg-gradient-to-r from-teal-600 to-teal-700 text-white text-[10px] font-bold uppercase tracking-widest">
          <tr>
            <th className="p-4">N° Arrivée</th>
            <th className="p-4">Association</th>
            <th className="p-4">Siège</th>
            <th className="p-4">Président(e)</th>
            <th className="p-4">Personne ayant pris</th>
            <th className="p-4">Date de sortie</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {historiquesSortie.map((h) => (
            <tr key={h.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 font-mono text-sm font-bold text-slate-700">
                {h.numArrivee}
              </td>
              <td className="p-4 text-sm font-semibold uppercase">
                                <InfoTooltip items={[
                  { label: 'Objet', value: h.objet || 'Non renseigné' },
                ]}>
                  {h.nom}
                </InfoTooltip>
              </td>
              <td className="p-4 text-sm text-slate-600">{h.siege}</td>
              <td className="p-4 text-sm text-slate-600">{h.president}</td>
              <td className="p-4 text-sm text-slate-600">{h.personnePrise}</td>
              <td className="p-4 text-sm text-slate-600">
                {fmtDate(h.dateSortie)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};