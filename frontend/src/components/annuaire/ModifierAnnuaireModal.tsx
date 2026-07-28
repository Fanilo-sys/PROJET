import React, { useState } from 'react';
import {
  X, Save, Building2, MapPin, User, FileText, Tag,
  Hash, Type, BookOpen, AlertCircle
} from 'lucide-react';
import { AnnuaireEntry, AnnuaireUpdatePayload, TypeDossier, parseCategories, joinCategories } from '../../types';
import { CategorieSelect } from '../communs/CategorieSelect';
import { updateAnnuaire } from '../../services/annuaireService';

interface ModifierAnnuaireModalProps {
  association: AnnuaireEntry;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModifierAnnuaireModal: React.FC<ModifierAnnuaireModalProps> = ({
  association,
  onClose,
  onSuccess,
}) => {
  const existingCategories = parseCategories(association.categorie || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(existingCategories);
  const [customCategory, setCustomCategory] = useState<string>('');

  const [form, setForm] = useState<AnnuaireUpdatePayload>({
    nom_association: association.nom_association || '',
    abreviation: association.abreviation || '',
    siege: association.siege || '',
    president: association.president || '',
    objet: association.objet || '',
    type_dossier: (association.type_dossier || 'Création') as TypeDossier,
    numero_sortie: association.numero_sortie || '',
    arn: '',
    recuFr: '',
    recuMg: '',
  });
  const [district, setDistrict] = useState(association.district || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCategoriesChange = (selected: string[], custom: string) => {
    setSelectedCategories(selected);
    setCustomCategory(custom);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_association?.trim()) {
      setError('Le nom de l\'association est obligatoire');
      return;
    }

    setSaving(true);
    setError('');

    // Recombine siege + district
    const siegeFinal = district ? (form.siege || '') + '\n' + district : form.siege;
    const parts = [...selectedCategories];
    if (customCategory.trim()) parts.push(customCategory.trim());
    const categorieFinale = joinCategories(parts);

    try {
      await updateAnnuaire(association.id, {
        ...form,
        siege: siegeFinal,
        district,
        categorie: categorieFinale,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la modification. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof AnnuaireUpdatePayload, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-sky-500 to-indigo-500 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Modifier l'association</h3>
              <p className="text-xs text-white/70 font-medium truncate max-w-[250px] sm:max-w-md">
                {association.nom_association}
              </p>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Grille principale */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom association */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-sky-500" />
                Nom de l'association <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                value={form.nom_association || ''}
                onChange={e => updateField('nom_association', e.target.value)}
                placeholder="Nom complet de l'association"
                required
              />
            </div>

            {/* Abréviation */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <BookOpen size={13} className="text-sky-500" />
                Abréviation
              </label>
              <input
                type="text"
                className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                value={form.abreviation || ''}
                onChange={e => updateField('abreviation', e.target.value)}
                placeholder="Sigle ou abréviation"
              />
            </div>

            {/* N° Sortie */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Hash size={13} className="text-amber-500" />
                N° Sortie
              </label>
              <input
                type="text"
                className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                value={form.numero_sortie || ''}
                onChange={e => updateField('numero_sortie', e.target.value)}
                placeholder="Numéro de sortie"
              />
            </div>

            {/* Président */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-indigo-500" />
                Président(e)
              </label>
              <input
                type="text"
                className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                value={form.president || ''}
                onChange={e => updateField('president', e.target.value)}
                placeholder="Nom du président"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Type size={13} className="text-purple-500" />
                Type de dossier
              </label>
              <select
                className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all bg-white"
                value={form.type_dossier || 'Création'}
                onChange={e => updateField('type_dossier', e.target.value as TypeDossier)}
              >
                <option value="Création">Création</option>
                <option value="Renouvellement">Renouvellement</option>
              </select>
            </div>

            {/* Catégorie(s) — multi-sélection */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Tag size={13} className="text-emerald-500" />
                Catégorie(s)
              </label>
              <CategorieSelect
                selected={selectedCategories}
                custom={customCategory}
                onChange={handleCategoriesChange}
              />
            </div>

            {/* Siège */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-sky-500" />
                Siège
              </label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all resize-none"
                value={form.siege || ''}
                onChange={e => updateField('siege', e.target.value)}
                rows={2}
                placeholder="Adresse du siège social"
              />
            </div>

            {/* District */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-orange-500" />
                District / Arrondissement
              </label>
              <input
                type="text"
                className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="District ou arrondissement"
              />
            </div>

            {/* Objet */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-sky-500" />
                Objet
              </label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all resize-none"
                value={form.objet || ''}
                onChange={e => updateField('objet', e.target.value)}
                rows={2}
                placeholder="Objet de l'association"
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t-2 border-slate-100">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-sm font-bold transition-all active:scale-[0.97] bg-white"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white text-sm font-bold transition-all shadow-md shadow-sky-200/50 hover:shadow-lg hover:shadow-sky-300/50 flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={15} />
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
