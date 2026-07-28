import { PoolClient } from 'pg';

/**
 * Synchronise les catégories d'un dossier :
 * - Insère les catégories si elles n'existent pas.
 * - Lie le dossier aux catégories via la table pivot.
 */
export const syncCategories = async (client: PoolClient, dossierId: number, categorieCsv: string) => {
  if (!categorieCsv || categorieCsv.trim() === '') return;

  const catNames = categorieCsv.split(',').map(c => c.trim()).filter(Boolean);
  if (catNames.length === 0) return;

  for (const name of catNames) {
    await client.query(
      `INSERT INTO categories (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING`,
      [name]
    );
  }

  await client.query(
    `INSERT INTO dossier_categories (dossier_id, categorie_id)
     SELECT $1, id FROM categories WHERE nom = ANY($2::varchar[])
     ON CONFLICT DO NOTHING`,
    [dossierId, catNames]
  );
};