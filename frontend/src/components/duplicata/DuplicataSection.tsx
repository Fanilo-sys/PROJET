import React, { useState, useEffect, useMemo } from 'react';
import { createDuplicata, getDuplicatas, approuverDuplicata } from '../../services/dossierService';
import { CategorieSelect } from '../communs/CategorieSelect';
import { SearchFilterBar } from '../communs/SearchFilterBar';
import { DossierAPIResponse, FormDossier, SousTypeDossier, TypeDossier, getEffectiveType, parseCategories, joinCategories, matchesSearchTerm } from '../../types';
import { Copy, FileText, Plus } from 'lucide-react';

interface FormState {
  numArrivee: string;
  nom: string;
  siege: string;
  district: string;
  president: string;
  type: string;
  sous_type: string;
  dateArrivee: string;
  heureArrivee: string;
  categorie: string;
  categorieTemp: string;
  arn: string;
  recuFr: string;
  recuMg: string;
  objet: string;
  numeroSortie: string;
}

const FORM_INITIAL: FormState = {
  numArrivee: '',
  nom: '',
  siege: '',
  district: '',
  president: '',
  type: 'Création',
  sous_type: '',
  dateArrivee: new Date().toISOString().split('T')[0],
  heureArrivee: new Date().toTimeString().slice(0, 5),
  categorie: 'Autre',
  categorieTemp: '',
  arn: '',
  recuFr: '',
  recuMg: '',
  objet: '',
  numeroSortie: '',
};

const formatSiegeDuplicata = (d: DossierAPIResponse) => {
  const lines = (d.siege || '').split('\n');
  const full = lines.join(' · ') + (d.district ? ` — ${d.district}` : '');
  return <span title={full}>{lines[0]}{lines.length > 1 ? '…' : ''}{d.district ? ` — ${d.district}` : ''}</span>;
};

interface DuplicataSectionProps {
  prefillData?: FormDossier | null;
  onPrefillConsumed?: () => void;
}

