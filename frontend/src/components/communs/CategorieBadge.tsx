import { parseCategories, CATEGORIES_PREDEFINIES, CategorieAssociation } from '../../types';

interface CategorieBadgeProps {
  categorie: CategorieAssociation;
}

const CATEGORIES_PREDEF = CATEGORIES_PREDEFINIES as readonly string[];

const badgeColor = (cat: string) => {
  const isPredefinie = CATEGORIES_PREDEF.includes(cat);
  return isPredefinie
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : 'bg-purple-50 text-purple-700 border-purple-200';
};

/**
 * Affiche les catégories d'un dossier sous forme de badges multiples.
 * Parse la chaîne séparée par virgules en N badges individuels.
 */
export const CategorieBadge: React.FC<CategorieBadgeProps> = ({ categorie }) => {
  const categories = parseCategories(categorie);

  if (categories.length === 0) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-slate-50 text-slate-400 border-slate-200">
        —
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      {categories.map((cat) => (
        <span
          key={cat}
          className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full border ${badgeColor(cat)}`}
        >
          {cat}
        </span>
      ))}
    </div>
  );
};
