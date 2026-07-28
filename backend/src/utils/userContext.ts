import { Request } from 'express';
import { PoolClient } from 'pg';

/**
 * Propage l'identité de l'utilisateur authentifié vers la session PostgreSQL
 * via set_config, afin que le trigger d'audit puisse lire app.current_user_id
 * sur la même connexion que celle utilisée par la transaction.
 *
 * À appeler sur chaque client dédié (pool.connect()) avant toute opération
 * qui déclenche le trigger d'audit.
 */
export const setUserContextOnClient = async (
  client: PoolClient,
  req: Request
): Promise<void> => {
  const userId = (req as any).user?.id;
  // Toujours set la config : si userId est null/undefined, on passe ''
  // pour éviter une valeur périmée d'une connexion précédente.
  // Le trigger d'audit gère le cas où la chaîne est vide (v_user_id := NULL).
  await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [
    userId != null ? String(userId) : '',
  ]);
};
