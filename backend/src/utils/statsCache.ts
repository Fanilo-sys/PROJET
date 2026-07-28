import pool from '../config/db';

/**
 * Cache mémoire pour les statistiques du dashboard et les historiques.
 * Évite de lancer des requêtes SQL à chaque chargement.
 * Le cache est invalidé automatiquement quand les données sont modifiées.
 */

// ================================================================
// TYPES
// ================================================================

interface CacheEntry {
  data: any;
  timestamp: number;
}

// ================================================================
// CACHE GÉNÉRAL (statistiques)
// ================================================================

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 300_000; // 5 minutes

/**
 * Récupère une valeur du cache
 */
export function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Écrit une valeur dans le cache
 */
export function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Génère une clé de cache pour les stats
 */
export function statsCacheKey(annee?: string | null, mois?: string | null): string {
  return `stats:${annee || 'all'}:${mois || 'all'}`;
}

/**
 * Invalide tout le cache stats (appelé après création/modification/suppression)
 */
export const invalidateStatsCache = (): void => {
  for (const key of cache.keys()) {
    if (key.startsWith('stats:')) {
      cache.delete(key);
    }
  }
  // Rafraîchir la vue matérialisée en arrière-plan
  refreshDashboardStats().catch((err) => {
    console.error('❌ Erreur refresh dashboard_stats en arrière-plan :', err);
  });
};

/**
 * Rafraîchit la vue matérialisée dashboard_stats
 */
export const refreshDashboardStats = async (): Promise<void> => {
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats');
    console.log('🔄 Vue dashboard_stats rafraîchie');
  } catch (err) {
    console.error('❌ Erreur lors du rafraîchissement de dashboard_stats :', err);
    // Fallback : refresh sans CONCURRENTLY (plus risqué mais fonctionne)
    try {
      await pool.query('REFRESH MATERIALIZED VIEW dashboard_stats');
      console.log('🔄 Vue dashboard_stats rafraîchie (sans CONCURRENTLY)');
    } catch (fallbackErr) {
      console.error('❌ Échec du fallback :', fallbackErr);
    }
  }
};

/**
 * Récupère les statistiques depuis la vue matérialisée
 */
