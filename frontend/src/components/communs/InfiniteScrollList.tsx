import React, { useEffect, useRef, useState, useCallback } from 'react';

interface InfiniteScrollListProps<T> {
  /** Fonction pour charger les données (doit retourner { data, pagination }) */
  fetchData: (page: number) => Promise<{ data: T[]; pagination: { totalPages: number } }>;
  /** Composant pour afficher chaque élément */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Message quand il n'y a pas de données */
  emptyMessage?: string;
  /** Taille de la page */
  pageSize?: number;
}

export function InfiniteScrollList<T>({
  fetchData,
  renderItem,
  emptyMessage = 'Aucune donnée à afficher',
  pageSize = 50,
}: InfiniteScrollListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchData(page);
      setItems((prev) => [...prev, ...result.data]);
      setHasMore(page < result.pagination.totalPages);
      setPage((p) => p + 1);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, fetchData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [loading, hasMore, loadMore]);

  // Premier chargement
  useEffect(() => {
    loadMore();
  }, []);

  if (items.length === 0 && !loading) {
    return (
      <div className="text-center py-12 text-slate-400">{emptyMessage}</div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => renderItem(item, index))}

      {/* Loader / Fin de liste */}
      <div ref={loaderRef} className="py-4 text-center">
        {loading && (
          <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
            Chargement...
          </div>
        )}
        {!loading && !hasMore && items.length > 0 && (
          <div className="text-sm text-slate-400 border-t border-slate-200 pt-4">
            — Fin de la liste —
          </div>
        )}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 rounded-lg p-2">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}