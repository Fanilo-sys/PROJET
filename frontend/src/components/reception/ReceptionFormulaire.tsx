import React, { useState } from 'react';
import { Dossier, joinCategories } from '../../types';
import {
  CheckCircle, ArrowLeft, Save, X, Calendar, Clock,
  User, MapPin, Building2, FolderOpen, Tag, FileText, Hash, AlertCircle, ChevronDown
} from 'lucide-react';
import { CategorieSelect } from '../communs/CategorieSelect';
import { TypeDossier, SousTypeDossier, FormDossier, getEffectiveType } from '../../types';

interface ReceptionFormulaireProps {
  newDossier: FormDossier;
  setNewDossier: React.Dispatch<React.SetStateAction<FormDossier>>;
  onAdd: () => void;
  lignesSupplementairesAssoc: string;
  setLignesSupplementairesAssoc: (val: string) => void;
  dossiers: Dossier[];
}

/** Calcule la catégorie finale à partir des catégories sélectionnées */
const computeCategorieFinale = (categories: string[], custom: string): string => {
  const parts = [...categories];
  if (custom.trim()) parts.push(custom.trim());
  return joinCategories(parts);
};

/** Modale de confirmation avant ajout */
const ConfirmationModal: React.FC<{
  data: FormDossier;
  lignesSupplementairesAssoc: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ data, lignesSupplementairesAssoc, onConfirm, onCancel }) => {
  const categorieFinale = computeCategorieFinale(data.selectedCategories, data.customCategory);

  const siegeLines = data.siege.split('\n').filter((l: string) => l.trim() !== '');
  const districtExtrait = siegeLines.length > 1 ? siegeLines.pop()!.trim() : '—';
  const siegeSansDistrict = siegeLines.join(' · ');

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
                <p className="text-xs text-emerald-200">Confirmez les informations du dossier</p>
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
                  <Hash size={11} /> N° Arrivée
                </div>
                <div className="text-sm font-bold text-slate-800">{data.numArrivee}</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-3.5 border border-indigo-100 shadow-sm">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <User size={11} /> Association
                </div>
                <div className="text-sm font-bold text-slate-800">{data.nom}</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-3.5 border border-indigo-100 shadow-sm">
                <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Tag size={11} /> Abréviation
                </div>
                <div className="text-sm font-bold text-slate-800">{lignesSupplementairesAssoc || '—'}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-3.5 border border-amber-100 shadow-sm md:col-span-2">
                <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <FolderOpen size={11} /> Catégorie(s)
                </div>
                <div className="text-sm font-bold text-slate-800">{categorieFinale || '—'}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-3.5 border border-amber-100 shadow-sm">
                <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <User size={11} /> Président(e)
                </div>
                <div className="text-sm font-bold text-slate-800">{data.president}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-3.5 border border-amber-100 shadow-sm">
                <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <MapPin size={11} /> District
                </div>
                <div className="text-sm font-bold text-slate-800">{districtExtrait}</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <MapPin size={13} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em]">Siège</span>
            </div>
            <div className="px-4 pb-3">
              <div className="text-sm font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">
                {siegeSansDistrict || '—'}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-[0.15em] flex items-center gap-2 mb-3">
              <Calendar size={13} /> Dates & Type
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-3.5 border border-sky-100 shadow-sm">
                <div className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider mb-1">Date</div>
                <div className="text-sm font-bold text-slate-800">{data.dateArrivee}</div>
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-3.5 border border-sky-100 shadow-sm">
                <div className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Clock size={11} /> Heure
                </div>
                <div className="text-sm font-bold text-slate-800">{data.heureArrivee}</div>
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-3.5 border border-sky-100 shadow-sm">
                <div className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <FileText size={11} /> Type
                </div>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border-2 shadow-sm ${
                  data.type === 'Renouvellement'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-sky-50 text-sky-700 border-sky-300'
                }`}>
                  {data.type}
                </span>
              </div>
              {data.objet && (
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-3.5 border border-slate-200 shadow-sm md:col-span-3">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Objectif</div>
                  <div className="text-sm font-semibold text-slate-700">{data.objet}</div>
                </div>
              )}
            </div>
          </div>

          {data.type === 'Renouvellement' && (
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

export const ReceptionFormulaire: React.FC<ReceptionFormulaireProps> = ({
  newDossier,
  setNewDossier,
  onAdd,
  lignesSupplementairesAssoc,
  setLignesSupplementairesAssoc,
  dossiers,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showError, setShowError] = useState(false);
  const [champsManquants, setChampsManquants] = useState<string[]>([]);

  const updateField = <K extends keyof FormDossier>(field: K, value: FormDossier[K]) =>
    setNewDossier(prev => ({ ...prev, [field]: value } as FormDossier));

  const updateSousType = (value: SousTypeDossier) => {
    setNewDossier(prev => ({ ...prev, sous_type: value } as FormDossier));
  };

  const effectiveType = getEffectiveType(newDossier.type, newDossier.sous_type);
  const isRenouvellement = effectiveType === 'renouvellement';
  const isDuplicataPur = newDossier.type === 'Duplicata' && newDossier.sous_type === 'duplicata_pur';
  const showArnSection = isRenouvellement || isDuplicataPur;

  const champsObligatoiresRemplis = (): boolean => {
    if (!newDossier.numArrivee.trim()) return false;
    if (!newDossier.nom.trim()) return false;
    if (!newDossier.dateArrivee.trim()) return false;
    if (!newDossier.heureArrivee.trim()) return false;
    if (!newDossier.president.trim()) return false;
    if (!newDossier.siege.trim()) return false;
    if (newDossier.selectedCategories.length === 0 && !newDossier.customCategory.trim()) return false;
    if (isRenouvellement) {
      if (!newDossier.arn.trim()) return false;
      if (!newDossier.recuFr.trim()) return false;
      if (!newDossier.recuMg.trim()) return false;
    }
    if (isDuplicataPur) {
      if (!newDossier.arn.trim()) return false;
    }
    return true;
  };

  const getChampsManquants = (): string[] => {
    const manquants: string[] = [];
    if (!newDossier.numArrivee.trim()) manquants.push('N° Arrivée');
    if (!newDossier.nom.trim()) manquants.push('Association');
    if (!newDossier.dateArrivee.trim()) manquants.push('Date');
    if (!newDossier.heureArrivee.trim()) manquants.push('Heure');
    if (!newDossier.president.trim()) manquants.push('Président(e)');
    if (!newDossier.siege.trim()) manquants.push('Siège');
    if (newDossier.selectedCategories.length === 0 && !newDossier.customCategory.trim()) manquants.push('Catégorie (au moins une)');
    if (isRenouvellement) {
      if (!newDossier.arn.trim()) manquants.push('ARN');
      if (!newDossier.recuFr.trim()) manquants.push('Récépissé FR');
      if (!newDossier.recuMg.trim()) manquants.push('Récépissé MG');
    }
    if (isDuplicataPur) {
      if (!newDossier.arn.trim()) manquants.push('ARN');
    }
    return manquants;
  };

  const doitEtreRempli = !champsObligatoiresRemplis();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (doitEtreRempli) {
      const manquants = getChampsManquants();
      setChampsManquants(manquants);
      setShowError(true);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onAdd();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const elements = Array.from(form.querySelectorAll('input, select, textarea, button')) as HTMLElement[];
      const index = elements.indexOf(target);
      if (index >= 0 && index < elements.length - 1) {
        (elements[index + 1] as HTMLElement).focus();
      } else {
        if (!doitEtreRempli) setShowConfirm(true);
      }
    }
  };

  const [doublonMessage, setDoublonMessage] = useState('');

  const checkDoublon = (num: string) => {
    if (!num.trim()) { setDoublonMessage(''); return false; }
    const dossiersActifs = dossiers.filter(d => d.status !== 'archive_arrivee');
    const existe = dossiersActifs.some(d => d.numArrivee === num.trim());
    if (existe) {
      setDoublonMessage('⚠️ Ce numéro d\'arrivée est déjà utilisé dans un dossier actif.');
    } else {
      setDoublonMessage('');
    }
    return existe;
  };

  const handleNumArriveeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    updateField('numArrivee', val);
    checkDoublon(val);
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-lg">📋</span> Nouveau dossier</h3>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>

        {showError && (
          <ErrorModal
            champsManquants={champsManquants}
            onClose={() => setShowError(false)}
          />
        )}

        {showConfirm && (
          <ConfirmationModal
            data={newDossier}
            lignesSupplementairesAssoc={lignesSupplementairesAssoc}
            onConfirm={handleConfirm}
            onCancel={() => setShowConfirm(false)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">N° Arrivée *</label>
            <input
              className={`w-full border rounded px-3 py-2 mt-1 ${doublonMessage ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              value={newDossier.numArrivee}
              onChange={handleNumArriveeChange}
              onBlur={() => checkDoublon(newDossier.numArrivee)}
            />
            {doublonMessage && (
              <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                {doublonMessage}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Date *</label>
            <input className="w-full border rounded px-3 py-2 mt-1" type="date" value={newDossier.dateArrivee} onChange={(e) => updateField('dateArrivee', e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Heure *</label>
            <input className="w-full border rounded px-3 py-2 mt-1" type="time" value={newDossier.heureArrivee} onChange={(e) => updateField('heureArrivee', e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Type</label>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={newDossier.type}
              onChange={(e) => {
                const newType = e.target.value as TypeDossier;
                updateField('type', newType);
                if (newType !== 'Duplicata' && newType !== 'Arrêté') {
                  updateSousType('');
                }
              }}
            >
              <option value="Création">Création</option>
              <option value="Renouvellement">Renouvellement</option>
              <option value="Duplicata">Duplicata</option>
              <option value="Arrêté">Arrêté</option>
            </select>
          </div>

          {(newDossier.type === 'Duplicata' || newDossier.type === 'Arrêté') && (
            <div>
              <label className="text-sm font-semibold text-slate-700">
                {newDossier.type === 'Duplicata' ? 'Type de duplicata' : "Type d'arrêté"}
              </label>
              <select
                className="w-full border rounded px-3 py-2 mt-1"
                value={newDossier.sous_type || ''}
                onChange={(e) => updateSousType(e.target.value as SousTypeDossier)}
              >
                <option value="">Sélectionnez…</option>
                {newDossier.type === 'Duplicata' ? (
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

          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">Association *</label>
            <input className="w-full border rounded px-3 py-2 mt-1" value={newDossier.nom} onChange={(e) => updateField('nom', e.target.value)} />
          </div>

          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">Abréviation</label>
            <input className="w-full border rounded px-3 py-2 mt-1" value={lignesSupplementairesAssoc} onChange={(e) => setLignesSupplementairesAssoc(e.target.value)} />
          </div>

          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">Catégorie(s) *</label>
            <div className="mt-1">
              <CategorieSelect
                selected={newDossier.selectedCategories}
                custom={newDossier.customCategory}
                onChange={(selected, custom) => {
                  setNewDossier(prev => ({
                    ...prev,
                    selectedCategories: selected,
                    customCategory: custom,
                  }));
                }}
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">Président(e) *</label>
            <input className="w-full border rounded px-3 py-2 mt-1" value={newDossier.president} onChange={(e) => updateField('president', e.target.value)} />
          </div>

          <div className="md:col-span-4">
            <label className="text-sm font-semibold text-slate-700">Siège *</label>
            <textarea className="w-full border rounded px-3 py-2 mt-1" value={newDossier.siege} onChange={(e) => updateField('siege', e.target.value)} rows={3} />
          </div>
        </div>

        <div className="mt-6">
          <div className={`p-4 rounded-lg border-2 ${isRenouvellement ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Objectif {isRenouvellement && <span className="text-blue-600">(Renouvellement)</span>}</label>
            <input className="w-full border rounded px-3 py-2" type="text" value={newDossier.objet} onChange={(e) => updateField('objet', e.target.value)} placeholder="Spécifiez l'objectif si pertinent" />
          </div>
        </div>

        {isRenouvellement && (
          <>
            <h4 className="text-sm font-semibold mt-6">Récépissés de déclaration</h4>
            <div className="grid grid-cols-1 gap-3 mt-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">ARN *</label>
                <textarea className="w-full border rounded px-3 py-2 mt-1" value={newDossier.arn} onChange={(e) => updateField('arn', e.target.value)} rows={2} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Récépissé FR *</label>
                <textarea className="w-full border rounded px-3 py-2 mt-1" value={newDossier.recuFr} onChange={(e) => updateField('recuFr', e.target.value)} rows={2} />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Récépissé MG *</label>
                <textarea className="w-full border rounded px-3 py-2 mt-1" value={newDossier.recuMg} onChange={(e) => updateField('recuMg', e.target.value)} rows={2} />
              </div>
            </div>
          </>
        )}

        {isDuplicataPur && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold">Document d'origine</h4>
            <div className="grid grid-cols-1 gap-3 mt-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">ARN *</label>
                <textarea className="w-full border rounded px-3 py-2 mt-1" value={newDossier.arn} onChange={(e) => updateField('arn', e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            type="submit"
            disabled={!!doublonMessage}
          >
            ➕ Ajouter le dossier
          </button>
        </div>
      </form>
    </div>
  );
};