export const getStatsFromView = async (): Promise<any> => {
  try {
    const result = await pool.query(`
      SELECT 
        total,
        par_statut,
        par_categorie,
        par_categorie_detail,
        par_district,
        par_type_dossier,
        total_par_annee,
        pipeline,
        annuaire_par_categorie
      FROM dashboard_stats
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      throw new Error('La vue dashboard_stats est vide');
    }

    const row = result.rows[0];

    return {
      total: row.total || 0,
      parStatut: row.par_statut || [],
      parCategorie: row.par_categorie || [],
      parCategorieDetail: row.par_categorie_detail || [],
      parDistrict: row.par_district || [],
      parTypeDossier: row.par_type_dossier || [],
      totalParAnnee: row.total_par_annee || [],
      pipeline: buildPipelineFromJson(row.pipeline || {}),
      annuaireParCategorie: row.annuaire_par_categorie || [],
    };
  } catch (err) {
    console.error('❌ Erreur getStatsFromView :', err);
    throw err;
  }
};

// Nouvelle fonction pour construire pipeline à partir du JSON
const buildPipelineFromJson = (pipelineJson: any) => {
  return {
    reception: pipelineJson.reception || 0,
    en_attente: pipelineJson.en_attente || 0,
    en_cours: pipelineJson.en_cours || 0,
    livraison: pipelineJson.livraison || 0,
    defavorable: pipelineJson.defavorable || 0,
    registre_chrono: pipelineJson.registre_chrono || 0,
    historique_sortie: pipelineJson.historique_sortie || 0,
    duplicata: pipelineJson.duplicata || 0,
    defavorable_traite: pipelineJson.defavorable_traite || 0,
    archive_arrivee: pipelineJson.archive_arrivee || 0,
    annuaire: pipelineJson.annuaire || 0,
    historique_arrivee: pipelineJson.historique_arrivee || 0,
    historique_defavorable: pipelineJson.historique_defavorable || 0,
  };
};

/**
 * Construit l'objet pipeline à partir des données brutes
 */
const buildPipeline = (
  pipelineData: any[],
  receptionFav: number,
  annuaireTotal: number,
  histoArrivee: number,
  histoDefavorable: number
) => {
  const pipeMap: Record<string, number> = {};
  for (const row of pipelineData) {
    pipeMap[row.status] = parseInt(row.count);
  }

  const enAttente = pipeMap['en_attente'] || 0;
  const registreChrono =
    (pipeMap['registre_chrono'] || 0) +
    (pipeMap['archive_arrivee'] || 0) +
    (pipeMap['historique_sortie'] || 0) +
    (pipeMap['defavorable_traite'] || 0);

  return {
    reception: pipeMap['reception'] || 0,
    en_attente: enAttente + receptionFav,
    en_cours: pipeMap['en_cours'] || 0,
    livraison: pipeMap['livraison'] || 0,
    defavorable: pipeMap['defavorable'] || 0,
    registre_chrono: registreChrono,
    historique_sortie: pipeMap['historique_sortie'] || 0,
    duplicata: pipeMap['duplicata'] || 0,
    defavorable_traite: pipeMap['defavorable_traite'] || 0,
    archive_arrivee: pipeMap['archive_arrivee'] || 0,
    annuaire: annuaireTotal,
    historique_arrivee: histoArrivee,
    historique_defavorable: histoDefavorable,
  };
};

// ================================================================
// CACHE POUR LES HISTORIQUES (lecture seule)
// ================================================================

const historiqueCache = new Map<string, CacheEntry>();
const HISTO_TTL_MS = 300_000; // 5 minutes

// --- 1. Historique Arrivée ---

export const getCacheHistoriqueArrivee = (groupeId: number): any | null => {
  const key = `histo_arrivee_${groupeId}`;
  const entry = historiqueCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > HISTO_TTL_MS) {
    historiqueCache.delete(key);
    return null;
  }
  return entry.data;
};

export const setCacheHistoriqueArrivee = (groupeId: number, data: any): void => {
  const key = `histo_arrivee_${groupeId}`;
  historiqueCache.set(key, { data, timestamp: Date.now() });
};

export const invalidateCacheHistoriqueArrivee = (groupeId?: number): void => {
  if (groupeId) {
    historiqueCache.delete(`histo_arrivee_${groupeId}`);
  } else {
    for (const key of historiqueCache.keys()) {
      if (key.startsWith('histo_arrivee_')) {
        historiqueCache.delete(key);
      }
    }
  }
};

// --- 2. Historique Défavorable ---

export const getCacheHistoriqueDefavorable = (): any | null => {
  const key = 'histo_defavorable';
  const entry = historiqueCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > HISTO_TTL_MS) {
    historiqueCache.delete(key);
    return null;
  }
  return entry.data;
};

export const setCacheHistoriqueDefavorable = (data: any): void => {
  const key = 'histo_defavorable';
  historiqueCache.set(key, { data, timestamp: Date.now() });
};

export const invalidateCacheHistoriqueDefavorable = (): void => {
  historiqueCache.delete('histo_defavorable');
};

// --- 3. Historique Sortie ---

export const getCacheHistoriqueSortie = (): any | null => {
  const key = 'histo_sortie';
  const entry = historiqueCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > HISTO_TTL_MS) {
    historiqueCache.delete(key);
    return null;
  }
  return entry.data;
};

export const setCacheHistoriqueSortie = (data: any): void => {
  const key = 'histo_sortie';
  historiqueCache.set(key, { data, timestamp: Date.now() });
};

export const invalidateCacheHistoriqueSortie = (): void => {
  historiqueCache.delete('histo_sortie');
};

// --- 4. Invalidation globale des historiques ---

export const invalidateAllHistoriquesCache = (): void => {
  for (const key of historiqueCache.keys()) {
    if (
      key.startsWith('histo_arrivee_') ||
      key === 'histo_defavorable' ||
      key === 'histo_sortie'
    ) {
      historiqueCache.delete(key);
    }
  }
  console.log('🧹 Cache des historiques invalidé');
};