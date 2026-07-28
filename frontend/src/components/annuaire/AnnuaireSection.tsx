// frontend/src/components/annuaire/AnnuaireSection.tsx
import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, Plus, FileText } from 'lucide-react';
import { SectionHeader } from '../communs/SectionHeader';
import { getGroupes, getAssociationsParGroupe } from '../../services/annuaireService';
import { AnnuaireGroup, AnnuaireEntry, DossierAPIResponse, Dossier, matchesSearchTerm } from '../../types';
import { AjoutManuelAnnuaire } from './AjoutManuelAnnuaire';
import { AnnuaireGroupCard } from './AnnuaireGroupCard';
import { SearchFilterBar } from '../communs/SearchFilterBar';

interface AnnuaireSectionProps {
  onRenouveler?: (association: AnnuaireEntry | Dossier) => void;
  onDuplicata?: (association: AnnuaireEntry | Dossier) => void;
  onEdit?: (association: AnnuaireEntry) => void;
  onDelete?: (id: number) => void;
  refreshKey?: number;
}

const adapter = (a: DossierAPIResponse) => ({
  id: a.id,
  numArrivee: a.num_chrono || '',
  nom: a.nom_association || '',
  siege: a.siege || '',
  district: a.district || '',
  president: a.president || '',
  dateArrivee: a.date_depot || '',
  heureArrivee: a.heure_depot ? a.heure_depot?.slice(0, 5) : '',
  type: a.type_dossier || 'Création',
  categorie: a.categorie || 'Autre',
  objet: a.objet || '',
  abreviation: a.abreviation || '',
  emplacement: a.emplacement || '',
  numeroSortie: a.numero_sortie || '',
  personneSortie: a.personne_sortie || '',
});

export const AnnuaireSection: React.FC<AnnuaireSectionProps> = ({
  onRenouveler, onDuplicata, onEdit, onDelete, refreshKey
}) => {
  const [groupes, setGroupes] = useState<AnnuaireGroup[]>([]);
  const [associations, setAssociations] = useState<Record<number, AnnuaireEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAjoutManuel, setShowAjoutManuel] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await getGroupes();
      setGroupes(data || []);
      const assosMap: Record<number, AnnuaireEntry[]> = {};
      for (const g of data || []) {
        try {
          const assos = await getAssociationsParGroupe(g.id);
          assosMap[g.id] = (assos || []).map(adapter);
        } catch {
          assosMap[g.id] = [];
        }
      }
      setAssociations(assosMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [refreshKey]);

  const filterAssociations = (liste: AnnuaireEntry[]) => {
    if (!searchTerm.trim() && !dateFrom && !dateTo) return liste;
    let result = liste;
    result = result.filter(a => matchesSearchTerm(a, searchTerm));
    if (dateFrom) result = result.filter(a => a.date_depot && a.date_depot >= dateFrom);
    if (dateTo) result = result.filter(a => a.date_depot && a.date_depot <= dateTo);
    return result;
  };

  const handleResetFilters = () => { setSearchTerm(''); setDateFrom(''); setDateTo(''); };

  const handleAjoutSuccess = () => {
    setShowAjoutManuel(false);
    loadAll();
  };

  const totalVisible = groupes.reduce((acc, g) => {
    const assos = filterAssociations(associations[g.id] || []);
    const show = !(searchTerm || dateFrom || dateTo) || assos.length > 0;
    return show ? acc + assos.length : acc;
  }, 0);

  return (
    <div className="space-y-6">
      {loading && <p className="text-slate-500 font-medium">Chargement…</p>}

      <SectionHeader
        icon={Building2}
        title="Annuaire des Associations"
        subtitle="Associations archivées et historisées"
        count={totalVisible}
        gradient="from-sky-500 to-cyan-500"
      >
        <button
          className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-sky-200/50 flex items-center gap-1.5"
          onClick={() => setShowAjoutManuel(!showAjoutManuel)}
        >
          <Plus size={14} /> {showAjoutManuel ? 'Fermer' : 'Ajouter'}
        </button>
        <button
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
          onClick={loadAll}
        >
          <RefreshCw size={13} /> Rafraîchir
        </button>
      </SectionHeader>

      {/* Ajout manuel */}
      {showAjoutManuel && (
        <AjoutManuelAnnuaire onSuccess={handleAjoutSuccess} onCancel={() => setShowAjoutManuel(false)} />
      )}

      {/* Barre de recherche/filtre */}
      <SearchFilterBar
        search={searchTerm}
        onChange={setSearchTerm}
        dateFrom={dateFrom}
        onChangeDateFrom={setDateFrom}
        dateTo={dateTo}
        onChangeDateTo={setDateTo}
        showReset={!!(searchTerm || dateFrom || dateTo)}
        onReset={handleResetFilters}
        placeholder="Rechercher par n°, nom, siège, président…"
      />

      {/* Contenu */}
      {groupes.length === 0 && !showAjoutManuel ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Building2 size={24} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">
            Aucune association archivée. Utilisez le <strong>Registre Chrono</strong> pour archiver des dossiers.
          </p>
        </div>
      ) : (
        groupes.map(g => {
          const assos = filterAssociations(associations[g.id] || []);
          if ((searchTerm || dateFrom || dateTo) && assos.length === 0) return null;
          return (
            <AnnuaireGroupCard
              key={g.id}
              group={{
                id: g.id,
                periode: g.periode,
                associations: assos,
              }}
              onRenouveler={onRenouveler}
              onDuplicata={onDuplicata}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssociationUpdated={loadAll}
            />
          );
        })
      )}
    </div>
  );
};
