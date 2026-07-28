import React from 'react';
import { MapPin, FilePen } from 'lucide-react';
import { CategorieBadge } from '../communs/CategorieBadge';
import { InfoTooltip } from '../communs/InfoTooltip';
import formatSiege from '../communs/formatSiege';
import { Dossier } from '../../types';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

interface RegistreChronoTableauProps {
  dossiers: Dossier[];
}

export const RegistreChronoTableau: React.FC<RegistreChronoTableauProps> = ({ dossiers }) => {
  return (
    <div className="overflow-auto bg-white rounded-lg border p-4">
      <div className="table-scroll">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left w-24">N° Arrivée</th>
            <th className="px-3 py-2 text-left w-36">Date</th>
            <th className="px-3 py-2 text-left w-24">Heure</th>
            <th className="px-3 py-2 text-left">Association</th>
            <th className="px-3 py-2 text-left w-48">Siège</th>
            <th className="px-3 py-2 text-left">District</th>
            <th className="px-3 py-2 text-left">Catégorie</th>
            <th className="px-3 py-2 text-left w-24">Type</th>
            <th className="px-3 py-2 text-left w-36">Stockage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {dossiers.length === 0 ? (
            <tr><td colSpan={9} className="px-3 py-4 text-slate-500">Aucun dossier dans le registre.</td></tr>
          ) : (
            dossiers.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2 font-medium">{d.numArrivee}</td>
                <td className="px-3 py-2 text-sm text-slate-600">{fmtDate(d.dateArrivee)}</td>
                <td className="px-3 py-2 text-sm text-slate-600">{d.heureArrivee || '—'}</td>
                <td className="px-3 py-2 align-top">
                  <InfoTooltip items={[{ label: 'Objet', value: d.objet || 'Non renseigné' }]}>
                    <span className="cell-truncate" title={d.nom}>{d.nom}</span>
                  </InfoTooltip>
                </td>
                <td className="px-3 py-2 align-top"><InfoTooltip variant="siege" items={[{ label: 'Siège', value: (d.siege || 'Non renseigné') + (d.district ? ` — ${d.district}` : '') }]}><span className="cell-truncate">{formatSiege(d)}</span></InfoTooltip></td>
                <td className="px-3 py-2 text-sm text-slate-600"><span className="cell-truncate-sm" title={d.district || '—'}>{d.district || '—'}</span></td>
                <td className="px-3 py-2"><CategorieBadge categorie={d.categorie} /></td>
                <td className="px-3 py-2"><span className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded">{d.type}</span></td>
                <td className="px-3 py-2">{d.emplacement || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
};