export const DuplicataSection: React.FC<DuplicataSectionProps> = ({ prefillData, onPrefillConsumed }) => {
  const [duplicatas, setDuplicatas] = useState<DossierAPIResponse[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>({ ...FORM_INITIAL });
  const [lignesAssoc, setLignesAssoc] = useState('');

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Catégories multiples
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState<string>('');

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCategoriesChange = (selected: string[], custom: string) => {
    setSelectedCategories(selected);
    setCustomCategory(custom);
  };

  // Recevoir des données depuis l'extérieur
  useEffect(() => {
    if (prefillData) {
      const data = prefillData;
      setForm({
        numArrivee: data.numArrivee || '',
        nom: data.nom || '',
        siege: data.siege || '',
        district: data.district || '',
        president: data.president || '',
        type: data.type || 'Création',
        sous_type: (data.sous_type || '') as string,
        dateArrivee: new Date().toISOString().split('T')[0],
        heureArrivee: new Date().toTimeString().slice(0, 5),
        categorie: data.categorie || 'Autre',
        categorieTemp: '',
        arn: data.arn || '',
        recuFr: data.recuFr || '',
        recuMg: data.recuMg || '',
        objet: data.objet || '',
        numeroSortie: '',
      });
      setLignesAssoc(data.abreviation || '');
      setShowModal(true);
      if (onPrefillConsumed) onPrefillConsumed();
    }
  }, [prefillData, onPrefillConsumed]);

  const handleAdd = async () => {
    if (!form.numArrivee.trim() || !form.nom.trim()) return;
    const cat = form.categorie === 'Autre' && form.categorieTemp.trim() ? form.categorieTemp.trim() : form.categorie;
    await createDuplicata({
      num_chrono: form.numArrivee,
      nom_association: form.nom,
      siege: form.siege,
      district: form.district,
      president: form.president,
      type_dossier: form.type as TypeDossier,
      categorie: cat,
      arn: form.arn,
      recu_fr: form.recuFr,
      recu_mg: form.recuMg,
      heure_depot: form.heureArrivee,
      objet: form.objet,
      abreviation: lignesAssoc,
      numero_sortie: form.numeroSortie,
    });
    setForm({ ...FORM_INITIAL });
    setLignesAssoc('');
    setShowModal(false);
    chargerDuplicatas();
  };

  const chargerDuplicatas = async () => {
    try {
      const data = await getDuplicatas();
      setDuplicatas(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { chargerDuplicatas(); }, []);

  const handleApprouver = async (id: number) => {
    await approuverDuplicata(id);
    chargerDuplicatas();
  };

  const duplicatasFiltres = useMemo(() => {
    let result = duplicatas;
    result = result.filter(d => matchesSearchTerm(d as any, search));
    if (dateFrom) result = result.filter(d => d.date_depot && d.date_depot >= dateFrom);
    if (dateTo) result = result.filter(d => d.date_depot && d.date_depot <= dateTo);
    return result;
  }, [duplicatas, search, dateFrom, dateTo]);

  const handleResetFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };

  const effectiveType = getEffectiveType(form.type as TypeDossier, form.sous_type as SousTypeDossier);
  const isRenouv = effectiveType === 'renouvellement';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <Copy size={22} className="text-purple-600" />
          <span>Duplicata</span>
          <span className="inline-flex items-center bg-purple-100 text-purple-800 text-sm font-semibold px-2 py-0.5 rounded">{duplicatasFiltres.length}</span>
        </h2>
        <button
          className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-200/50 flex items-center gap-1.5"
          onClick={() => { setForm({ ...FORM_INITIAL }); setShowModal(true); }}
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {/* Barre de recherche */}
      <SearchFilterBar
        search={search}
        onChange={setSearch}
        dateFrom={dateFrom}
        onChangeDateFrom={setDateFrom}
        dateTo={dateTo}
        onChangeDateTo={setDateTo}
        showReset={!!(search || dateFrom || dateTo)}
        onReset={handleResetFilters}
        placeholder="Rechercher par n°, nom, N° sortie…"
      />

      {/* Tableau */}
      {duplicatasFiltres.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">Aucun duplicata en attente.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="table-scroll">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-600 text-white text-[10px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="p-4 text-left">N°</th>
                  <th className="p-4 text-left">Arrivée</th>
                  <th className="p-4 text-left">Association</th>
                  <th className="p-4 text-left">Siège</th>
                  <th className="p-4 text-left">Président</th>
                  <th className="p-4 text-left">Catégorie</th>
                  <th className="p-4 text-left">Type</th>
                  <th className="p-4 text-left">N° Sortie</th>
                  <th className="p-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {duplicatasFiltres.map(d => (
                  <tr key={d.id} className="hover:bg-purple-50/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-700">{d.num_chrono}</td>
                    <td className="p-4 text-slate-600">
                      {d.date_depot ? new Date(d.date_depot).toLocaleDateString('fr-FR') : '—'}
                      {d.heure_depot && <div className="text-xs text-slate-400">{d.heure_depot}</div>}
                    </td>
                    <td className="p-4">
                      <span className="cell-truncate font-semibold text-slate-800" title={d.nom_association}>{d.nom_association}</span>
                    </td>
                    <td className="p-4 text-slate-600">{formatSiegeDuplicata(d)}</td>
                    <td className="p-4 cell-president" title={d.president}>{d.president || '—'}</td>
                    <td className="p-4 text-slate-600">{d.categorie}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        d.type_dossier === 'Renouvellement' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {d.type_dossier === 'Renouvellement' ? 'Renouv' : 'Créat'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{d.numero_sortie || '—'}</td>
                    <td className="p-4">
                      <button
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-md shadow-green-200/50 flex items-center gap-1.5"
                        onClick={() => handleApprouver(d.id)}
                      >
                        <Copy size={12} /> Approuver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal d'ajout de duplicata */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl shadow-purple-500/10 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-500 px-6 py-5 overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white" />
                <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full bg-white" />
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Copy size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Nouveau duplicata</h3>
                    <p className="text-xs text-purple-200">Créez une copie d'un dossier existant</p>
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur" onClick={() => setShowModal(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">N° Arrivée *</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.numArrivee} onChange={e => update('numArrivee', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date *</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" type='date' value={form.dateArrivee} onChange={e => update('dateArrivee', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Heure *</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" type='time' value={form.heureArrivee} onChange={e => update('heureArrivee', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.type} onChange={e => { update('type', e.target.value); if (e.target.value !== 'Duplicata' && e.target.value !== 'Arrêté') update('sous_type', ''); }}>
                    <option value='Création'>Création</option>
                    <option value='Renouvellement'>Renouvellement</option>
                    <option value='Duplicata'>Duplicata</option>
                    <option value='Arrêté'>Arrêté</option>
                  </select>
                </div>
                {/* Sous-type — visible uniquement pour Duplicata et Arrêté */}
                {(form.type === 'Duplicata' || form.type === 'Arrêté') && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {form.type === 'Duplicata' ? 'Type de duplicata' : "Type d'arrêté"}
                    </label>
                    <select className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.sous_type} onChange={e => update('sous_type', e.target.value)}>
                      <option value="">Sélectionnez…</option>
                      {form.type === 'Duplicata' ? (
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
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Association *</label>
                <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.nom} onChange={e => update('nom', e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Abréviation</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={lignesAssoc} onChange={e => setLignesAssoc(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catégorie</label>
                  <div className="mt-1.5"><CategorieSelect selected={selectedCategories} custom={customCategory} onChange={handleCategoriesChange} /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Président(e)</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.president} onChange={e => update('president', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">N° Sortie</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.numeroSortie} onChange={e => update('numeroSortie', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Siège</label>
                <textarea className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.siege} onChange={e => update('siege', e.target.value)} rows={3} />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objectif</label>
                <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.objet} onChange={e => update('objet', e.target.value)} />
              </div>

              {isRenouv && (
                <>
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Récépissés</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ARN</label>
                      <textarea className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.arn} onChange={e => update('arn', e.target.value)} rows={2} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Récépissé FR</label>
                      <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.recuFr} onChange={e => update('recuFr', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Récépissé MG</label>
                      <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 mt-1.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 outline-none transition-all" value={form.recuMg} onChange={e => update('recuMg', e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button
                  className="bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-200 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAdd}
                  disabled={!form.numArrivee.trim() || !form.nom.trim()}
                >
                  <Copy size={15} /> Ajouter le duplicata
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
