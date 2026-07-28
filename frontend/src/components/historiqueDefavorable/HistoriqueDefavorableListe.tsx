import React from 'react';
import { Eye } from 'lucide-react';
import { InfoTooltip } from '../communs/InfoTooltip';
import { HistoriqueEntry } from '../../types';

interface HistoriqueDefavorableRow extends HistoriqueEntry {
  objet?: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

interface HistoriqueDefavorableListeProps {
  historiques: HistoriqueDefavorableRow[];
}

export const HistoriqueDefavorableListe: React.FC<HistoriqueDefavorableListeProps> = ({ historiques }) => {
  if (historiques.length === 0) {
    return <div className="p-12 text-center text-slate-400 text-sm">Aucun historique défavorable.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-slate-200">
        <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white text-[10px] font-bold uppercase tracking-widest">
          <tr>
            <th className="p-4">N° Arrivée</th>
            <th className="p-4">Association</th>
            <th className="p-4">Siège</th>
            <th className="p-4">Date d'arrivée</th>
            <th className="p-4">Heure</th>
            <th className="p-4">Date de prise</th>
            <th className="p-4">Personne</th>
            <th className="p-4 text-center">Détail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {historiques.map((h) => (
            <tr key={h.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 font-mono text-sm font-bold text-slate-700">{h.numArrivee}</td>
              <td className="p-4 text-sm font-semibold uppercase">
                                <InfoTooltip items={[
                  { label: 'Objet', value: h.objet || 'Non renseigné' },
                ]}>
                  {h.nom}
                </InfoTooltip>
              </td>
              <td className="p-4 text-sm text-slate-600">{h.siege}</td>
              <td className="p-4 text-sm text-slate-600">{fmtDate(h.dateArrivee)}</td>
              <td className="p-4 text-sm text-slate-600">{h.heureArrivee || '—'}</td>
              <td className="p-4 text-sm text-slate-600">{fmtDate(h.datePrise)}</td>
              <td className="p-4 text-sm text-slate-600">{h.personnePrise}</td>
              <td className="p-4 text-center">
                <button className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-indigo-200 text-indigo-600 opacity-50">
                  <Eye size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};