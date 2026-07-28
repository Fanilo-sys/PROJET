import { useState, useCallback } from 'react';

export function useExpandable() {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggle = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback((ids: number[]) => {
    setExpandedIds(new Set(ids));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const isExpanded = useCallback((id: number) => expandedIds.has(id), [expandedIds]);

  const allExpanded = (ids: number[]) =>
    ids.length > 0 && ids.every(id => expandedIds.has(id));

  return { expandedIds, toggle, expandAll, collapseAll, isExpanded, allExpanded };
}
