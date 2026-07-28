import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface SearchFilterBarProps {
  /** Texte de recherche */
  search: string;
  onChange: (val: string) => void;
  /** Filtre date début */
  dateFrom: string;
  onChangeDateFrom: (val: string) => void;
  /** Filtre date fin */
  dateTo: string;
  onChangeDateTo: (val: string) => void;
  /** Placeholder personnalisé (optionnel) */
  placeholder?: string;
  /** Afficher le bouton réinitialiser ? */
  showReset?: boolean;
  onReset?: () => void;
  /** Classes supplémentaires */
  className?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  search,
  onChange,
  dateFrom,
  onChangeDateFrom,
  dateTo,
  onChangeDateTo,
  placeholder = 'Rechercher par n°, nom, siège…',
  showReset = false,
  onReset,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm shadow-slate-200/50 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 outline-none transition-all"
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={e => onChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Du</span>
            <input
              className="border border-slate-200 rounded-xl px-2.5 py-2 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 outline-none transition-all w-32"
              type="date"
              value={dateFrom}
              onChange={e => onChangeDateFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Au</span>
            <input
              className="border border-slate-200 rounded-xl px-2.5 py-2 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 outline-none transition-all w-32"
              type="date"
              value={dateTo}
              onChange={e => onChangeDateTo(e.target.value)}
            />
          </div>
          {showReset && onReset && (
            <button
              className="text-xs font-medium text-slate-400 hover:text-slate-600 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
              onClick={onReset}
            >
              <RotateCcw size={12} /> Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
