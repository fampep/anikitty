import { useCallback, useState } from "react";

export function useBulkSelect() {
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const enterEdit = useCallback(() => {
    setEditMode(true);
    setSelected(new Set());
  }, []);

  const exitEdit = useCallback(() => {
    setEditMode(false);
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    editMode,
    selected,
    selectedCount: selected.size,
    toggle,
    selectAll,
    clearSelection,
    enterEdit,
    exitEdit,
    isSelected,
  };
}
