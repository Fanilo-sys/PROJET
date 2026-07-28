import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';

/** Catégories prédéfinies (sans "Autre" qui devient le champ libre) */
const CATEGORIES_DISPLAY = ['Sport', 'Santé', 'Éducation', 'Culture', 'Social', 'Environnement'] as const;

interface CategorieSelectProps {
  /** Catégories prédéfinies sélectionnées */
  selected: string[];
  /** Catégorie libre personnalisée */
  custom: string;
  /** Callback quand les catégories changent */
  onChange: (selected: string[], custom: string) => void;
  className?: string;
}

export const CategorieSelect: React.FC<CategorieSelectProps> = ({
  selected,
  custom,
  onChange,
  className = '',
}) => {
  const [customInput, setCustomInput] = useState(custom);

  const toggle = (cat: string) => {
    const next = selected.includes(cat)
      ? selected.filter(c => c !== cat)
      : [...selected, cat];
    onChange(next, customInput);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    onChange(selected, val);
  };

  const hasAnySelection = selected.length > 0 || customInput.trim() !== '';

  return (
    <div className={className}>
      {/* Boutons toggle horizontaux */}
      <div className="flex gap-1.5 flex-wrap mb-2">
        {CATEGORIES_DISPLAY.map((cat) => {
          const isSelected = selected.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggle(cat)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-150 active:scale-95 ${
                isSelected
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm shadow-indigo-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
              }`}
            >
              {isSelected && <span className="mr-1">✓</span>}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Champ libre pour catégorie personnalisée */}
      <div className="flex items-center gap-2">
        <Tag size={13} className="text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Catégorie personnalisée (optionnel)..."
          value={customInput}
          onChange={handleCustomChange}
          className="flex-1 p-2.5 bg-white border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 text-xs font-semibold placeholder:text-slate-300"
        />
      </div>

      {/* Aperçu des catégories sélectionnées */}
      {hasAnySelection && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Sélection :</span>
          {selected.map(cat => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-300"
            >
              {cat}
              <button
                type="button"
                onClick={() => toggle(cat)}
                className="ml-0.5 hover:text-indigo-900"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {customInput.trim() !== '' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
              {customInput.trim()}
              <button
                type="button"
                onClick={() => { setCustomInput(''); onChange(selected, ''); }}
                className="ml-0.5 hover:text-amber-900"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {!hasAnySelection && (
            <span className="text-xs text-slate-400 italic">Aucune catégorie sélectionnée</span>
          )}
        </div>
      )}
    </div>
  );
};
