import { useState, useEffect, useCallback } from 'react';
import { Dossier, createDossier } from '../types';
import { getDossiers } from '../services/dossierService';

interface UseDossiersReturn {
  dossiers: Dossier[];
  loading: boolean;
  error: string | null;
  fetchDossiers: () => Promise<void>;
}

export function useDossiers(isAuthenticated: boolean): UseDossiersReturn {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  const fetchDossiers = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await getDossiers();
      const dossiersAdaptes = data.map((item: any) => {
  const dateStr = item.date_depot || '';
  const dateDepot = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return createDossier({
    id: item.id,
    num_chrono: item.num_chrono || '',
    nom_association: item.nom_association || '',
    siege: item.siege || '',
    district: item.district || '',
    president: item.president || '',
    abreviation: item.abreviation || '',
    type_dossier: item.type_dossier || 'Création',
    sous_type: item.sous_type || '',
    objet: item.objet || '',
    date_depot: dateDepot,
    heure_depot: item.heure_depot || '',
    status: item.status || 'reception',
    verdict: item.verdict || 'aucun',
    emplacement: item.emplacement || '',
    arn: item.arn || '',
    recu_fr: item.recu_fr || '',
    recu_mg: item.recu_mg || '',
    association_id: item.association_id,
    categorie: item.categorie || 'Autre',
  });
});
      dossiersAdaptes.sort((a: Dossier, b: Dossier) => a.id - b.id);
      setDossiers(dossiersAdaptes);
      setError(null);
    } catch (err) {
      setError('Impossible de charger les dossiers.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  return { dossiers, loading, error, fetchDossiers };
}
