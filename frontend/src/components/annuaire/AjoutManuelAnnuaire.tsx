import React, { useState, useEffect } from 'react';
import {
  CheckCircle, ArrowLeft, Save, X, Calendar, Clock,
  User, MapPin, Building2, Tag, FileText, Hash, AlertCircle, PlusCircle, Globe, BookOpen, Type
} from 'lucide-react';
import { getGroupes, ajouterAssociationManuelle } from '../../services/annuaireService';
import { AnnuaireGroup, AnnuaireUpdatePayload, TypeDossier, SousTypeDossier, getEffectiveType, parseCategories, joinCategories } from '../../types';
import { CategorieSelect } from '../communs/CategorieSelect';

interface AjoutManuelAnnuaireProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/** Calcule la catégorie finale */
const computeCategorieFinale = (categories: string[], custom: string): string => {
  const parts = [...categories];
  if (custom.trim()) parts.push(custom.trim());
  return joinCategories(parts);
};

/** Modale de confirmation avant ajout */
const ConfirmationModal: React.FC<{
  data: AnnuaireUpdatePayload;
  categorieFinale: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ data, categorieFinale, onConfirm, onCancel }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      style={{
        background: 'linear-gradient(135deg, rgba(224,231,255,0.6) 0%, rgba(252,231,243,0.6) 50%, rgba(219,234,254,0.6) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-pink-300/25 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-blue-200/20 blur-3xl" />
      </div>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white" />
            <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full bg-white" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <CheckCircle size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Vérifier avant ajout</h3>
                <p className="text-xs text-emerald-200">Confirmez les informations</p>
              </div>
            </div>
            <button className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur" onClick={onCancel}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
          <div>
            <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em] flex items-center gap-2 mb-3">
              <Building2 size={13} /> Identité
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-3.5 border border-indigo-100 shadow-sm">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Hash size={11} /> N° Sortie
                </div>
                <div className="text-sm font-bold text-slate-800">{data.numero_sortie || '—'}</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-3.5 border border-indigo-100 shadow-sm">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Building2 size={11} /> Association
                </div>
                <div className="text-sm font-bold text-slate-800">{data.nom_association}</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-3.5 border border-indigo-100 shadow-sm">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <BookOpen size={11} /> Abréviation
                </div>
                <div className="text-sm font-bold text-slate-800">{data.abreviation || '—'}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-3.5 border border-amber-100 shadow-sm md:col-span-2">
                <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Tag size={11} /> Catégorie(s)
                </div>
                <div className="text-sm font-bold text-slate-800">{categorieFinale || '—'}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-3.5 border border-amber-100 shadow-sm">
                <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <User size={11} /> Président(e)
                </div>
                <div className="text-sm font-bold text-slate-800">{data.president || '—'}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-3.5 border border-amber-100 shadow-sm">
                <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Type size={11} /> Type
                </div>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border-2 shadow-sm ${
                  data.type_dossier === 'Renouvellement'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-sky-50 text-sky-700 border-sky-300'
                }`}>
                  {data.type_dossier || 'Création'}
                </span>
              </div>
            </div>
          </div>

          {/* Siège */}
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <MapPin size={13} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em]">Siège</span>
            </div>
            <div className="px-4 pb-3">
              <div className="text-sm font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">
                {data.siege || '—'}
              </div>
            </div>
          </div>

          {/* Objet */}
          {data.objet && (
            <div>
              <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-[0.15em] flex items-center gap-2 mb-3">
                <FileText size={13} /> Objet
              </h4>
              <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-3.5 border border-sky-100 shadow-sm">
                <div className="text-sm font-semibold text-slate-700">{data.objet}</div>
              </div>
            </div>
          )}

          {/* Récépissés */}
          {data.type_dossier === 'Renouvellement' && (
            <div>
              <h4 className="text-[10px] font-bold text-violet-600 uppercase tracking-[0.15em] mb-3">📄 Récépissés</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl p-3.5 border border-violet-100 shadow-sm">
                  <div className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-1">ARN</div>
                  <div className="text-sm font-semibold text-slate-700">{data.arn}</div>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl p-3.5 border border-violet-100 shadow-sm">
                  <div className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-1">Récépissé FR</div>
                  <div className="text-sm font-semibold text-slate-700">{data.recuFr}</div>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl p-3.5 border border-violet-100 shadow-sm">
                  <div className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-1">Récépissé MG</div>
                  <div className="text-sm font-semibold text-slate-700">{data.recuMg}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <button
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all border-2 border-slate-200 bg-white flex items-center gap-2"
            onClick={onCancel}
          >
            <ArrowLeft size={15} /> Retour
          </button>
          <button
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-300/50 flex items-center gap-2 text-sm active:scale-[0.97]"
            onClick={onConfirm}
          >
            <Save size={15} /> Confirmer l'ajout
          </button>
        </div>
      </div>
    </div>
  );
};

/** Modale d'erreur pour champs manquants */
const ErrorModal: React.FC<{
  champsManquants: string[];
  onClose: () => void;
}> = ({ champsManquants, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2"><AlertCircle size={20} /> Champs manquants</h3>
          <button className="p-2 rounded-md text-slate-600 hover:bg-slate-100" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-slate-700 mb-3">Les champs suivants doivent être remplis :</p>
          <ul className="space-y-2">
            {champsManquants.map((champ, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-red-700">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                {champ}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end">
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2" onClick={onClose}>
            <X size={16} /> Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export const AjoutManuelAnnuaire: React.FC<AjoutManuelAnnuaireProps> = ({ onSuccess, onCancel }) => {
  const [groupes, setGroupes] = useState<AnnuaireGroup[]>([]);
  const [selectedGroupeId, setSelectedGroupeId] = useState<number | null>(null);
  const [nouvellePeriode, setNouvellePeriode] = useState('');
  const [form, setForm] = useState<AnnuaireUpdatePayload & { sous_type?: SousTypeDossier }>({
    numero_sortie: '',
    nom_association: '',
    abreviation: '',
    siege: '',
    president: '',
    objet: '',
    type_dossier: 'Création',
    sous_type: '' as SousTypeDossier,
    arn: '',
    recuFr: '',
    recuMg: '',
  });
  const [saving, setSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showError, setShowError] = useState(false);
  const [champsManquants, setChampsManquants] = useState<string[]>([]);

  useEffect(() => {
    getGroupes().then(setGroupes).catch(console.error);
  }, []);

  const handleCategoriesChange = (selected: string[], custom: string) => {
    setSelectedCategories(selected);
    setCustomCategory(custom);
  };

  const effectiveType = getEffectiveType(form.type_dossier as TypeDossier, form.sous_type as SousTypeDossier);
  const isRenouvellement = effectiveType === 'renouvellement';
  const isDuplicataPur = form.type_dossier === 'Duplicata' && form.sous_type === 'duplicata_pur';

  const champsObligatoiresRemplis = (): boolean => {
    if (!(form.nom_association || '').trim()) return false;
    if (selectedGroupeId === null && !nouvellePeriode.trim()) return false;
    if (selectedCategories.length === 0 && !customCategory.trim()) return false;
    if (isRenouvellement) {
      if (!(form.arn || '').trim()) return false;
      if (!(form.recuFr || '').trim()) return false;
      if (!(form.recuMg || '').trim()) return false;
    }
    if (isDuplicataPur) {
      if (!(form.arn || '').trim()) return false;
    }
    return true;
  };

  const getChampsManquants = (): string[] => {
    const manquants: string[] = [];
    if (!(form.nom_association || '').trim()) manquants.push('Association');
    if (selectedGroupeId === null && !nouvellePeriode.trim()) manquants.push('Groupe ou période');
    if (selectedCategories.length === 0 && !customCategory.trim()) manquants.push('Catégorie (au moins une)');
    if (isRenouvellement) {
      if (!(form.arn || '').trim()) manquants.push('ARN');
      if (!(form.recuFr || '').trim()) manquants.push('Récépissé FR');
      if (!(form.recuMg || '').trim()) manquants.push('Récépissé MG');
    }
    if (isDuplicataPur) {
      if (!(form.arn || '').trim()) manquants.push('ARN');
    }
    return manquants;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!champsObligatoiresRemplis()) {
      setChampsManquants(getChampsManquants());
      setShowError(true);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setSaving(true);

    const parts = [...selectedCategories];
    if (customCategory.trim()) parts.push(customCategory.trim());
    const categorieFinale = joinCategories(parts);

    const data: AnnuaireUpdatePayload = {
      numero_sortie: form.numero_sortie,
      nom_association: form.nom_association,
      abreviation: form.abreviation,
      siege: form.siege,
      president: form.president,
      objet: form.objet,
      type_dossier: form.type_dossier as TypeDossier,
      arn: form.arn,
      recuFr: form.recuFr,
      recuMg: form.recuMg,
      categorie: categorieFinale,
    };

    if (selectedGroupeId) {
      data.groupeId = selectedGroupeId;
    } else {
      data.periode = nouvellePeriode.trim();
    }

    try {
      await ajouterAssociationManuelle(data);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  const categoriePourApercu = computeCategorieFinale(selectedCategories, customCategory);

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-lg">📋</span> Ajout manuel dans l'annuaire</h3>
      <form onSubmit={handleSubmit}>
        {showError && (
          <ErrorModal
            champsManquants={champsManquants}
            onClose={() => setShowError(false)}
          />
        )}

        {showConfirm && (
          <ConfirmationModal
            data={form}
            categorieFinale={categoriePourApercu}
            onConfirm={handleConfirm}
            onCancel={() => setShowConfirm(false)}
          />
        )}

        {/* Choix du groupe */}
        <div className="mb-3">
          <label className="text-sm font-semibold text-slate-700">Groupe</label>
          <select
            className="w-full border rounded px-3 py-2 mt-1"
            value={selectedGroupeId ?? ''}
            onChange={e => {
              const val = e.target.value;
              setSelectedGroupeId(val ? Number(val) : null);
              if (val) setNouvellePeriode('');
            }}
          >
            <option value="">-- Créer un nouveau bloc --</option>
            {groupes.map(g => (
              <option key={g.id} value={g.id}>{g.periode}</option>
            ))}
          </select>
        </div>

        {!selectedGroupeId && (
          <div className="mb-4">
            <label className="text-sm font-semibold text-slate-700">Nouvelle période</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 mt-1"
              value={nouvellePeriode}
              onChange={e => setNouvellePeriode(e.target.value)}
              placeholder="Ex: Mai 2026"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* N° Sortie */}
          <div>
            <label className="text-sm font-semibold text-slate-700">N° Sortie</label>
            <input
              className="w-full border rounded px-3 py-2 mt-1"
              value={form.numero_sortie || ''}
              onChange={e => setForm({...form, numero_sortie: e.target.value})}
              placeholder="Numéro de sortie"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-semibold text-slate-700">Type</label>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={form.type_dossier || 'Création'}
              onChange={e => {
                const newType = e.target.value as TypeDossier;
                setForm({...form, type_dossier: newType, sous_type: '' as SousTypeDossier});
              }}
            >
              <option value="Création">Création</option>
              <option value="Renouvellement">Renouvellement</option>
              <option value="Duplicata">Duplicata</option>
              <option value="Arrêté">Arrêté</option>
            </select>
          </div>

          {/* Sous-type (Duplicata / Arrêté) */}
          {(form.type_dossier === 'Duplicata' || form.type_dossier === 'Arrêté') && (
            <div>
              <label className="text-sm font-semibold text-slate-700">
                {form.type_dossier === 'Duplicata' ? 'Type de duplicata' : "Type d'arrêté"}
              </label>
              <select
                className="w-full border rounded px-3 py-2 mt-1"
                value={form.sous_type || ''}
                onChange={e => setForm({...form, sous_type: e.target.value as SousTypeDossier})}
              >
                <option value="">Sélectionnez…</option>
                {form.type_dossier === 'Duplicata' ? (
                  <>
                    <option value="duplicata_pur">Duplicata pur</option>
                    <option value="renouvellement_normal">Renouvellement (dossier normal)</option>
                  </>
                ) : (
                  <>
                    <option value="arret_creation">Arrêté-création</option>
                    <option value="arret_renouvellement">Arrêté-renouvellement</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Association */}
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Association *</label>
            <input
              className="w-full border rounded px-3 py-2 mt-1"
              value={form.nom_association || ''}
              onChange={e => setForm({...form, nom_association: e.target.value})}
              placeholder="Nom complet de l'association"
              required
            />
          </div>

          {/* Abréviation */}
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Abréviation</label>
            <input
              className="w-full border rounded px-3 py-2 mt-1"
              value={form.abreviation || ''}
              onChange={e => setForm({...form, abreviation: e.target.value})}
              placeholder="Sigle ou abréviation"
            />
          </div>

          {/* Président */}
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Président(e)</label>
            <input
              className="w-full border rounded px-3 py-2 mt-1"
              value={form.president || ''}
              onChange={e => setForm({...form, president: e.target.value})}
              placeholder="Nom du président"
            />
          </div>

          {/* Catégorie(s) */}
          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">Catégorie(s) *</label>
            <div className="mt-1">
              <CategorieSelect
                selected={selectedCategories}
                custom={customCategory}
                onChange={handleCategoriesChange}
              />
            </div>
          </div>

          {/* Siège */}
          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">Siège</label>
            <textarea
              className="w-full border rounded px-3 py-2 mt-1"
              value={form.siege || ''}
              onChange={e => setForm({...form, siege: e.target.value})}
              rows={2}
              placeholder="Adresse du siège social"
            />
          </div>

          {/* Objet */}
          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">Objet</label>
            <textarea
              className="w-full border rounded px-3 py-2 mt-1"
              value={form.objet || ''}
              onChange={e => setForm({...form, objet: e.target.value})}
              rows={2}
              placeholder="Objet de l'association"
            />
          </div>
        </div>

        {/* Récépissés (Renouvellement) */}
        {isRenouvellement && (
          <>
            <h4 className="text-sm font-semibold mt-6">Récépissés de déclaration</h4>
            <div className="grid grid-cols-1 gap-3 mt-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">ARN *</label>
                <textarea
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={form.arn || ''}
                  onChange={e => setForm({...form, arn: e.target.value})}
                  rows={2}
                  placeholder="Numéro ARN"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Récépissé FR *</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={form.recuFr || ''}
                    onChange={e => setForm({...form, recuFr: e.target.value})}
                    rows={2}
                    placeholder="Numéro de récépissé français"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Récépissé MG *</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={form.recuMg || ''}
                    onChange={e => setForm({...form, recuMg: e.target.value})}
                    rows={2}
                    placeholder="Numéro de récépissé Madagascar"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ARN pour Duplicata pur */}
        {isDuplicataPur && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold">Document d'origine</h4>
            <div className="grid grid-cols-1 gap-3 mt-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">ARN *</label>
                <textarea
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={form.arn || ''}
                  onChange={e => setForm({...form, arn: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-gray-300 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all bg-white"
            onClick={onCancel}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold transition-all"
          >
            {saving ? 'Ajout en cours…' : '➕ Ajouter à l\'annuaire'}
          </button>
        </div>
      </form>
    </div>
  );
};
