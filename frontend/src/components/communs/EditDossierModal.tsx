import React, { useState } from 'react';
import { Pencil, Save, X, User, MapPin, Tag, Building2, Hash, FileSignature, Globe, BookText, FileText, Clock } from 'lucide-react';
import { DossierCompletUpdatePayload, TypeDossier, parseCategories, joinCategories } from '../../types';
import { CategorieSelect } from './CategorieSelect';

interface EditDossierModalProps {
  editForm: DossierCompletUpdatePayload;
  setEditForm: (v: DossierCompletUpdatePayload) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  accentColor?: 'violet' | 'amber' | 'sky' | 'emerald' | 'rose' | 'teal';
}

const accentConfig: Record<string, { gradient: string; }> = {
  violet: { gradient: 'from-violet-600 via-indigo-600 to-blue-600' },
  amber: { gradient: 'from-amber-500 to-amber-600' },
  sky: { gradient: 'from-sky-500 to-cyan-500' },
  emerald: { gradient: 'from-emerald-500 to-teal-500' },
  rose: { gradient: 'from-rose-500 to-pink-500' },
  teal: { gradient: 'from-teal-500 to-emerald-500' },
};

const fields = [
  { label: 'N° Arrivée', key: 'num_chrono', type: 'text', icon: Hash, color: 'from-violet-50 to-white border-violet-200 focus:border-violet-400 focus:ring-violet-400/30' },
  { label: 'Association', key: 'nom_association', type: 'text', icon: Building2, color: 'from-indigo-50 to-white border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400/30' },
  { label: 'Abréviation', key: 'abreviation', type: 'text', icon: FileSignature, color: 'from-sky-50 to-white border-sky-200 focus:border-sky-400 focus:ring-sky-400/30' },
  { label: 'District', key: 'district', type: 'text', icon: MapPin, color: 'from-emerald-50 to-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400/30' },
  { label: 'Siège', key: 'siege', type: 'text', icon: MapPin, color: 'from-teal-50 to-white border-teal-200 focus:border-teal-400 focus:ring-teal-400/30' },
  { label: 'Président', key: 'president', type: 'text', icon: User, color: 'from-amber-50 to-white border-amber-200 focus:border-amber-400 focus:ring-amber-400/30' },
  { label: 'Date arrivée', key: 'dateArrivee', type: 'date', icon: Clock, color: 'from-rose-50 to-white border-rose-200 focus:border-rose-400 focus:ring-rose-400/30' },
  { label: 'Heure arrivée', key: 'heureArrivee', type: 'time', icon: Clock, color: 'from-fuchsia-50 to-white border-fuchsia-200 focus:border-fuchsia-400 focus:ring-fuchsia-400/30' },
  { label: 'Emplacement', key: 'emplacement', type: 'text', icon: MapPin, color: 'from-orange-50 to-white border-orange-200 focus:border-orange-400 focus:ring-orange-400/30' },
  { label: 'ARN', key: 'arn', type: 'text', icon: Globe, color: 'from-sky-50 to-white border-sky-200 focus:border-sky-400 focus:ring-sky-400/30' },
  { label: 'Reçu FR', key: 'recuFr', type: 'text', icon: BookText, color: 'from-blue-50 to-white border-blue-200 focus:border-blue-400 focus:ring-blue-400/30' },
  { label: 'Reçu MG', key: 'recuMg', type: 'text', icon: BookText, color: 'from-blue-50 to-white border-blue-200 focus:border-blue-400 focus:ring-blue-400/30' },
];

export const EditDossierModal: React.FC<EditDossierModalProps> = ({
  editForm, setEditForm, onSubmit, onCancel, accentColor = 'violet'
}) => {
  const cfg = accentConfig[accentColor] || accentConfig.violet;

  // État local pour les catégories multiples (initialisé depuis editForm.categorie)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    parseCategories((editForm as any).categorie || '')
  );
  const [customCategory, setCustomCategory] = useState<string>('');

  const handleCategoriesChange = (selected: string[], custom: string) => {
    setSelectedCategories(selected);
    setCustomCategory(custom);
    // Synchroniser dans editForm
    const parts = [...selected];
    if (custom.trim()) parts.push(custom.trim());
    setEditForm({ ...editForm, categorie: joinCategories(parts) });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      style={{
        background: 'linear-gradient(135deg, rgba(224,231,255,0.6) 0%, rgba(252,231,243,0.6) 50%, rgba(219,234,254,0.6) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-pink-300/25 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-blue-200/20 blur-3xl" />
      </div>
      <div
        className="bg-white rounded-2xl w-full max-w-4xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-br ${cfg.gradient} px-6 py-5 relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full bg-white" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Pencil size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Modifier le dossier</h3>
                <p className="text-xs text-white/70">Mettez à jour les informations</p>
              </div>
            </div>
            <button className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur" onClick={onCancel}>
              <X size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="p-6 max-h-[55vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {fields.map(field => {
                const Icon = field.icon;
                return (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Icon size={13} className="text-slate-400" />
                      {field.label}
                    </label>
                    <input
                      className={`w-full border-2 rounded-xl px-3.5 py-2.5 text-sm bg-gradient-to-br ${field.color} outline-none transition-all`}
                      type={field.type}
                      value={(editForm as any)[field.key] || ''}
                      onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })}
                    />
                  </div>
                );
              })}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <FileText size={13} className="text-slate-400" />
                  Type
                </label>
                <select
                  className="w-full border-2 border-purple-200 rounded-xl px-3.5 py-2.5 text-sm bg-gradient-to-br from-purple-50 to-white focus:border-purple-400 focus:ring-purple-400/30 outline-none transition-all appearance-none"
                  value={editForm.type_dossier || 'Création'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm({ ...editForm, type_dossier: e.target.value as TypeDossier })}
                >
                  <option value="Création">Création</option>
                  <option value="Renouvellement">Renouvellement</option>
                  <option value="Duplicata">Duplicata</option>
                  <option value="Arrêté">Arrêté</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <FileText size={13} className="text-slate-400" />
                  Objet
                </label>
                <textarea
                  className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-gradient-to-br from-slate-50 to-white focus:border-slate-400 focus:ring-slate-400/30 outline-none transition-all resize-none"
                  rows={2}
                  value={(editForm as any).objet || ''}
                  onChange={e => setEditForm({ ...editForm, objet: e.target.value })}
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Tag size={13} className="text-slate-400" />
                  Catégorie(s)
                </label>
                <CategorieSelect
                  selected={selectedCategories}
                  custom={customCategory}
                  onChange={handleCategoriesChange}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all border-2 border-slate-200 bg-white"
              onClick={onCancel}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`bg-gradient-to-r ${cfg.gradient} hover:opacity-90 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-sm active:scale-[0.97]`}
            >
              <Save size={15} /> Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
