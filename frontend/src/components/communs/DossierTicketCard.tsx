import React from 'react';
import { Eye } from 'lucide-react';

interface DossierTicketCardProps {
  accentColor: string;
  numArrivee: string;
  nom: string;
  type: string;
  date: string;
  heure?: string;
  statusLabel?: string;
  statusStyles?: string;
  onDetail: () => void;
  extraRight?: React.ReactNode;
}

const typeColors: Record<string, string> = {
  'Création': 'bg-sky-100 text-sky-700 border-sky-300',
  'Renouvellement': 'bg-amber-100 text-amber-700 border-amber-300',
  'Duplicata': 'bg-purple-100 text-purple-700 border-purple-300',
  'Arrêté': 'bg-rose-100 text-rose-700 border-rose-300',
};

const defaultTypeColor = 'bg-slate-100 text-slate-600 border-slate-300';

export const DossierTicketCard: React.FC<DossierTicketCardProps> = ({
  accentColor,
  numArrivee,
  nom,
  type,
  date,
  heure,
  statusLabel,
  statusStyles = 'bg-white text-slate-600 border-slate-300',
  onDetail,
  extraRight,
}) => {
  const typeColor = typeColors[type] || defaultTypeColor;
  const displayStatus = statusLabel || (statusStyles.includes('bg-green') ? 'FAVORABLE' : statusStyles.includes('bg-red') ? 'DEFAVORABLE' : 'VERDICT');

  return (
    <div className="group flex border border-slate-200 rounded-xl w-full h-[72px] bg-white shadow-sm hover:shadow-lg hover:border-indigo-200 hover:bg-gradient-to-r hover:from-white hover:to-indigo-50/30 transition-all duration-200 overflow-hidden">
      {/* Accent color band */}
      <div className={`w-[4px] shrink-0 ${accentColor}`} />

      {/* Section gauche : date/heure + status */}
      <div className="flex flex-col justify-between p-2 w-[90px] flex-shrink-0">
        <div className="text-[10px] leading-tight">
          <div className="font-semibold text-slate-700">{date}</div>
          <div className="text-slate-400 font-medium">{heure}</div>
        </div>
        <div className={`border ${statusStyles} text-center py-0.5 px-1 text-[8px] uppercase font-semibold rounded leading-tight tracking-wider`}>
          {displayStatus}
        </div>
      </div>

      {/* Section milieu : N°, type, nom */}
      <div className="flex-1 flex flex-col justify-center px-2.5 sm:px-3 min-w-0 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-indigo-600 leading-none">{numArrivee}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border leading-none ${typeColor}`}>
            {type}
          </span>
        </div>
        <div className="h-px bg-gradient-to-r from-slate-200 to-transparent w-full my-1" />
        <div className="text-sm font-semibold text-slate-800 truncate leading-tight group-hover:text-indigo-700 transition-colors">
          {nom}
        </div>
      </div>

      {/* Section droite : séparateur + bouton détail + extra */}
      <div className="flex items-center pr-2.5 sm:pr-3 flex-shrink-0 gap-1.5 sm:gap-2">
        <div className="w-px h-[36px] bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
        {extraRight}
        <button
          className="w-8 h-8 flex items-center justify-center border border-indigo-200 rounded-lg text-indigo-400 hover:bg-gradient-to-br hover:from-indigo-500 hover:to-violet-500 hover:text-white hover:border-indigo-400 transition-all duration-150 active:scale-90 shadow-sm bg-white hover:shadow-md"
          onClick={onDetail}
          title="Voir détails"
        >
          <Eye size={15} />
        </button>
      </div>
    </div>
  );
};
